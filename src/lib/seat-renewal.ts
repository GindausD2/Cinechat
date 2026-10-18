import type { Visibility } from "@prisma/client";
import { db } from "./db";
import { seatLeaseCutoff } from "./seat-lease";

/** Serialize public renewals with capacity reservations. A heartbeat read just
 * before expiry cannot renew an old seat after another viewer has claimed it.
 */
export async function renewMemberships(room: { id: string; hostId: string; visibility: Visibility }, userIds: string[]) {
  if (!userIds.length) return new Set<string>();
  return db.$transaction(async tx => {
    if (room.visibility === "PUBLIC") await tx.$queryRaw`SELECT id FROM "CinemaRoom" WHERE id = ${room.id} FOR UPDATE`;
    const now = new Date();
    const renewed = await tx.roomMembership.updateManyAndReturn({
      where: { roomId: room.id, userId: { in: userIds }, status: "ACTIVE",
        ...(room.visibility === "PUBLIC" ? { lastSeenAt: { gt: seatLeaseCutoff(now.getTime()) } } : { OR: [{ userId: room.hostId }, { invitation: { revoked: false, expiresAt: { gt: now } } }] }) },
      data: { lastSeenAt: now }, select: { userId: true }
    });
    return new Set(renewed.map(member => member.userId));
  }, { maxWait: 10000, timeout: 15000 });
}
