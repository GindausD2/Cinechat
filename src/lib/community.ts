import { db } from "./db";
import { AppError } from "./security";
export async function relationshipAllowed(actorId: string, targetId: string) {
  if (actorId === targetId) throw new AppError(400, "Choose another person.");
  const target = await db.user.findUnique({ where: { id: targetId }, include: { profile: true } });
  if (!target || target.suspended) throw new AppError(404, "User unavailable.");
  if (await db.block.findFirst({ where: { OR: [{ blockerId: actorId, blockedId: targetId }, { blockerId: targetId, blockedId: actorId }] } })) throw new AppError(403, "This connection is unavailable.");
  return target;
}
export async function notify(userId: string, type: string, title: string, href: string, dedupeKey?: string) {
  if (dedupeKey) return db.notification.upsert({ where: { dedupeKey }, create: { userId, type, title, href, dedupeKey }, update: {} });
  return db.notification.create({ data: { userId, type, title, href } });
}
export async function friendsWatching(viewerId: string) {
  const friendships = await db.friendship.findMany({ where: { status: "ACCEPTED", OR: [{ senderId: viewerId }, { receiverId: viewerId }] } });
  const friendIds = friendships.map(f => f.senderId === viewerId ? f.receiverId : f.senderId);
  const blocks = await db.block.findMany({ where: { OR: [{ blockerId: viewerId }, { blockedId: viewerId }] } });
  const blocked = blocks.map(b => b.blockerId === viewerId ? b.blockedId : b.blockerId);
  return db.roomMembership.findMany({ where: { userId: { in: friendIds.filter(id => !blocked.includes(id)) }, status: "ACTIVE", lastSeenAt: { gt: new Date(Date.now() - 45000) }, user: { suspended: false, profile: { showActivity: true, publicProfile: true } }, room: { visibility: "PUBLIC", endedAt: null } }, select: { user: { select: { name: true, profile: { select: { username: true } } } }, room: { select: { id: true, title: true, movie: { select: { title: true } } } } }, take: 20 });
}
