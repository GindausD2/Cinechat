import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/redis";
export const GET = api(async () => {
 const user = await requireUser(); await rateLimit(`export:${user.id}`, 3, 3600);
 const [profile, acceptances, watchlist, history, memberships, rooms, messages, reactions, reports, blocks, friendships, following, notifications, providers, clubs, clubMemberships, followers, reminders, invitations, moderationActions, legacyPayments] = await Promise.all([
  db.profile.findUnique({ where: { userId: user.id } }), db.policyAcceptance.findMany({ where: { userId: user.id } }),
  db.watchlist.findMany({ where: { userId: user.id } }), db.watchHistory.findMany({ where: { userId: user.id } }),
  db.roomMembership.findMany({ where: { userId: user.id }, select: { roomId: true, status: true, role: true, joinedAt: true, lastSeenAt: true } }),
  db.cinemaRoom.findMany({ where: { hostId: user.id }, select: { id: true, title: true, description: true, visibility: true, movieId: true, createdAt: true, endedAt: true } }),
  db.chatMessage.findMany({ where: { userId: user.id, room: { visibility: "PRIVATE" } }, select: { id: true, roomId: true, body: true, createdAt: true, deleted: true } }),
  db.reaction.findMany({ where: { userId: user.id }, select: { roomId: true, messageId: true, emoji: true, createdAt: true } }),
  db.report.findMany({ where: { reporterId: user.id }, select: { id: true, reason: true, details: true, createdAt: true, status: true } }),
  db.block.findMany({ where: { blockerId: user.id }, select: { blockedId: true } }),
  db.friendship.findMany({ where: { OR: [{ senderId: user.id }, { receiverId: user.id }] } }),
  db.follow.findMany({ where: { followerId: user.id } }), db.notification.findMany({ where: { userId: user.id }, select: { type: true, title: true, createdAt: true, readAt: true } }),
  db.account.findMany({ where: { userId: user.id }, select: { provider: true, type: true, providerAccountId: true } }),
  db.movieClub.findMany({ where: { creatorId: user.id }, select: { id: true, name: true, description: true, genre: true, createdAt: true } }),
  db.clubMembership.findMany({ where: { userId: user.id }, select: { clubId: true, joinedAt: true } }),
  db.follow.findMany({ where: { followingId: user.id }, select: { followerId: true } }),
  db.screeningReminder.findMany({ where: { userId: user.id }, select: { roomId: true, sentAt: true } }),
  db.invitation.findMany({ where: { createdById: user.id }, select: { id: true, roomId: true, expiresAt: true, maxUses: true, uses: true, revoked: true } }),
  db.moderationAction.findMany({ where: { actorId: user.id }, select: { targetId: true, action: true, reason: true, createdAt: true } }),
  db.payment.findMany({ where: { userId: user.id }, select: { amount: true, currency: true, status: true, createdAt: true } })
 ]);
 return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), account: { id: user.id, email: user.email, name: user.name, image: user.image, createdAt: user.createdAt }, profile, acceptances, watchlist, history, memberships, rooms, messages, reactions, reports, blocks, friendships, following, notifications, providers, clubs, clubMemberships, followers, reminders, invitations, moderationActions, legacyPayments }), { headers: { "Content-Type": "application/json", "Content-Disposition": "attachment; filename=cinechat-account.json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
});
