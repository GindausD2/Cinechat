import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { roomAccess } from "@/lib/rooms";
import { db } from "@/lib/db";
import { AppError } from "@/lib/security";
export const GET = api(async request => {
  const user = await requireUser(), id = new URL(request.url).pathname.split("/").at(-2)!;
  const { room } = await roomAccess(id, user.id);
  if (room.hostId !== user.id) throw new AppError(403, "Only the host can manage invitations.");
  return { invitations: await db.invitation.findMany({ where: { roomId: id }, select: { id: true, expiresAt: true, maxUses: true, uses: true, revoked: true }, orderBy: { expiresAt: "desc" }, take: 30 }) };
});
