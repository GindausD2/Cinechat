import { redisConnection } from "./redis";
import { PUBLIC_SEAT_LEASE_MS } from "./seat-lease";
export const PRESENCE_TTL_MS = PUBLIC_SEAT_LEASE_MS;
// Per-connection timestamps prevent a crashed worker's stale socket from keeping
// another tab's user present forever. All mutations are atomic across workers.
const touch = `redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[1]-ARGV[4]); redis.call('ZADD',KEYS[1],ARGV[1],ARGV[2]); redis.call('EXPIRE',KEYS[1],75); redis.call('ZADD',KEYS[2],ARGV[1],ARGV[3]); redis.call('EXPIRE',KEYS[2],120); return 1`;
const remove = `redis.call('ZREM',KEYS[1],ARGV[2]); redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[1]-ARGV[4]); local last=redis.call('ZREVRANGE',KEYS[1],0,0,'WITHSCORES'); if #last==0 then redis.call('ZREM',KEYS[2],ARGV[3]) else redis.call('ZADD',KEYS[2],last[2],ARGV[3]) end; return 1`;
export type PresenceConnection = { roomId: string; userId: string; socketId: string };
export async function touchPresence(connections: PresenceConnection[]) {
  if (!connections.length) return;
  const pipeline = redisConnection().pipeline(), now = Date.now();
  for (const c of connections) pipeline.eval(touch, 2, `cinechat:connections:${c.roomId}:${c.userId}`, `cinechat:presence:${c.roomId}`, now, c.socketId, c.userId, PRESENCE_TTL_MS);
  const results = await pipeline.exec(); if (results?.some(([error]) => error)) throw new Error("Presence update failed.");
}
export async function removePresence(c: PresenceConnection) {
  await redisConnection().eval(remove, 2, `cinechat:connections:${c.roomId}:${c.userId}`, `cinechat:presence:${c.roomId}`, Date.now(), c.socketId, c.userId, PRESENCE_TTL_MS);
}
export async function presenceSnapshot(roomId: string) {
  const redis = redisConnection(), key = `cinechat:presence:${roomId}`;
  const results = await redis.multi().zremrangebyscore(key, "-inf", Date.now() - PRESENCE_TTL_MS).zcard(key).zrange(key, 0, 99).exec();
  if (!results || results.some(([error]) => error)) throw new Error("Presence unavailable.");
  return { count: Number(results[1][1]), ids: results[2][1] as string[] };
}
