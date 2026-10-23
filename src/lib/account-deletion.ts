import { db } from "./db";
import { AppError, hashToken, randomToken } from "./security";
import { DELETION_TOKEN_MINUTES } from "./privacy";
import { mailAvailable, sendMail } from "./mail";
import { redisConnection } from "./redis";
import { publishRoomEvent } from "./events";

export async function requestAccountDeletion(user: { id: string; email: string }) {
  if (!mailAvailable()) throw new AppError(503, "Email confirmation is unavailable. Password confirmation is still available for password accounts.");
  const token = randomToken(), tokenHash = hashToken(token);
  await db.$transaction(async tx => {
    const principal = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
    if (!principal.length) throw new AppError(404, "This account no longer exists.");
    await tx.authToken.deleteMany({ where: { userId: user.id, kind: "delete" } });
    await tx.authToken.create({ data: { userId: user.id, kind: "delete", tokenHash, expiresAt: new Date(Date.now() + DELETION_TOKEN_MINUTES * 60000) } });
  });
  try {
    await sendMail(user.email, "Confirm CineChat account deletion", `You requested account deletion. Nothing has been deleted yet. Sign in to the same account and confirm within ${DELETION_TOKEN_MINUTES} minutes: ${process.env.APP_ORIGIN}/delete-account?token=${token}\n\nThis removes your profile, messages, watch history, memberships, social connections, and theaters/clubs you created (including their members' messages). Ignore this email to keep your account. This is an essential account message, not marketing.`);
  } catch (error) {
    await db.authToken.deleteMany({ where: { userId: user.id, tokenHash } });
    throw error;
  }
  return { requested: true, message: `Check your email. Nothing is deleted until you confirm the link within ${DELETION_TOKEN_MINUTES} minutes.` };
}

export async function deleteAccountData(user: { id: string; email: string; name: string | null; passwordHash: string | null; authVersion: number; profile: { username: string } | null }, proof: { token: string } | { passwordVerified: true }) {
  const memberships = await db.roomMembership.findMany({ where: { userId: user.id }, select: { roomId: true, room: { select: { hostId: true } } } });
  await db.$transaction(async tx => {
    // Serialize confirmations and consume the token in the deletion transaction.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
    const current = await tx.user.findUnique({ where: { id: user.id }, select: { authVersion: true, passwordHash: true } });
    if (!current || current.authVersion !== user.authVersion || current.passwordHash !== user.passwordHash) throw new AppError(409, "Your account changed. Sign in and confirm again.");
    if ("token" in proof) {
      const consumed = await tx.authToken.deleteMany({ where: { userId: user.id, kind: "delete", tokenHash: hashToken(proof.token), expiresAt: { gt: new Date() } } });
      if (consumed.count !== 1) throw new AppError(400, "This deletion link is invalid, expired, or already used.");
    }
    // These older tables include non-FK references. Remove associated records
    // before the FK cascade rather than leaving orphaned personal identifiers.
    await tx.$executeRaw`DELETE FROM "ModerationAction" WHERE "targetId" = ${user.id}
      OR "targetId" IN (SELECT id FROM "ChatMessage" WHERE "userId" = ${user.id} OR "roomId" IN (SELECT id FROM "CinemaRoom" WHERE "hostId" = ${user.id}))
      OR "targetId" IN (SELECT id FROM "CinemaRoom" WHERE "hostId" = ${user.id})
      OR "targetId" IN (SELECT id FROM "Invitation" WHERE "createdById" = ${user.id})`;
    await tx.report.deleteMany({ where: { OR: [{ reporterId: user.id }, { message: { userId: user.id } }, { room: { hostId: user.id } }] } });
    await tx.notification.deleteMany({ where: { OR: [
      { dedupeKey: { startsWith: `follow:${user.id}:` } }, { dedupeKey: { startsWith: `friend:${user.id}:` } },
      ...(user.profile ? [{ href: `/profile/${user.profile.username}` }] : []),
      ...(user.name ? [{ title: `${user.name} accepted your friend request` }] : [])
    ] } });
    await tx.user.delete({ where: { id: user.id } });
  }, { timeout: 15000 });
  // Database revocation succeeds even during a broker outage. Workers also
  // reauthorize periodically; never report a failed deletion after its commit.
  await Promise.allSettled(memberships.map(async ({ roomId, room }) => {
    await redisConnection().multi().del(`cinechat:connections:${roomId}:${user.id}`).zrem(`cinechat:presence:${roomId}`, user.id).exec();
    await publishRoomEvent({ roomId, type: room.hostId === user.id ? "ended" : "refresh" });
  }));
  return { deleted: true, message: "Your CineChat account and associated application data have been deleted." };
}
