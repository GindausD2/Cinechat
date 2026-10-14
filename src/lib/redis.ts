import Redis from "ioredis";
const globalRedis = globalThis as unknown as { redis?: Redis };
export function redisConnection() {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required");
  if (!globalRedis.redis) {
    globalRedis.redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 3000, lazyConnect: true });
    globalRedis.redis.on("error", () => { /* Callers handle failure; avoid logging credentials. */ });
  }
  return globalRedis.redis;
}
export async function rateLimit(key: string, limit: number, seconds: number) {
  const result = await redisConnection().eval(
    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n",
    1, `cinechat:limit:${key}`, seconds
  );
  if (Number(result) > limit) throw new RateLimitError();
}
export class RateLimitError extends Error {
  constructor() { super("Please slow down and try again shortly."); }
}
