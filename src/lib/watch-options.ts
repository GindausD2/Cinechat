import type { User, Profile } from "@prisma/client";
import { db } from "./db";
import { playableSource, movieSummary } from "./media";
import { ageAt, AppError } from "./security";
import { listTheaters } from "./theaters";

/** Read-only choices: never creates rooms or grants membership during discovery. */
export async function watchOptions(movieId: string, viewer: User & { profile: Profile | null }, region: string) {
  const movie = await db.movie.findUnique({ where: { id: movieId }, include: { sources: { include: { subtitles: true } } } });
  if (!movie) throw new AppError(404, "Movie not found.");
  const age = ageAt(viewer.profile?.birthDate || null); playableSource(movie, region, age);
  const options = { movieId, region, age };
  const [publicRooms, privateRooms] = await Promise.all([listTheaters("public", viewer.id, false, options), listTheaters("private", viewer.id, false, options)]);
  const candidates = [...publicRooms, ...privateRooms].filter(room => room.status === "Live" || room.status === "Upcoming");
  const permitted = candidates.length ? await db.cinemaRoom.findMany({ where: { id: { in: candidates.map(room => room.id) }, endedAt: null, host: { suspended: false, blocks: { none: { blockedId: viewer.id } }, blockedBy: { none: { blockerId: viewer.id } } }, memberships: { none: { userId: viewer.id, status: "BANNED" } } }, select: { id: true } }) : [];
  const ids = new Set(permitted.map(room => room.id));
  return { movie: movieSummary(movie, region), publicTheaters: publicRooms.filter(room => ids.has(room.id)), privateTheaters: privateRooms.filter(room => ids.has(room.id)) };
}
