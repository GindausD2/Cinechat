import { z } from "zod";
import { api, jsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
export const GET = api(async () => { const user = await requireUser(); return { notifications: await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }) }; });
export const POST = api(async request => { const user = await requireUser(); const { id } = z.object({ id: z.string().optional() }).parse(await jsonBody(request)); await db.notification.updateMany({ where: { userId: user.id, ...(id ? { id } : {}) }, data: { readAt: new Date() } }); return { saved: true }; });
