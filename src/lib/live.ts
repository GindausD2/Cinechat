import { db } from "./db";
import { AppError } from "./security";
import { messageSchema, messageDeleteSchema, playbackSchema, reactionSchema } from "./validation";
import { roomAccess } from "./rooms";
import { rateLimit } from "./redis";
import { currentPosition, playbackSnapshot } from "./playback";
import { publishRoomEvent } from "./events";
import { canManageTheater } from "./theater-policy";
export async function controlPlayback(roomId: string, userId: string, raw: unknown) {
  const input = playbackSchema.parse(raw); await rateLimit(`playback:${userId}`, 90, 60);
  const { room } = await roomAccess(roomId, userId);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, role: true } });
  if (!canManageTheater(room, user)) throw new AppError(403, room.visibility === "PUBLIC" ? "Only administrators control public screenings." : "Only the host controls the screening.");
  if (room.scheduledAt && room.scheduledAt > new Date()) throw new AppError(409, "The scheduled screening has not started yet.");
  const now = new Date();
  const position = input.position !== undefined ? Math.min(input.position, room.movie.durationSeconds) : currentPosition(room, room.movie.durationSeconds);
  if (input.action === "seek" && input.position === undefined) throw new AppError(400, "Seek requires a position.");
  await db.$transaction(async tx => {
    const changed = await tx.cinemaRoom.updateMany({ where: { id: roomId, endedAt: null, playbackVersion: input.expectedVersion }, data: { position, playing: input.action === "play" ? true : input.action === "pause" ? false : room.playing, playbackUpdatedAt: now, playbackVersion: { increment: 1 } } });
    if (!changed.count) throw new AppError(409, "Playback changed. Sync and try again.");
    if (room.visibility === "PUBLIC") await tx.moderationAction.create({ data: { actorId: userId, targetId: roomId, action: `screening:${input.action}`, reason: `Playback revision ${input.expectedVersion + 1}` } });
  });
  const updated = await db.cinemaRoom.findUniqueOrThrow({ where: { id: roomId } }); const state = playbackSnapshot(updated, room.movie.durationSeconds);
  await publishRoomEvent({ roomId, type: "playback", data: state }); return state;
}
export async function sendMessage(roomId: string, userId: string, raw: unknown) {
  const { room, membership } = await roomAccess(roomId, userId);
  if (room.visibility !== "PRIVATE") throw new AppError(403, "Text chat is available only in private theaters.");
  const { body, clientNonce } = messageSchema.parse(raw); await rateLimit(`chat:${userId}`, 20, 10); await rateLimit(`chat-room:${roomId}`, 200, 10);
  if (membership.mutedUntil && membership.mutedUntil > new Date()) throw new AppError(403, "The host has temporarily muted your chat.");
  const include = { user: { select: { name: true, image: true } } } as const;
  // ON CONFLICT makes retrying an acknowledged/timeout message idempotent,
  // including concurrent retries handled by different realtime workers.
  if (clientNonce) await db.chatMessage.createMany({ data: { roomId, userId, body, clientNonce }, skipDuplicates: true });
  const row = clientNonce
    ? await db.chatMessage.findUniqueOrThrow({ where: { roomId_userId_clientNonce: { roomId, userId, clientNonce } }, include })
    : await db.chatMessage.create({ data: { roomId, userId, body }, include });
  if (row.deleted) throw new AppError(410, "This message was deleted.");
  if (row.body !== body) throw new AppError(409, "This message identifier was already used. Send a new message.");
  const message = { id: row.id, userId, body, name: row.user.name || "Viewer", image: row.user.image, createdAt: row.createdAt.toISOString() };
  // Repeat the notification on a retry: the DB commit may have succeeded just
  // before a publisher/network failure. Clients deduplicate by persistent ID.
  await publishRoomEvent({ roomId, type: "message", data: message }); return message;
}
export async function deleteMessage(roomId: string, userId: string, raw: unknown) {
  const { room } = await roomAccess(roomId, userId);
  if (room.visibility !== "PRIVATE") throw new AppError(403, "Text chat is available only in private theaters.");
  const { messageId } = messageDeleteSchema.parse(raw); await rateLimit(`chat-delete:${userId}`, 30, 60);
  const message = await db.chatMessage.findFirst({ where: { id: messageId, roomId } });
  if (!message) throw new AppError(404, "Message not found in this theater.");
  if (message.userId !== userId && room.hostId !== userId) throw new AppError(403, "You can delete your own messages. Hosts can moderate this theater.");
  await db.$transaction(async tx => {
    const result = await tx.chatMessage.updateMany({ where: { id: messageId, roomId, deleted: false }, data: { deleted: true } });
    if (result.count) await tx.moderationAction.create({ data: { actorId: userId, targetId: messageId, action: message.userId === userId ? "message:delete-own" : "message:moderate", reason: `Message removed in private theater ${roomId}` } });
  });
  await publishRoomEvent({ roomId, type: "message-delete", data: { id: messageId, userId: message.userId } });
  return { id: messageId, deleted: true };
}
export async function sendReaction(roomId: string, userId: string, raw: unknown) {
  const { room, membership } = await roomAccess(roomId, userId);
  const input = reactionSchema.parse(raw);
  if (room.visibility !== "PRIVATE" && input.messageId) throw new AppError(403, "Public theaters support cinema reactions only.");
  if (membership.mutedUntil && membership.mutedUntil > new Date()) throw new AppError(403, "Reactions are temporarily muted.");
  await rateLimit(`reaction:${userId}`, 10, 10);
  await rateLimit(`reaction-room:${roomId}`, 200, 10);
  if (input.messageId && !await db.chatMessage.findFirst({ where: { id: input.messageId, roomId, deleted: false } })) throw new AppError(404, "Message not found in this cinema.");
  const row = input.messageId ? await db.reaction.upsert({ where: { userId_messageId_emoji: { userId, messageId: input.messageId, emoji: input.emoji } }, create: { roomId, userId, ...input }, update: {} }) : await db.reaction.create({ data: { roomId, userId, emoji: input.emoji } });
  const reaction = { id: row.id, userId, emoji: row.emoji, messageId: row.messageId };
  await publishRoomEvent({ roomId, type: "reaction", data: reaction }); return reaction;
}
