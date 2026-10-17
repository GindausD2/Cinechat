import { z } from "zod";
import { ageAt } from "./security";
import { THEATER_REACTIONS } from "./reactions";
import { THEATER_LIMITS } from "./theater-limits";
export const emailSchema = z.email().max(254).transform(v => v.toLowerCase().trim());
export const passwordSchema = z.string().min(12, "Use at least 12 characters.").max(72).refine(value => new TextEncoder().encode(value).length <= 72, "Password must be at most 72 UTF-8 bytes.");
export const usernameSchema = z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores.").transform(v => v.toLowerCase());
export const birthDateSchema = z.iso.date().transform(v => new Date(`${v}T00:00:00Z`)).refine(v => ageAt(v) >= 13 && ageAt(v) < 120, "CineChat is for ages 13 and up.");
export const signupSchema = z.object({ email: emailSchema, password: passwordSchema, username: usernameSchema, birthDate: birthDateSchema, returnTo: z.string().max(1024).optional() });
export const profileSchema = z.object({
  username: usernameSchema, biography: z.string().trim().max(500),
  publicProfile: z.boolean(), showActivity: z.boolean(), allowFriendRequests: z.boolean(),
  birthDate: birthDateSchema.optional(),
  favoriteMovieIds: z.array(z.string().max(80)).max(8).optional(),
  image: z.string().max(2048).refine(v => v === "" || v.startsWith("https://"), "Avatar must use HTTPS.").optional()
});
export const createRoomSchema = z.object({
  title: z.string().trim().min(3).max(80), description: z.string().trim().max(500).default(""),
  movieId: z.string().min(1).max(80), visibility: z.enum(["PUBLIC", "PRIVATE"]),
  capacity: z.number().int().min(2).max(THEATER_LIMITS.publicCapacity).default(8),
  accessCode: z.string().min(6).max(64).optional(),
  scheduledAt: z.iso.datetime().optional(), theme: z.enum(["silver", "blue", "midnight", "sage", "amber"]).default("silver")
}).refine(input => input.visibility !== "PRIVATE" || input.capacity <= THEATER_LIMITS.privateCapacity, "Private theaters support up to 50 participants.");
export const messageSchema = z.object({ body: z.string().trim().min(1).max(1000) });
export const reactionSchema = z.object({ emoji: z.enum(THEATER_REACTIONS), messageId: z.string().min(1).max(128).optional() });
export const playbackSchema = z.object({ action: z.enum(["play", "pause", "seek"]), position: z.number().finite().nonnegative().optional(), expectedVersion: z.number().int().nonnegative() });
