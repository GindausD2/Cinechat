import { z } from "zod";
import { api, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { reminderPreference, setReminder } from "@/lib/reminders";
import { regionForRequest } from "@/lib/security";
import { rateLimit } from "@/lib/redis";
const roomIdSchema = z.string().min(1).max(128);
export const GET = api(async request => {
  const user = await requireUser(); await rateLimit(`reminder-read:${user.id}`, 120, 60);
  const roomId = roomIdSchema.parse(new URL(request.url).searchParams.get("roomId"));
  return reminderPreference(roomId, user, regionForRequest(request.headers));
});
export const POST = api(async request => {
  const user = await requireUser(); await rateLimit(`reminder-write:${user.id}`, 30, 60);
  const { roomId, enabled } = z.object({ roomId: roomIdSchema, enabled: z.boolean() }).parse(await jsonBody(request));
  return setReminder(roomId, user, enabled, regionForRequest(request.headers));
});
