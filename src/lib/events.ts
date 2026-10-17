import { redisConnection } from "./redis";
export type RoomEvent = { roomId: string; type: "refresh" | "playback" | "message" | "reaction" | "removed" | "ended"; data?: unknown; userId?: string };
export async function publishRoomEvent(event: RoomEvent) { await redisConnection().publish("cinechat:rooms", JSON.stringify(event)); }
export async function onlineCount(roomId: string) {
  const redis = redisConnection(); const key = `cinechat:presence:${roomId}`;
  await redis.zremrangebyscore(key, "-inf", Date.now() - 45000);
  return redis.zcard(key);
}
