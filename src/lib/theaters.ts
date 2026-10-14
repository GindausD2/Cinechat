import { db } from "./db";
import { onlineCount } from "./events";
import { backdropFor } from "./artwork";

export type TheaterScope = "public" | "private" | "all";

/** Both discovery surfaces use the same membership-filtered metadata query. */
export async function listTheaters(scope: TheaterScope, userId?: string, upcoming = false) {
  if (scope === "private" && !userId) return [];
  const membership = { memberships: { some: { userId, status: { in: ["ACTIVE", "LEFT"] as ("ACTIVE" | "LEFT")[] } } } };
  const rooms = await db.cinemaRoom.findMany({
    where: {
      endedAt: null,
      ...(scope === "public" ? { visibility: "PUBLIC" } : scope === "private" ? { visibility: "PRIVATE", ...membership } : { OR: [{ visibility: "PUBLIC" }, ...(userId ? [membership] : [])] }),
      ...(upcoming ? { scheduledAt: { gt: new Date() } } : {})
    },
    select: { id: true, title: true, description: true, visibility: true, capacity: true, scheduledAt: true, movie: { select: { id: true, title: true, poster: true, backdrop: true } }, host: { select: { name: true } } },
    orderBy: { createdAt: "desc" }, take: 50
  });
  return Promise.all(rooms.map(async room => ({ ...room, scheduledAt: room.scheduledAt?.toISOString() || null, artwork: backdropFor(room.movie), online: await onlineCount(room.id) })));
}
export type TheaterListing = Awaited<ReturnType<typeof listTheaters>>[number];
