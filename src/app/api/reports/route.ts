import { z } from "zod";
import { api, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/redis";
import { roomAccess } from "@/lib/rooms";
import { AppError } from "@/lib/security";
export const POST = api(async request => {
  const user = await requireUser(); await rateLimit(`reports:${user.id}`, 8, 3600);
  const input = z.object({ roomId: z.string().max(128), messageId: z.string().max(128).optional(), reason: z.enum(["harassment", "spam", "unsafe", "copyright", "other"]), details: z.string().trim().max(2000).default("") }).parse(await jsonBody(request));
  const { room } = await roomAccess(input.roomId, user.id);
  if (room.visibility === "PUBLIC" && input.messageId) throw new AppError(403, "Public theaters do not contain text chat.");
  if (input.messageId && !await db.chatMessage.findFirst({ where: { id: input.messageId, roomId: input.roomId } })) throw new AppError(400, "Message does not belong to this cinema.");
  const report = await db.report.create({ data: { reporterId: user.id, ...input } }); return { id: report.id, submitted: true };
});
