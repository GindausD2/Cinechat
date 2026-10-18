import { redisConnection } from "./redis";
import { PUBLIC_SEAT_LEASE_MS } from "./seat-lease";
export type RoomEvent = { roomId: string; type: "refresh" | "playback" | "message" | "message-delete" | "reaction" | "removed" | "ended"; data?: unknown; userId?: string };
export async function publishRoomEvent(event: RoomEvent) { await redisConnection().publish("cinechat:rooms", JSON.stringify(event)); }
export async function onlineCount(roomId: string) {
  const redis = redisConnection(); const key = `cinechat:presence:${roomId}`;
  await redis.zremrangebyscore(key, "-inf", Date.now() - PUBLIC_SEAT_LEASE_MS);
  return redis.zcard(key);
}
