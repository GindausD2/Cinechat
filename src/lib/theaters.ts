import { db } from "./db";
import { onlineCount } from "./events";
import { backdropFor } from "./artwork";
import { sourceAllowed } from "./media";
import { regionForRequest } from "./security";
import { minimumAccountAge } from "./privacy";
import { screeningStatus } from "./theater-policy";

export type TheaterScope = "public" | "private" | "all";
type ListingOptions = { region?: string; age?: number; ended?: boolean; movieId?: string };

/** Never include private metadata without a current membership grant. */
export async function listTheaters(scope: TheaterScope, userId?: string, upcoming = false, options: ListingOptions = {}) {
  if (scope === "private" && !userId) return [];
  const now = new Date(), region = options.region || regionForRequest();
  const membership = { memberships: { some: {
    userId, status: { in: ["ACTIVE", "LEFT"] as ("ACTIVE" | "LEFT")[] },
    OR: [{ role: "HOST" as const }, { invitation: { revoked: false, expiresAt: { gt: now } } }]
  } } };
  const rooms = await db.cinemaRoom.findMany({
    where: {
      endedAt: options.ended ? { not: null } : null,
      ...(options.movieId ? { movieId: options.movieId } : {}),
      ...(scope === "public" ? { visibility: "PUBLIC" } : scope === "private" ? { visibility: "PRIVATE", ...membership } : { OR: [{ visibility: "PUBLIC" }, ...(userId ? [membership] : [])] }),
      ...(upcoming ? { scheduledAt: { gt: now } } : {})
    },
    select: { id: true, title: true, description: true, visibility: true, capacity: true, endedAt: true, scheduledAt: true, createdAt: true,
      movie: { select: { id: true, title: true, poster: true, backdrop: true, genres: true, durationSeconds: true, minAge: true, sources: true } }, host: { select: { name: true } } },
    orderBy: upcoming ? [{ scheduledAt: "asc" }, { id: "asc" }] : [{ createdAt: "desc" }, { id: "desc" }], take: 50
  });
  return Promise.all(rooms.map(async room => {
    const { sources, ...movie } = room.movie;
    const available = sources.some(source => sourceAllowed(source, region, now)) && (options.age === undefined || options.age >= Math.max(movie.minAge, minimumAccountAge()));
    const status = screeningStatus(room, available, now);
    return { ...room, movie, scheduledAt: room.scheduledAt?.toISOString() || null, endedAt: room.endedAt?.toISOString() || null, createdAt: room.createdAt.toISOString(), status,
      artwork: backdropFor(movie), online: status === "Ended" ? 0 : await onlineCount(room.id) };
  }));
}
export type TheaterListing = Awaited<ReturnType<typeof listTheaters>>[number];
