import { z } from "zod";
import { compare } from "bcryptjs";
import { api, jsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { profileSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/redis";
import { AppError } from "@/lib/security";
import { isUnder18, protectedPrivacy } from "@/lib/privacy";
import { deleteAccountData } from "@/lib/account-deletion";
export const PATCH = api(async request => {
  const user = await requireUser();
  await rateLimit(`profile:${user.id}`, 20, 60);
  const { image, ...data } = profileSchema.parse(await jsonBody(request));
  if (user.profile?.birthDate && data.birthDate && user.profile.birthDate.getTime() !== data.birthDate.getTime()) throw new AppError(400, "An existing birth date cannot be changed through profile editing. Contact the operator to correct it.");
  const protectedAccount = isUnder18(user.profile?.birthDate || data.birthDate || null);
  if (protectedAccount && (data.publicProfile || data.showActivity || data.allowFriendRequests)) throw new AppError(400, "Accounts under 18, or without an age declaration, keep their profile, activity, and friend requests private.");
  if (data.favoriteMovieIds && await db.movie.count({ where: { id: { in: data.favoriteMovieIds } } }) !== data.favoriteMovieIds.length) throw new AppError(400, "Choose favorites from the catalog.");
  await db.$transaction([
    db.profile.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data, ...(protectedAccount ? protectedPrivacy : {}) }, update: { ...data, ...(protectedAccount ? protectedPrivacy : {}) } }),
    db.user.update({ where: { id: user.id }, data: { name: data.username, ...(image !== undefined ? { image: image || null } : {}) } })
  ]);
  return { saved: true };
});
export const DELETE = api(async request => {
  const user = await requireUser();
  const { password, confirmEmail, token } = z.object({ password: z.string().max(72).optional(), confirmEmail: z.email().max(254), token: z.string().min(40).max(100).optional() }).parse(await jsonBody(request));
  if (confirmEmail.toLowerCase() !== user.email.toLowerCase()) throw new AppError(400, "Type your email to confirm deletion.");
  await rateLimit(`delete:${user.id}`, 5, 900);
  if (token) return deleteAccountData(user, { token });
  if (!user.passwordHash) throw new AppError(400, "Request an email confirmation link to delete this account.");
  if (!password || !await compare(password, user.passwordHash)) throw new AppError(403, "Incorrect password.");
  return deleteAccountData(user, { passwordVerified: true });
});
