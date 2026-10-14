import { z } from "zod";
import { api, jsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { ageAt, regionForRequest } from "@/lib/security";
import { playableSource } from "@/lib/media";
import { AppError } from "@/lib/security";
import { rateLimit } from "@/lib/redis";
export const POST = api(async request => {
  const user = await requireUser();
  await rateLimit(`history:${user.id}`, 20, 60);
  const { movieId, position } = z.object({ movieId: z.string().max(80), position: z.number().finite().nonnegative() }).parse(await jsonBody(request));
  const movie = await db.movie.findUnique({ where: { id: movieId }, include: { sources: true } });
  if (!movie) throw new AppError(404, "Movie not found.");
  playableSource(movie, regionForRequest(), ageAt(user.profile?.birthDate || null));
  const safe = Math.min(position, movie.durationSeconds);
  await db.watchHistory.upsert({ where: { userId_movieId: { userId: user.id, movieId } }, create: { userId: user.id, movieId, position: safe, completed: safe > movie.durationSeconds * .9 }, update: { position: safe, completed: safe > movie.durationSeconds * .9 } });
  return { saved: true };
});
