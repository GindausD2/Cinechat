import { z } from "zod";
import { api, jsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/redis";
import { AppError } from "@/lib/security";
export const POST = api(async request => {
  const user = await requireUser();
  await rateLimit(`watchlist:${user.id}`, 40, 60);
  const { movieId, saved } = z.object({ movieId: z.string().max(80), saved: z.boolean() }).parse(await jsonBody(request));
  if (!await db.movie.findUnique({ where: { id: movieId } })) throw new AppError(404, "Movie not found.");
  if (saved) await db.watchlist.upsert({ where: { userId_movieId: { userId: user.id, movieId } }, create: { userId: user.id, movieId }, update: {} });
  else await db.watchlist.deleteMany({ where: { userId: user.id, movieId } });
  return { saved };
});
