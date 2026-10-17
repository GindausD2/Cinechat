import { db } from "./db";
import { AppError } from "./security";
import { messageSchema, playbackSchema, reactionSchema } from "./validation";
import { roomAccess } from "./rooms";
import { rateLimit } from "./redis";
import { currentPosition, playbackSnapshot } from "./playback";
import { publishRoomEvent } from "./events";
export async function controlPlayback(roomId: string, userId: string, raw: unknown) {
  const input = playbackSchema.parse(raw); await rateLimit(`playback:${userId}`, 90, 60);
  const { room } = await roomAccess(roomId, userId);
  if (room.hostId !== userId) throw new AppError(403, "Only the host controls the screening.");
  if (room.scheduledAt && room.scheduledAt > new Date()) throw new AppError(409, "The scheduled screening has not started yet.");
  const now = new Date();
  const position = input.position !== undefined ? Math.min(input.position, room.movie.durationSeconds) : currentPosition(room, room.movie.durationSeconds);
  if (input.action === "seek" && input.position === undefined) throw new AppError(400, "Seek requires a position.");
  const changed = await db.cinemaRoom.updateMany({ where: { id: roomId, hostId: userId, endedAt: null, playbackVersion: input.expectedVersion }, data: { position, playing: input.action === "play" ? true : input.action === "pause" ? false : room.playing, playbackUpdatedAt: now, playbackVersion: { increment: 1 } } });
  if (!changed.count) throw new AppError(409, "Playback changed. Sync and try again.");
  const updated = await db.cinemaRoom.findUniqueOrThrow({ where: { id: roomId } }); const state = playbackSnapshot(updated, room.movie.durationSeconds);
  await publishRoomEvent({ roomId, type: "playback", data: state }); return state;
}
export async function sendMessage(roomId: string, userId: string, raw: unknown) {
  const { room, membership } = await roomAccess(roomId, userId);
  if (room.visibility !== "PRIVATE") throw new AppError(403, "Text chat is available only in private theaters.");
  const { body } = messageSchema.parse(raw); await rateLimit(`chat:${userId}`, 20, 10); await rateLimit(`chat-room:${roomId}`, 200, 10);
  if (membership.mutedUntil && membership.mutedUntil > new Date()) throw new AppError(403, "The host has temporarily muted your chat.");
  const row = await db.chatMessage.create({ data: { roomId, userId, body }, include: { user: { select: { name: true, image: true } } } });
  const message = { id: row.id, userId, body, name: row.user.name || "Viewer", image: row.user.image, createdAt: row.createdAt.toISOString() };
  await publishRoomEvent({ roomId, type: "message", data: message }); return message;
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
