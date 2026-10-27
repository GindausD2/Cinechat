import { z } from "zod";
import { api, jsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/redis";
import { serializable } from "@/lib/rooms";
import { AppError } from "@/lib/security";
export const POST = api(async request => {
  const user = await requireUser(); await rateLimit(`clubs:${user.id}`, 20, 60);
  const input = z.discriminatedUnion("action", [
    z.object({ action: z.literal("create"), name: z.string().trim().min(3).max(60), description: z.string().trim().min(10).max(500), genre: z.enum(["All cinema", "Animation", "Adventure", "Comedy", "Drama", "Fantasy", "Sci-Fi"]), color: z.enum(["#d9e4c8", "#98b6b8", "#c8acd7"]).default("#d9e4c8") }),
    z.object({ action: z.enum(["join", "leave"]), clubId: z.string().max(128) })
  ]).parse(await jsonBody(request));
  if (input.action === "leave") { await db.clubMembership.deleteMany({ where: { clubId: input.clubId, userId: user.id } }); return { saved: true }; }
  return serializable(async tx => {
    if (input.action === "join" && await tx.clubMembership.findUnique({ where: { clubId_userId: { clubId: input.clubId, userId: user.id } } })) return { saved: true };
    if (input.action === "create") {
      if (await tx.movieClub.count({ where: { creatorId: user.id } }) >= 5) throw new AppError(403, "You already manage five clubs.");
      const club = await tx.movieClub.create({ data: { name: input.name, description: input.description, genre: input.genre, color: input.color, creatorId: user.id, memberships: { create: { userId: user.id } } } }); return { id: club.id };
    }
    if (!await tx.movieClub.findUnique({ where: { id: input.clubId } })) throw new AppError(404, "Club not found.");
    await tx.clubMembership.upsert({ where: { clubId_userId: { clubId: input.clubId, userId: user.id } }, create: { clubId: input.clubId, userId: user.id }, update: {} }); return { saved: true };
  });
});
