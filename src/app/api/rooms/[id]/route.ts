import { z } from "zod";
import { api, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { roomAccess, roomSnapshot, joinRoom, leaveRoom, createInvitation } from "@/lib/rooms";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/redis";
import { AppError } from "@/lib/security";
import { publishRoomEvent } from "@/lib/events";
export const GET = api(async request => { const user = await requireUser(); const id = new URL(request.url).pathname.split("/").pop()!; return roomSnapshot(id, user); });
export const POST = api(async request => {
  const user = await requireUser(); const roomId = new URL(request.url).pathname.split("/").pop()!;
  const input = z.discriminatedUnion("action", [
    z.object({ action: z.literal("join"), token: z.string().max(100).optional(), accessCode: z.string().max(64).optional() }),
    z.object({ action: z.literal("leave") }),
    z.object({ action: z.literal("invite"), maxUses: z.number().int().min(1).max(50).default(1) }),
    z.object({ action: z.literal("revoke-invite"), invitationId: z.string() }),
    z.object({ action: z.literal("end") }),
    z.object({ action: z.literal("moderate"), targetId: z.string(), command: z.enum(["remove", "mute", "unmute"]) })
  ]).parse(await jsonBody(request));
  await rateLimit(`room-action:${user.id}`, 30, 60);
  if (input.action === "join") return joinRoom(roomId, user, input.token, input.accessCode);
  if (input.action === "leave") return leaveRoom(roomId, user.id);
  if (input.action === "invite") return createInvitation(roomId, user.id, input.maxUses);
  const { room } = await roomAccess(roomId, user.id);
  if (room.hostId !== user.id) throw new AppError(403, "Host permission required.");
  if (input.action === "revoke-invite") { await db.invitation.updateMany({ where: { id: input.invitationId, roomId }, data: { revoked: true } }); return { revoked: true }; }
  if (input.action === "end") { await db.cinemaRoom.update({ where: { id: roomId }, data: { endedAt: new Date(), playing: false } }); await publishRoomEvent({ roomId, type: "ended" }); return { ended: true }; }
  if (input.targetId === user.id) throw new AppError(400, "Choose another participant.");
  await db.$transaction([
    db.roomMembership.update({ where: { roomId_userId: { roomId, userId: input.targetId } }, data: input.command === "remove" ? { status: "BANNED" } : { mutedUntil: input.command === "mute" ? new Date(Date.now() + 3600000) : null } }),
    db.moderationAction.create({ data: { actorId: user.id, targetId: input.targetId, action: `room:${input.command}`, reason: `Host moderation in ${roomId}` } })
  ]);
  await publishRoomEvent({ roomId, type: input.command === "remove" ? "removed" : "refresh", ...(input.command === "remove" ? { userId: input.targetId } : {}) });
  return { moderated: true };
});
