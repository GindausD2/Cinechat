import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { AppError, hashToken } from "@/lib/security";
import { rateLimit } from "@/lib/redis";
export const GET = api(async request => {
  const user = await requireUser(); await rateLimit(`invite-read:${user.id}`, 30, 60);
  const token = new URL(request.url).searchParams.get("token") || "";
  if (token.length < 32 || token.length > 100) throw new AppError(404, "Invitation not found.");
  const invitation = await db.invitation.findUnique({ where: { tokenHash: hashToken(token) }, include: { room: { select: { id: true, title: true, accessCodeHash: true, endedAt: true } } } });
  if (!invitation || invitation.revoked || invitation.expiresAt <= new Date() || invitation.uses >= invitation.maxUses || invitation.room.endedAt) throw new AppError(404, "Invitation expired or unavailable.");
  return { roomId: invitation.roomId, title: invitation.room.title, requiresCode: Boolean(invitation.room.accessCodeHash) };
});
