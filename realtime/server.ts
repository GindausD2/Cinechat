import "dotenv/config";
import { createServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { z, ZodError } from "zod";
import { db } from "../src/lib/db";
import { redisConnection, rateLimit, RateLimitError } from "../src/lib/redis";
import { AppError, hashToken, ageAt, regionForRequest } from "../src/lib/security";
import { verifyRealtimeTicket } from "../src/lib/realtime-auth";
import { roomAccess, roomSnapshot } from "../src/lib/rooms";
import { playableSource } from "../src/lib/media";
import { playbackSnapshot } from "../src/lib/playback";
import { controlPlayback, sendMessage, sendReaction } from "../src/lib/live";
import type { RoomEvent } from "../src/lib/events";
import { sendDueReminders } from "../src/lib/reminders";

const origin = new URL(process.env.APP_ORIGIN || "http://localhost:3000").origin;
const redis = redisConnection();
const http = createServer(async (req, res) => {
  if (req.url !== "/health") { res.writeHead(404); res.end(); return; }
  try { await db.$queryRaw`SELECT 1`; await redis.ping(); res.writeHead(200, { "Content-Type": "application/json" }); res.end('{"status":"ok","service":"cinechat-realtime"}'); }
  catch { res.writeHead(503); res.end('{"status":"unavailable"}'); }
});
const io = new Server(http, { cors: { origin, credentials: true }, allowRequest: (req, cb) => cb(null, req.headers.origin === origin), maxHttpBufferSize: 8192, transports: ["websocket"], pingTimeout: 20000, pingInterval: 15000 });
io.adapter(createAdapter(redis.duplicate(), redis.duplicate()));
const subscriber = redis.duplicate();
type Ack = (response: { ok: boolean; data?: unknown; error?: string; status?: number }) => void;

async function socketUser(socket: Socket) {
  const ticket = await db.realtimeTicket.findUnique({ where: { tokenHash: socket.data.ticketHash as string }, include: { user: { include: { profile: true, subscription: true } } } });
  if (!ticket || ticket.expiresAt <= new Date() || ticket.user.suspended || ticket.authVersion !== ticket.user.authVersion) throw new AppError(401, "Session expired. Please sign in again.");
  return ticket.user;
}
async function presence(socket: Socket, roomId: string) {
  await redis.sadd(`cinechat:sockets:${roomId}:${socket.data.userId}`, socket.id);
  await redis.expire(`cinechat:sockets:${roomId}:${socket.data.userId}`, 60);
  await redis.zadd(`cinechat:presence:${roomId}`, Date.now(), socket.data.userId as string);
  await redis.expire(`cinechat:presence:${roomId}`, 120);
  await db.roomMembership.updateMany({ where: { roomId, userId: socket.data.userId as string, status: "ACTIVE" }, data: { lastSeenAt: new Date() } });
}
async function removePresence(socket: Socket, roomId: string) {
  const key = `cinechat:sockets:${roomId}:${socket.data.userId}`;
  await redis.srem(key, socket.id);
  if (!await redis.scard(key)) await redis.zrem(`cinechat:presence:${roomId}`, socket.data.userId as string);
}
async function sendState(socket: Socket, roomId: string) { const user = await socketUser(socket); socket.emit("state", await roomSnapshot(roomId, user)); }
async function authorizedRoom(socket: Socket) {
  const roomId = socket.data.roomId as string | undefined;
  if (!roomId) throw new AppError(403, "Join a cinema first.");
  const user = await socketUser(socket); const { room } = await roomAccess(roomId, user.id);
  playableSource(room.movie, regionForRequest(), ageAt(user.profile?.birthDate || null));
  return { user, room, roomId };
}
io.use(async (socket, next) => {
  try {
    const ticket = z.string().min(60).max(150).parse(socket.handshake.auth.ticket);
    if (!verifyRealtimeTicket(ticket)) throw new Error("Invalid signature");
    socket.data.ticketHash = hashToken(ticket); const user = await socketUser(socket); socket.data.userId = user.id;
    await rateLimit(`ws-connect:${user.id}`, 30, 60); next();
  } catch { next(new Error("Unauthorized real-time connection.")); }
});
io.on("connection", socket => {
  function handle(name: string, action: (raw: unknown) => Promise<unknown>) {
    socket.on(name, async (raw: unknown, ack?: Ack) => {
      try { const data = await action(raw); if (typeof ack === "function") ack({ ok: true, data }); }
      catch (error) {
        const status = error instanceof AppError ? error.status : error instanceof RateLimitError ? 429 : 400;
        const message = error instanceof AppError || error instanceof RateLimitError ? error.message : error instanceof ZodError ? error.issues[0]?.message : "Unable to complete this action.";
        if (typeof ack === "function") ack({ ok: false, status, error: message });
        else socket.emit("notice", { error: message });
        if (status === 401) socket.disconnect(true);
      }
    });
  }
  handle("join", async raw => {
    const { roomId } = z.object({ roomId: z.string().min(1).max(100) }).parse(raw);
    const user = await socketUser(socket); await rateLimit(`ws-join:${user.id}`, 30, 60); const state = await roomSnapshot(roomId, user);
    if (socket.data.roomId) { await removePresence(socket, socket.data.roomId); await socket.leave(`room:${socket.data.roomId}`); }
    socket.data.roomId = roomId; await socket.join(`room:${roomId}`); await presence(socket, roomId); socket.emit("state", state); io.local.to(`room:${roomId}`).emit("presence", await redis.zrangebyscore(`cinechat:presence:${roomId}`, Date.now() - 45000, "+inf"));
    return { joined: true };
  });
  handle("sync", async () => { const { room, roomId } = await authorizedRoom(socket); await presence(socket, roomId); const state = playbackSnapshot(room, room.movie.durationSeconds); socket.emit("playback", state); socket.emit("presence", await redis.zrangebyscore(`cinechat:presence:${roomId}`, Date.now() - 45000, "+inf")); return state; });
  handle("playback", async raw => { const { user, roomId } = await authorizedRoom(socket); return controlPlayback(roomId, user.id, raw); });
  handle("message", async raw => { const { user, roomId } = await authorizedRoom(socket); return sendMessage(roomId, user.id, raw); });
  handle("reaction", async raw => { const { user, roomId } = await authorizedRoom(socket); return sendReaction(roomId, user.id, raw); });
  socket.on("disconnect", () => { if (socket.data.roomId) void removePresence(socket, socket.data.roomId).catch(() => {}); });
});
subscriber.on("message", (_channel, text) => {
  void (async () => {
    const event = JSON.parse(text) as RoomEvent;
    const local = [...io.of("/").sockets.values()].filter(s => s.data.roomId === event.roomId);
    const data = event.data as { userId?: string } | undefined;
    const blocks = data?.userId ? await db.block.findMany({ where: { OR: [{ blockerId: data.userId }, { blockedId: data.userId }] } }) : [];
    for (const socket of local) {
      try {
        if (event.type === "ended" || (event.type === "removed" && event.userId === socket.data.userId)) {
          socket.emit("removed", { reason: event.type === "ended" ? "The host ended this screening." : "You left or were removed from this cinema." }); await removePresence(socket, event.roomId); await socket.leave(`room:${event.roomId}`); socket.data.roomId = undefined; continue;
        }
        await authorizedRoom(socket);
        if (event.type === "refresh" || event.type === "removed") await sendState(socket, event.roomId);
        else if (!blocks.some(b => b.blockerId === socket.data.userId || b.blockedId === socket.data.userId)) socket.emit(event.type, event.data);
      } catch { socket.emit("removed", { reason: "This screening is no longer available to your account." }); await socket.leave(`room:${event.roomId}`); await removePresence(socket, event.roomId); socket.data.roomId = undefined; }
    }
  })().catch(() => console.error("Room event delivery failed."));
});
await subscriber.subscribe("cinechat:rooms");
// Validate expiry, moderation and rights even for passive viewers.
const heartbeat = setInterval(() => {
  for (const socket of io.of("/").sockets.values()) {
    if (socket.data.roomId) void authorizedRoom(socket).then(({ roomId }) => presence(socket, roomId)).catch(() => { socket.emit("removed", { reason: "Session, membership, or playback authorization changed." }); socket.disconnect(true); });
  }
}, 15000);
const reminders = setInterval(() => { void sendDueReminders().catch(() => console.error("Screening reminder delivery failed.")); }, 60000);
http.listen(Number(process.env.WS_PORT || 3001), "0.0.0.0", () => console.log("CineChat real-time service ready."));
async function shutdown() { clearInterval(heartbeat); clearInterval(reminders); await io.close(); await subscriber.quit(); await redis.quit(); await db.$disconnect(); process.exit(0); }
process.on("SIGTERM", () => { void shutdown(); }); process.on("SIGINT", () => { void shutdown(); });
