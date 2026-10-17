import { db } from "./db";
import { AppError, ageAt } from "./security";
import { playableSource } from "./media";
import { validInvitationGrant } from "./invitation-access";
export type AudienceSocket = { id: string; userId: string; ticketHash: string };

/** Batch fresh authorization per local room, never one database waterfall per viewer. */
export async function authorizeAudience(roomId: string, sockets: AudienceSocket[], actorId?: string) {
  const userIds = [...new Set(sockets.map(s => s.userId))];
  const [room, tickets, memberships] = await Promise.all([
    db.cinemaRoom.findUnique({ where: { id: roomId }, include: { movie: { include: { sources: true } } } }),
    db.realtimeTicket.findMany({ where: { tokenHash: { in: [...new Set(sockets.map(s => s.ticketHash))] } }, select: { tokenHash: true, userId: true, authVersion: true, expiresAt: true, region: true, user: { select: { suspended: true, authVersion: true, profile: { select: { birthDate: true } } } } } }),
    db.roomMembership.findMany({ where: { roomId, userId: { in: userIds } }, include: { invitation: true } })
  ]);
  if (!room || room.endedAt) throw new AppError(404, "This screening has ended.");
  const principals = [...new Set([room.hostId, ...(actorId ? [actorId] : [])])];
  const blocks = await db.block.findMany({ where: { OR: [{ blockerId: { in: principals }, blockedId: { in: userIds } }, { blockedId: { in: principals }, blockerId: { in: userIds } }] }, select: { blockerId: true, blockedId: true } });
  const blockedWith = (principal: string, userId: string) => blocks.some(b => (b.blockerId === principal && b.blockedId === userId) || (b.blockedId === principal && b.blockerId === userId));
  const ticketMap = new Map(tickets.map(t => [t.tokenHash, t])), memberMap = new Map(memberships.map(m => [m.userId, m]));
  const authorized = new Set<string>(), blocked = new Set<string>(); const now = Date.now();
  for (const socket of sockets) {
    const ticket = ticketMap.get(socket.ticketHash), member = memberMap.get(socket.userId);
    if (!ticket || ticket.userId !== socket.userId || ticket.expiresAt.getTime() <= now || ticket.user.suspended || ticket.authVersion !== ticket.user.authVersion || member?.status !== "ACTIVE" || blockedWith(room.hostId, socket.userId)) continue;
    if (room.visibility === "PRIVATE" && room.hostId !== socket.userId && (!validInvitationGrant(member.invitation, now) || member.invitation?.roomId !== roomId)) continue;
    try { playableSource(room.movie, ticket.region, ageAt(ticket.user.profile?.birthDate || null)); }
    catch { continue; }
    authorized.add(socket.id);
    if (actorId && blockedWith(actorId, socket.userId)) blocked.add(socket.id);
  }
  return { room, authorized, blocked };
}
