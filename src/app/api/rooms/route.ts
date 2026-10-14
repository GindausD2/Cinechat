import { api, jsonBody } from "@/lib/api";
import { currentUser, requireUser } from "@/lib/session";
import { createRoom } from "@/lib/rooms";
import { rateLimit } from "@/lib/redis";
import { z } from "zod";
import { listTheaters } from "@/lib/theaters";
export const POST = api(async request => { const user = await requireUser(); await rateLimit(`rooms:${user.id}`, 10, 3600); return createRoom(user, await jsonBody(request)); });
export const GET = api(async request => {
  const params = new URL(request.url).searchParams;
  const scope = z.enum(["public", "private", "all"]).parse(params.get("type") || "public");
  const user = scope === "private" ? await requireUser() : scope === "all" ? await currentUser() : null;
  return { rooms: await listTheaters(scope, user?.id, params.get("upcoming") === "true") };
});
