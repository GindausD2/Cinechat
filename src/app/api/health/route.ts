import { db } from "@/lib/db";
import { redisConnection } from "@/lib/redis";
export async function GET() {
  try { await Promise.all([db.$queryRaw`SELECT 1`, redisConnection().ping()]); return Response.json({ status: "ok", service: "cinechat", version: "1.0.0" }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
