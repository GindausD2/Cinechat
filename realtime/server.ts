import "dotenv/config";
import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { z, ZodError } from "zod";
import { db } from "../src/lib/db";
import { redisConnection, rateLimit, RateLimitError } from "../src/lib/redis";
import { AppError, hashToken, ageAt } from "../src/lib/security";
import { verifyRealtimeTicket } from "../src/lib/realtime-auth";
import { joinRoom, roomAccess, roomSnapshot } from "../src/lib/rooms";
import { playableSource } from "../src/lib/media";
import { playbackSnapshot } from "../src/lib/playback";
import { controlPlayback, sendMessage, sendReaction, deleteMessage } from "../src/lib/live";
import type { RoomEvent } from "../src/lib/events";
import { sendDueReminders } from "../src/lib/reminders";
import { authorizeAudience } from "../src/lib/realtime-audience";
import { touchPresence, removePresence, presenceSnapshot } from "../src/lib/presence";
import { startDueScreenings, finishDueScreenings } from "../src/lib/screenings";
import { RoomDeliveryQueue } from "../src/lib/room-delivery-queue";
import { privacyMaintenanceTick } from "../src/lib/privacy-maintenance";
import { renewMemberships } from "../src/lib/seat-renewal";

const origin = new URL(process.env.APP_ORIGIN || "http://localhost:3000").origin;
const redis = redisConnection(), publisher = redis.duplicate(), adapterSubscriber = redis.duplicate(), subscriber = redis.duplicate();
const http = createServer(async (req, res) => {
  if (req.url !== "/health") { res.writeHead(404); res.end(); return; }
  try { await Promise.all([db.$queryRaw`SELECT 1`, redis.ping()]); res.writeHead(200, { "Content-Type": "application/json" }); res.end('{"status":"ok","service":"cinechat-realtime"}'); }
  catch { res.writeHead(503); res.end('{"status":"unavailable"}'); }
});
const io = new Server(http, { cors: { origin, credentials: true }, allowRequest: (req, cb) => cb(null, req.headers.origin === origin), maxHttpBufferSize: 8192, transports: ["websocket"], pingTimeout: 20000, pingInterval: 15000 });
io.adapter(createAdapter(publisher, adapterSubscriber));
type Ack = (response: { ok: boolean; data?: unknown; error?: string; status?: number }) => void;
const connection = (socket: Socket, roomId: string) => ({ roomId, userId: socket.data.userId as string, socketId: socket.id });
function presenceForRoom(presence: Awaited<ReturnType<typeof presenceSnapshot>>, visibility: string) {
  return visibility === "PUBLIC" ? { count: presence.count, ids: [] } : presence;
}
async function broadcastPresence(roomId: string) {
  const [presence, room] = await Promise.all([presenceSnapshot(roomId), db.cinemaRoom.findUnique({ where: { id: roomId }, select: { visibility: true } })]);
  if (!room) return;
  if (room.visibility === "PUBLIC") { io.to(`room:${roomId}`).emit("presence", presenceForRoom(presence, "PUBLIC")); return; }
  // A socket may remain subscribed briefly after revocation or expiry. Private
  // presence is personal room data too: never broadcast it to a stale grant.
  const sockets = localSockets(roomId);
  if (!sockets.length) return;
  const { authorized } = await authorizeAudience(roomId, audience(sockets));
  for (const socket of sockets) if (authorized.has(socket.id) && socket.data.roomId === roomId && canDeliver(socket)) socket.emit("presence", presence);
}
async function socketIdentity(socket: Socket) {
  const ticket = await db.realtimeTicket.findUnique({ where: { tokenHash: socket.data.ticketHash as string }, include: { user: { include: { profile: true } } } });
  if (!ticket || ticket.expiresAt <= new Date() || ticket.user.suspended || ticket.authVersion !== ticket.user.authVersion) throw new AppError(401, "Session expired. Please sign in again.");
  return { user: ticket.user, region: ticket.region };
}
async function authorizedRoom(socket: Socket) {
  const roomId = socket.data.roomId as string | undefined;
  if (!roomId) throw new AppError(403, "Join a cinema first.");
  const { user, region } = await socketIdentity(socket), { room } = await roomAccess(roomId, user.id);
  playableSource(room.movie, region, ageAt(user.profile?.birthDate || null));
  return { user, room, roomId, region };
}
async function sendState(socket: Socket, roomId: string) {
  const { user, region } = await socketIdentity(socket), state = await roomSnapshot(roomId, user, region);
  if (socket.connected && socket.data.roomId === roomId) socket.emit("state", state);
}
async function removeFromRoom(socket: Socket, roomId: string, reason: string) {
  socket.emit("removed", { reason }); await socket.leave(`room:${roomId}`);
  if (socket.data.roomId === roomId) socket.data.roomId = undefined;
  await removePresence(connection(socket, roomId));
}
function localSockets(roomId: string) { return [...io.of("/").sockets.values()].filter(s => s.data.roomId === roomId); }
function audience(sockets: Socket[]) { return sockets.map(s => ({ id: s.id, userId: s.data.userId as string, ticketHash: s.data.ticketHash as string })); }
const pendingTransport = new WeakMap<Socket, { packets: number; bytes: number }>();
function packetBytes(packet: { data?: unknown }) { return typeof packet.data === "string" ? Buffer.byteLength(packet.data) : Buffer.isBuffer(packet.data) ? packet.data.length : 0; }
function canDeliver(socket: Socket) {
  const pending = pendingTransport.get(socket);
  if (!pending || (pending.packets < 128 && pending.bytes < 1048576)) return true;
  // Reconnecting clients recover authoritative state/history, rather than
  // accumulating an unlimited transport queue for a slow connection.
  socket.conn.close(true); return false;
}

io.use(async (socket, next) => {
  try {
    const ticket = z.string().min(60).max(150).parse(socket.handshake.auth.ticket);
    if (!verifyRealtimeTicket(ticket)) throw new Error("Invalid signature");
    socket.data.ticketHash = hashToken(ticket); const { user } = await socketIdentity(socket); socket.data.userId = user.id;
    await rateLimit(`ws-connect:${user.id}`, 30, 60); next();
  } catch { next(new Error("Unauthorized real-time connection.")); }
});
io.on("connection", socket => {
  let inFlight = 0;
  const pending = { packets: 0, bytes: 0 }; pendingTransport.set(socket, pending);
  // Public Engine.IO events expose queue pressure without relying on private
  // transport fields. Flush removes packets once handed to the writable socket.
  socket.conn.on("packetCreate", (packet: { data?: unknown }) => { pending.packets++; pending.bytes += packetBytes(packet); canDeliver(socket); });
  socket.conn.on("flush", (packets: { data?: unknown }[]) => { pending.packets = Math.max(0, pending.packets - packets.length); pending.bytes = Math.max(0, pending.bytes - packets.reduce((sum, packet) => sum + packetBytes(packet), 0)); });
  function handle(name: string, action: (raw: unknown) => Promise<unknown>) {
    socket.on(name, async (raw: unknown, ack?: Ack) => {
      if (inFlight >= 8) { if (typeof ack === "function") ack({ ok: false, status: 429, error: "Too many pending cinema events. Try again shortly." }); return; }
      inFlight++;
      try { const data = await action(raw); if (typeof ack === "function") ack({ ok: true, data }); }
      catch (error) {
        const status = error instanceof AppError ? error.status : error instanceof RateLimitError ? 429 : error instanceof ZodError ? 400 : 503;
        const message = error instanceof AppError || error instanceof RateLimitError ? error.message : error instanceof ZodError ? error.issues[0]?.message : "Synchronization is temporarily unavailable. Try again shortly.";
        if (typeof ack === "function") ack({ ok: false, status, error: message }); else socket.emit("notice", { error: message });
        if (status === 401) socket.disconnect(true);
      } finally { inFlight--; }
    });
  }
  handle("join", async raw => {
    const { roomId } = z.object({ roomId: z.string().min(1).max(100) }).parse(raw);
    const { user, region } = await socketIdentity(socket); await rateLimit(`ws-join:${user.id}`, 30, 60);
    // Public reconnects reserve capacity again after lease expiry. Private
    // memberships must first be activated by the invitation/join API; keep its
    // existing private snapshot authorization and non-disclosure responses.
    const theater = await db.cinemaRoom.findUnique({ where: { id: roomId }, select: { visibility: true } });
    if (theater?.visibility === "PUBLIC") await joinRoom(roomId, user, undefined, undefined, region);
    const state = await roomSnapshot(roomId, user, region);
    if (socket.data.roomId) { const old = socket.data.roomId as string; await removePresence(connection(socket, old)); await socket.leave(`room:${old}`); await broadcastPresence(old); }
    socket.data.roomId = roomId; await socket.join(`room:${roomId}`); await touchPresence([connection(socket, roomId)]);
    socket.emit("state", state); await broadcastPresence(roomId); return { joined: true };
  });
  handle("sync", async () => {
    const { room, roomId } = await authorizedRoom(socket); await rateLimit(`sync:${socket.data.userId}`, 30, 60); await touchPresence([connection(socket, roomId)]);
    const state = playbackSnapshot(room, room.movie.durationSeconds); socket.emit("playback", state); socket.emit("presence", presenceForRoom(await presenceSnapshot(roomId), room.visibility)); return state;
  });
  // Clock replies contain no room data. Fresh batched authorization runs every
  // ten seconds; mutations and explicit sync always recheck permissions directly.
  handle("clock", async () => {
    if (!socket.data.roomId) throw new AppError(403, "Join a cinema first.");
    await rateLimit(`clock:${socket.data.userId}`, 30, 60); return { serverTime: Date.now() };
  });
  handle("playback", async raw => { const { user, roomId } = await authorizedRoom(socket); return controlPlayback(roomId, user.id, raw); });
  handle("message", async raw => { const { user, roomId } = await authorizedRoom(socket); return sendMessage(roomId, user.id, raw); });
  handle("message-delete", async raw => { const { user, roomId } = await authorizedRoom(socket); return deleteMessage(roomId, user.id, raw); });
  handle("reaction", async raw => { const { user, roomId } = await authorizedRoom(socket); return sendReaction(roomId, user.id, raw); });
  socket.on("disconnect", () => {
    const roomId = socket.data.roomId as string | undefined;
    if (roomId) void removePresence(connection(socket, roomId)).then(() => broadcastPresence(roomId)).catch(() => {});
  });
});
const delivery = new RoomDeliveryQueue(async event => {
    const sockets = localSockets(event.roomId);
    if (!sockets.length) return;
    if (event.type === "ended") { await Promise.all(sockets.map(s => removeFromRoom(s, event.roomId, "This screening has ended."))); await broadcastPresence(event.roomId); return; }
    const data = event.data as { id?: string; userId?: string; messageId?: string } | undefined;
    const authorization = await authorizeAudience(event.roomId, audience(sockets), data?.userId).catch(async error => {
      if (!(error instanceof AppError) || error.status !== 404) throw error;
      await Promise.all(sockets.map(socket => removeFromRoom(socket, event.roomId, "This screening has ended.")));
      await broadcastPresence(event.roomId); return null;
    });
    if (!authorization) return;
    const { room, authorized, blocked, expiredSeats } = authorization;
    // Do not resurrect a deleted message when publications from separate
    // workers race, or when a delayed notification follows a history refresh.
    if (event.type === "message" && (room.visibility !== "PRIVATE" || !data?.id || !await db.chatMessage.findFirst({ where: { id: data.id, roomId: event.roomId, deleted: false }, select: { id: true } }))) return;
    const changedPresence = sockets.some(s => !authorized.has(s.id) || (event.type === "removed" && event.userId === s.data.userId));
    await Promise.all(sockets.map(async socket => {
      if (socket.data.roomId !== event.roomId) return;
      if (expiredSeats.has(socket.id)) { socket.conn.close(true); return; }
      if (!authorized.has(socket.id) || (event.type === "removed" && event.userId === socket.data.userId)) { await removeFromRoom(socket, event.roomId, "Membership or invitation access changed. Ask the host for a valid invitation."); return; }
      if (!canDeliver(socket)) return;
      if (room.visibility === "PUBLIC" && (event.type === "message" || event.type === "message-delete" || (event.type === "reaction" && data?.messageId))) return;
      if (event.type === "refresh" || event.type === "removed") {
        if (room.visibility === "PRIVATE") await sendState(socket, event.roomId);
        else { socket.emit("playback", playbackSnapshot(room, room.movie.durationSeconds)); socket.emit("participants-changed"); }
      } else if (event.type === "message-delete" || !blocked.has(socket.id)) {
        const payload = room.visibility === "PUBLIC" && event.type === "reaction" ? { id: data?.id, emoji: (event.data as { emoji: string }).emoji, messageId: null } : event.data;
        socket.emit(event.type, payload);
      }
    }));
    if (changedPresence) await broadcastPresence(event.roomId);
}, roomId => {
  // A transport close (unlike server namespace disconnect) enables Socket.IO's
  // normal reconnect/join path, which rechecks grants and loads private history.
  for (const socket of localSockets(roomId)) socket.conn.close(true);
});
subscriber.on("message", (_channel, text) => {
  if (text.length > 16384) return;
  try {
    const event = z.object({ roomId: z.string().min(1).max(100), type: z.enum(["refresh", "playback", "message", "message-delete", "reaction", "removed", "ended"]), data: z.unknown().optional(), userId: z.string().optional() }).parse(JSON.parse(text));
    delivery.enqueue(event as RoomEvent);
  } catch { console.error("Invalid room notification rejected."); }
});
subscriber.on("ready", () => {
  // Pub/Sub is ephemeral. Recover private history/deletions and playback from
  // PostgreSQL after a subscriber outage instead of relying on missed events.
  const rooms = new Set([...io.of("/").sockets.values()].map(socket => socket.data.roomId as string | undefined));
  for (const roomId of rooms) if (roomId) delivery.enqueue({ roomId, type: "refresh" });
});
await subscriber.subscribe("cinechat:rooms");
let heartbeatRunning = false;
const heartbeat = setInterval(() => {
  if (heartbeatRunning) return; heartbeatRunning = true;
  void (async () => {
    const rooms = new Set([...io.of("/").sockets.values()].map(s => s.data.roomId as string | undefined).filter(Boolean));
    const pendingRooms = [...rooms];
    for (let offset = 0; offset < pendingRooms.length; offset += 4) await Promise.all(pendingRooms.slice(offset, offset + 4).map(async roomId => {
      if (!roomId) return; const sockets = localSockets(roomId);
      try {
        const { room, authorized, expiredSeats } = await authorizeAudience(roomId, audience(sockets));
        const valid = sockets.filter(s => authorized.has(s.id));
        const renewed = await renewMemberships(room, [...new Set(valid.map(s => s.data.userId as string))]);
        await touchPresence(valid.filter(s => renewed.has(s.data.userId as string)).map(s => connection(s, roomId)));
        const presence = await presenceSnapshot(roomId), state = playbackSnapshot(room, room.movie.durationSeconds);
        for (const socket of sockets) {
          if (socket.data.roomId !== roomId) continue;
          if (expiredSeats.has(socket.id) || (authorized.has(socket.id) && !renewed.has(socket.data.userId as string))) { socket.conn.close(true); continue; }
          if (!authorized.has(socket.id)) await removeFromRoom(socket, roomId, "Session, membership, invitation, or media authorization changed.");
          else if (canDeliver(socket)) { socket.emit("playback", state); socket.emit("presence", presenceForRoom(presence, room.visibility)); }
        }
      } catch (error) {
        if (error instanceof AppError && error.status === 404) await Promise.all(sockets.map(s => removeFromRoom(s, roomId, "This screening has ended.")));
        // On infrastructure failure no private data/events are delivered. Keep
        // connections so the next healthy tick can recover from PostgreSQL.
      }
    }));
  })().finally(() => { heartbeatRunning = false; });
}, 10000);
const privacyCleanup = setInterval(() => { void privacyMaintenanceTick().catch(() => console.error("Privacy maintenance failed; the next tick will retry.")); }, 60000);
const reminders = setInterval(() => { void sendDueReminders().catch(() => console.error("Screening reminder delivery failed.")); }, 60000);
let startingScreenings = false;
const premieres = setInterval(() => {
  if (startingScreenings) return; startingScreenings = true;
  void startDueScreenings().then(() => finishDueScreenings()).catch(() => console.error("Premiere scheduling will retry.")).finally(() => { startingScreenings = false; });
}, 2000);
http.listen(Number(process.env.WS_PORT || 3001), "0.0.0.0", () => console.log("CineChat real-time service ready."));
let stopping = false;
async function shutdown() {
  if (stopping) return; stopping = true; clearInterval(heartbeat); clearInterval(reminders); clearInterval(privacyCleanup); clearInterval(premieres);
  await io.close(); await Promise.allSettled([subscriber.quit(), publisher.quit(), adapterSubscriber.quit(), redis.quit()]); await db.$disconnect(); process.exit(0);
}
process.on("SIGTERM", () => { void shutdown(); }); process.on("SIGINT", () => { void shutdown(); });
