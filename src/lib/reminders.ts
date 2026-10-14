import { db } from "./db";
export async function sendDueReminders(now = new Date()) {
  const rows = await db.screeningReminder.findMany({ where: { sentAt: null, room: { endedAt: null, scheduledAt: { gte: now, lte: new Date(now.getTime() + 900000) } } }, include: { room: { include: { memberships: true } }, user: { select: { suspended: true } } }, take: 500 });
  let count = 0;
  for (const reminder of rows) {
    if (reminder.user.suspended || (reminder.room.visibility === "PRIVATE" && !reminder.room.memberships.some(m => m.userId === reminder.userId && m.status === "ACTIVE"))) continue;
    await db.$transaction(async tx => {
      const updated = await tx.screeningReminder.updateMany({ where: { roomId: reminder.roomId, userId: reminder.userId, sentAt: null }, data: { sentAt: now } });
      if (updated.count) { await tx.notification.upsert({ where: { dedupeKey: `reminder:${reminder.roomId}:${reminder.userId}` }, create: { userId: reminder.userId, type: "screening", title: `Your screening “${reminder.room.title}” starts soon`, href: `/cinemas/${reminder.roomId}`, dedupeKey: `reminder:${reminder.roomId}:${reminder.userId}` }, update: {} }); count++; }
    });
  }
  return count;
}
