import { z } from "zod";
import { api, jsonBody } from "@/lib/api";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { AppError } from "@/lib/security";
import { rateLimit } from "@/lib/redis";
import { publishRoomEvent } from "@/lib/events";
import { sourceAllowed } from "@/lib/media";
const safeImage = z.string().max(2048).refine(v => v.startsWith("/art/") || v.startsWith("https://"), "Use a local art asset or HTTPS image.");
export const GET = api(async () => {
  await requireAdmin();
  const [users, rooms, messages, reports, pro] = await Promise.all([db.user.count(), db.cinemaRoom.count({ where: { endedAt: null } }), db.chatMessage.count({ where: { deleted: false } }), db.report.count({ where: { status: "OPEN" } }), db.subscription.count({ where: { plan: "PRO", status: { in: ["active", "trialing"] }, currentPeriodEnd: { gt: new Date() } } })]);
  return { users, rooms, messages, reports, pro };
});
export const POST = api(async request => {
  const admin = await requireAdmin(); await rateLimit(`admin:${admin.id}`, 60, 60);
  const input = z.discriminatedUnion("action", [
    z.object({ action: z.literal("suspend-user"), userId: z.string(), suspended: z.boolean(), reason: z.string().min(3).max(500) }),
    z.object({ action: z.literal("end-room"), roomId: z.string(), reason: z.string().min(3).max(500) }),
    z.object({ action: z.literal("review-report"), reportId: z.string(), status: z.enum(["RESOLVED", "DISMISSED"]), deleteMessage: z.boolean().default(false), reason: z.string().min(3).max(500) }),
    z.object({ action: z.literal("disable-source"), sourceId: z.string(), reason: z.string().min(3).max(500) }),
    z.object({ action: z.literal("create-movie"), id: z.string().regex(/^[a-z0-9-]{3,80}$/), title: z.string().trim().min(1).max(100), synopsis: z.string().min(10).max(5000), year: z.number().int().min(1888).max(2200), durationSeconds: z.number().int().min(1).max(72000), genres: z.array(z.string().max(30)).min(1).max(8), cast: z.array(z.string().max(100)).max(30), poster: safeImage, backdrop: safeImage, metadataSource: z.url().startsWith("https://"), minAge: z.number().int().min(13).max(21) }),
    z.object({ action: z.literal("save-source"), id: z.string().max(128).optional(), movieId: z.string().max(80), url: z.url().max(2048), format: z.enum(["mp4", "hls"]), subtitleUrl: z.url().max(2048).nullable().default(null), license: z.string().min(3).max(200), rightsUrl: z.url().startsWith("https://"), attribution: z.string().min(10).max(2000), regions: z.array(z.string().regex(/^[A-Z]{2}$/)).max(250), validFrom: z.iso.datetime(), validUntil: z.iso.datetime().nullable(), authorized: z.boolean(), enabled: z.boolean(), rightsConfirmed: z.boolean() })
  ]).parse(await jsonBody(request));
  if (input.action === "suspend-user") {
    if (input.userId === admin.id) throw new AppError(400, "You cannot suspend your own account.");
    await db.$transaction([db.user.update({ where: { id: input.userId }, data: { suspended: input.suspended, authVersion: { increment: 1 } } }), db.realtimeTicket.deleteMany({ where: { userId: input.userId } }), db.moderationAction.create({ data: { actorId: admin.id, targetId: input.userId, action: input.suspended ? "suspend-user" : "restore-user", reason: input.reason } })]);
  } else if (input.action === "end-room") {
    await db.$transaction([db.cinemaRoom.update({ where: { id: input.roomId }, data: { endedAt: new Date(), playing: false } }), db.moderationAction.create({ data: { actorId: admin.id, targetId: input.roomId, action: "end-room", reason: input.reason } })]);
    await publishRoomEvent({ roomId: input.roomId, type: "ended" });
  } else if (input.action === "review-report") {
    const report = await db.report.findUnique({ where: { id: input.reportId } }); if (!report) throw new AppError(404, "Report not found.");
    await db.$transaction(async tx => { await tx.report.update({ where: { id: report.id }, data: { status: input.status } }); if (input.deleteMessage && report.messageId) await tx.chatMessage.update({ where: { id: report.messageId }, data: { deleted: true } }); await tx.moderationAction.create({ data: { actorId: admin.id, targetId: report.id, action: `report:${input.status.toLowerCase()}`, reason: input.reason } }); });
    if (report.roomId) await publishRoomEvent({ roomId: report.roomId, type: "refresh" });
  } else if (input.action === "disable-source") {
    await db.$transaction([db.mediaSource.update({ where: { id: input.sourceId }, data: { enabled: false } }), db.moderationAction.create({ data: { actorId: admin.id, targetId: input.sourceId, action: "disable-source", reason: input.reason } })]);
  } else if (input.action === "create-movie") {
    const { action: _action, ...data } = input; void _action;
    await db.movie.create({ data: { ...data, rating: `${data.minAge}+` } });
  } else {
    if ((input.authorized || input.enabled) && !input.rightsConfirmed) throw new AppError(400, "Confirm documented distribution rights first.");
    if (input.enabled && !input.authorized) throw new AppError(400, "An unauthorized source cannot be enabled.");
    if (input.validUntil && new Date(input.validUntil) <= new Date(input.validFrom)) throw new AppError(400, "License end must be after its start.");
    const data = { movieId: input.movieId, url: input.url, format: input.format, subtitleUrl: input.subtitleUrl, license: input.license, rightsUrl: input.rightsUrl, attribution: input.attribution, regions: input.regions, validFrom: new Date(input.validFrom), validUntil: input.validUntil ? new Date(input.validUntil) : null, authorized: input.authorized, enabled: input.enabled };
    const source = { ...data, id: input.id || "new" };
    if (!sourceAllowed({ ...source, enabled: true, authorized: true, validFrom: new Date(0), validUntil: null, regions: [] }, "US")) throw new AppError(400, "Media delivery host must be explicitly allowed in server configuration.");
    if (input.subtitleUrl && !sourceAllowed({ ...source, url: input.subtitleUrl, enabled: true, authorized: true, validFrom: new Date(0), validUntil: null, regions: [] }, "US")) throw new AppError(400, "Subtitle host is not allowed.");
    const row = input.id ? await db.mediaSource.update({ where: { id: input.id }, data }) : await db.mediaSource.create({ data });
    await db.moderationAction.create({ data: { actorId: admin.id, targetId: row.id, action: "save-source-rights", reason: `License: ${input.license}. Evidence: ${input.rightsUrl}` } });
  }
  return { saved: true };
});
