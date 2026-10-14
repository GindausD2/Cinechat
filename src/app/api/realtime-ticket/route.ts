import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/redis";
import { realtimeTicket } from "@/lib/realtime-auth";
import { hashToken } from "@/lib/security";
import { db } from "@/lib/db";
export const POST = api(async () => {
  const user = await requireUser(); await rateLimit(`tickets:${user.id}`, 40, 3600);
  const ticket = realtimeTicket(); const expiresAt = new Date(Date.now() + 3600000);
  await db.realtimeTicket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  await db.realtimeTicket.create({ data: { tokenHash: hashToken(ticket), userId: user.id, authVersion: user.authVersion, expiresAt } });
  return { ticket, expiresAt };
});
