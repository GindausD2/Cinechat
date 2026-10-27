import { db } from "./db";
import { AppError, ageAt } from "./security";
import { validInvitationGrant } from "./invitation-access";
import { playableSource } from "./media";
import { requirePolicyAcceptance } from "./policy-acceptance";
import type { Profile, User } from "@prisma/client";

type Viewer = User & { profile: Profile | null };
async function reminderAccess(roomId: string, userId: string) {
  const room = await db.cinemaRoom.findUnique({ where: { id: roomId }, include: { movie: { include: { sources: true } }, memberships: { where: { userId }, include: { invitation: true } } } });
  if (!room || room.endedAt || !room.scheduledAt) throw new AppError(404, "Scheduled screening not found.");
  const member = room.memberships[0];
  if (room.visibility === "PRIVATE" && (member?.status !== "ACTIVE" || (room.hostId !== userId && (!validInvitationGrant(member.invitation) || member.invitation?.roomId !== roomId)))) throw new AppError(404, "Scheduled screening not found.");
  if (member?.status === "BANNED" || await db.block.findFirst({ where: { OR: [{ blockerId: room.hostId, blockedId: userId }, { blockerId: userId, blockedId: room.hostId }] }, select: { blockerId: true } })) throw new AppError(403, "This screening is unavailable.");
  return room;
}

export async function reminderPreference(roomId: string, user: Viewer, region: string) {
  const room = await reminderAccess(roomId, user.id);
  const row = await db.screeningReminder.findUnique({ where: { roomId_userId: { roomId, userId: user.id } } });
  let available = true;
  try { playableSource(room.movie, region, ageAt(user.profile?.birthDate || null)); } catch (error) { if (!(error instanceof AppError)) throw error; available = false; }
  return { enabled: Boolean(row), sentAt: row?.sentAt || null, canRemind: available && room.scheduledAt!.getTime() > Date.now() };
}

export async function setReminder(roomId: string, user: Viewer, enabled: boolean, region: string) {
  if (!enabled) {
    // Withdraw an owned reminder even after access expires or the room ends.
    await db.$transaction([
      db.screeningReminder.deleteMany({ where: { roomId, userId: user.id } }),
      db.notification.deleteMany({ where: { userId: user.id, dedupeKey: `reminder:${roomId}:${user.id}`, readAt: null } })
    ]);
    return reminderPreference(roomId, user, region).catch(() => ({ enabled: false, sentAt: null, canRemind: false }));
  }
  await requirePolicyAcceptance(user.id);
  const room = await reminderAccess(roomId, user.id);
  if (room.scheduledAt! <= new Date()) throw new AppError(409, "This screening has already started.");
  playableSource(room.movie, region, ageAt(user.profile?.birthDate || null));
  const row = await db.screeningReminder.upsert({ where: { roomId_userId: { roomId, userId: user.id } }, create: { roomId, userId: user.id }, update: {} });
  return { enabled: true, sentAt: row.sentAt, canRemind: true };
}

/** Claim and deliver atomically; cancellation and other workers cannot duplicate delivery. */
export async function sendDueReminders(now = new Date()) {
  const window = { gte: now, lte: new Date(now.getTime() + 900000) };
  const rows = await db.screeningReminder.findMany({ where: { sentAt: null, room: { endedAt: null, scheduledAt: window } }, select: { roomId: true, userId: true }, orderBy: [{ roomId: "asc" }, { userId: "asc" }], take: 500 });
  let count = 0;
  for (const { roomId, userId } of rows) count += await db.$transaction(async tx => {
    const row = await tx.screeningReminder.findUnique({ where: { roomId_userId: { roomId, userId } }, select: { sentAt: true, room: { select: { hostId: true, title: true, visibility: true } } } });
    if (!row || row.sentAt) return 0;
    // Recheck grants at the claim, even when membership still says ACTIVE.
    const membership = row.room.visibility === "PRIVATE"
      ? { some: { userId, status: "ACTIVE" as const, ...(row.room.hostId === userId ? {} : { invitation: { roomId, revoked: false, expiresAt: { gt: now } } }) } }
      : { none: { userId, status: "BANNED" as const } };
    const updated = await tx.screeningReminder.updateMany({ where: { roomId, userId, sentAt: null,
      user: { suspended: false, blocks: { none: { blockedId: row.room.hostId } }, blockedBy: { none: { blockerId: row.room.hostId } } },
      room: { endedAt: null, scheduledAt: window, memberships: membership }
    }, data: { sentAt: now } });
    if (!updated.count) { await tx.screeningReminder.deleteMany({ where: { roomId, userId, sentAt: null } }); return 0; }
    await tx.notification.upsert({ where: { dedupeKey: `reminder:${roomId}:${userId}` }, create: { userId, type: "screening", title: `Your screening “${row.room.title}” starts soon`, href: `/cinemas/${roomId}`, dedupeKey: `reminder:${roomId}:${userId}` }, update: {} });
    return 1;
  });
  return count;
}
