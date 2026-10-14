import { z } from "zod";
import { api, jsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/redis";
import { relationshipAllowed, notify } from "@/lib/community";
import { AppError } from "@/lib/security";
import { publishRoomEvent } from "@/lib/events";
export const POST = api(async request => {
  const user = await requireUser(); await rateLimit(`social:${user.id}`, 30, 60);
  const { action, targetId } = z.object({ action: z.enum(["follow", "unfollow", "request", "accept", "decline", "unfriend", "block", "unblock"]), targetId: z.string().min(1).max(128) }).parse(await jsonBody(request));
  if (user.id === targetId) throw new AppError(400, "Choose another person.");
  if (action === "unblock") { await db.block.deleteMany({ where: { blockerId: user.id, blockedId: targetId } }); return { saved: true }; }
  if (action === "block") {
    if (!await db.user.findUnique({ where: { id: targetId } })) throw new AppError(404, "User not found.");
    await db.$transaction([
      db.block.upsert({ where: { blockerId_blockedId: { blockerId: user.id, blockedId: targetId } }, create: { blockerId: user.id, blockedId: targetId }, update: {} }),
      db.follow.deleteMany({ where: { OR: [{ followerId: user.id, followingId: targetId }, { followerId: targetId, followingId: user.id }] } }),
      db.friendship.deleteMany({ where: { OR: [{ senderId: user.id, receiverId: targetId }, { senderId: targetId, receiverId: user.id }] } })
    ]);
    const shared = await db.roomMembership.findMany({ where: { userId: user.id, status: "ACTIVE", room: { memberships: { some: { userId: targetId, status: "ACTIVE" } } } }, select: { roomId: true } });
    for (const room of shared) await publishRoomEvent({ roomId: room.roomId, type: "refresh" });
    return { saved: true };
  }
  const target = await relationshipAllowed(user.id, targetId);
  if (action === "follow") {
    if (!target.profile?.publicProfile) throw new AppError(403, "This profile is private.");
    await db.follow.upsert({ where: { followerId_followingId: { followerId: user.id, followingId: targetId } }, create: { followerId: user.id, followingId: targetId }, update: {} });
    await notify(targetId, "follow", `${user.name} started following you`, `/profile/${user.profile?.username}`, `follow:${user.id}:${targetId}`);
  } else if (action === "unfollow") await db.follow.deleteMany({ where: { followerId: user.id, followingId: targetId } });
  else if (action === "request") {
    if (!target.profile?.allowFriendRequests) throw new AppError(403, "This user is not accepting friend requests.");
    const existing = await db.friendship.findFirst({ where: { OR: [{ senderId: user.id, receiverId: targetId }, { senderId: targetId, receiverId: user.id }] } });
    if (!existing) await db.friendship.create({ data: { senderId: user.id, receiverId: targetId } });
    await notify(targetId, "friend-request", `${user.name} sent you a friend request`, "/community", `friend:${user.id}:${targetId}`);
  } else if (action === "accept") {
    const result = await db.friendship.updateMany({ where: { senderId: targetId, receiverId: user.id, status: "PENDING" }, data: { status: "ACCEPTED" } });
    if (!result.count) throw new AppError(404, "Friend request not found.");
    await notify(targetId, "friend-accepted", `${user.name} accepted your friend request`, "/community");
  } else if (action === "decline") await db.friendship.deleteMany({ where: { senderId: targetId, receiverId: user.id, status: "PENDING" } });
  else await db.friendship.deleteMany({ where: { OR: [{ senderId: user.id, receiverId: targetId }, { senderId: targetId, receiverId: user.id }] } });
  return { saved: true };
});
