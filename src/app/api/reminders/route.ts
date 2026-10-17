import { z } from "zod";
import { api, jsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { roomAccess } from "@/lib/rooms";
import { AppError } from "@/lib/security";
export const POST = api(async request => {
  const user = await requireUser(); const { roomId, enabled } = z.object({ roomId: z.string().max(128), enabled: z.boolean() }).parse(await jsonBody(request));
  const room = await db.cinemaRoom.findUnique({ where: { id: roomId } });
  if (!room || room.endedAt || !room.scheduledAt) throw new AppError(404, "Scheduled screening not found.");
  if (room.visibility === "PRIVATE") await roomAccess(roomId, user.id);
  if (enabled) await db.screeningReminder.upsert({ where: { roomId_userId: { roomId, userId: user.id } }, create: { roomId, userId: user.id }, update: {} });
  else await db.screeningReminder.deleteMany({ where: { roomId, userId: user.id } });
  return { saved: true };
});
