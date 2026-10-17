import { z } from "zod";
import { compare } from "bcryptjs";
import { api, jsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { profileSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/redis";
import { AppError } from "@/lib/security";
export const PATCH = api(async request => {
  const user = await requireUser();
  await rateLimit(`profile:${user.id}`, 20, 60);
  const { image, ...data } = profileSchema.parse(await jsonBody(request));
  if (data.favoriteMovieIds && await db.movie.count({ where: { id: { in: data.favoriteMovieIds } } }) !== data.favoriteMovieIds.length) throw new AppError(400, "Choose favorites from the catalog.");
  await db.$transaction([
    db.profile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data }),
    db.user.update({ where: { id: user.id }, data: { name: data.username, ...(image !== undefined ? { image: image || null } : {}) } })
  ]);
  return { saved: true };
});
export const DELETE = api(async request => {
  const user = await requireUser();
  const { password, confirmEmail } = z.object({ password: z.string().max(72).optional(), confirmEmail: z.email() }).parse(await jsonBody(request));
  if (confirmEmail.toLowerCase() !== user.email) throw new AppError(400, "Type your email to confirm deletion.");
  if (!user.passwordHash) throw new AppError(409, "Set a password using password reset before deleting your account.");
  await rateLimit(`delete:${user.id}`, 5, 900);
  if (!password || !await compare(password, user.passwordHash)) throw new AppError(403, "Incorrect password.");
  await db.user.delete({ where: { id: user.id } });
  return { deleted: true };
});
