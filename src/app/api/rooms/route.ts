import { api, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { createRoom } from "@/lib/rooms";
import { rateLimit } from "@/lib/redis";
import { db } from "@/lib/db";
import { onlineCount } from "@/lib/events";
export const POST = api(async request => { const user = await requireUser(); await rateLimit(`rooms:${user.id}`, 10, 3600); return createRoom(user, await jsonBody(request)); });
export const GET = api(async () => {
  const rooms = await db.cinemaRoom.findMany({ where: { visibility: "PUBLIC", endedAt: null }, select: { id: true, title: true, description: true, capacity: true, scheduledAt: true, movie: { select: { title: true, poster: true } }, host: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 50 });
  return { rooms: await Promise.all(rooms.map(async room => ({ ...room, online: await onlineCount(room.id) }))) };
});
