import { Prisma, type User, type Profile } from "@prisma/client";
import { hash, compare } from "bcryptjs";
import { db } from "./db";
import { AppError, ageAt, hashToken, randomToken, regionForRequest } from "./security";
import { createRoomSchema } from "./validation";
import { playableSource, subtitleTracksFor } from "./media";
import { publishRoomEvent } from "./events";
import { currentPosition, playbackSnapshot } from "./playback";
import { THEATER_LIMITS } from "./theater-limits";
import { validInvitationGrant } from "./invitation-access";
import { canManageTheater } from "./theater-policy";
import { hasPublicSeat, seatLeaseCutoff } from "./seat-lease";
import { requirePolicyAcceptance } from "./policy-acceptance";
import { adultBirthDateCutoff } from "./privacy";
type Viewer = User & { profile: Profile | null };
export async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction(work, { isolationLevel: "Serializable" }); }
    catch (e) { if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2034" || attempt === 2) throw e; }
  }
  throw new AppError(409, "Please retry this room action.");
}
export async function createRoom(user: Viewer, raw: unknown, region = regionForRequest()) {
  await requirePolicyAcceptance(user.id);
  const input = createRoomSchema.parse(raw); const limits = THEATER_LIMITS;
  if (input.visibility === "PUBLIC" && user.role !== "ADMIN") throw new AppError(403, "Only administrators can create public screenings. Create a private theater to watch with friends.");
  if (input.scheduledAt && (new Date(input.scheduledAt) <= new Date() || new Date(input.scheduledAt).getTime() > Date.now() + 31536000000)) throw new AppError(400, "Choose a screening date in the next year.");
  const codeHash = input.accessCode ? await hash(input.accessCode, 12) : null;
  return serializable(async tx => {
    const movie = await tx.movie.findUnique({ where: { id: input.movieId }, include: { sources: true } });
    if (!movie) throw new AppError(404, "Film not found.");
    playableSource(movie, region, ageAt(user.profile?.birthDate || null));
    const active = await tx.cinemaRoom.count({ where: { hostId: user.id, endedAt: null } });
    const privateCount = await tx.cinemaRoom.count({ where: { hostId: user.id, visibility: "PRIVATE", endedAt: null } });
    if (active >= limits.activeRooms || (input.visibility === "PRIVATE" && privateCount >= limits.privateRooms)) throw new AppError(403, "Your active cinema limit is reached. End an existing screening to create another.");
    const room = await tx.cinemaRoom.create({ data: { title: input.title, description: input.description, visibility: input.visibility, movieId: input.movieId, hostId: user.id, capacity: input.capacity, accessCodeHash: codeHash, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null, theme: input.theme, memberships: { create: { userId: user.id, role: "HOST" } } }, select: { id: true } });
    if (input.visibility === "PUBLIC") await tx.moderationAction.create({ data: { actorId: user.id, targetId: room.id, action: "screening:create", reason: input.scheduledAt ? `Scheduled for ${input.scheduledAt}` : "Public screening created" } });
    return room;
  });
}
export async function roomAccess(roomId: string, userId: string) {
  const room = await db.cinemaRoom.findUnique({ where: { id: roomId }, include: { movie: { include: { sources: { include: { subtitles: true } } } } } });
  if (!room || room.endedAt) throw new AppError(404, "This screening has ended or is unavailable.");
  const membership = await db.roomMembership.findUnique({ where: { roomId_userId: { roomId, userId } }, include: { invitation: true } });
  if (membership?.status !== "ACTIVE") throw new AppError(room.visibility === "PRIVATE" ? 404 : 403, "Join this cinema to continue.");
  if (room.visibility === "PUBLIC" && !hasPublicSeat(membership.lastSeenAt)) throw new AppError(403, "Your seat reservation expired. Rejoin this public screening.");
  if (room.visibility === "PRIVATE" && room.hostId !== userId && (!validInvitationGrant(membership.invitation) || membership.invitation?.roomId !== roomId)) throw new AppError(404, "Your invitation expired or was revoked. Ask the host for a new link.");
  if (await db.block.findFirst({ where: { OR: [{ blockerId: room.hostId, blockedId: userId }, { blockerId: userId, blockedId: room.hostId }] } })) throw new AppError(403, "This cinema is unavailable.");
  return { room, membership };
}
export async function joinRoom(roomId: string, user: Viewer, invitationToken?: string, accessCode?: string, region = regionForRequest()) {
  await requirePolicyAcceptance(user.id);
  const result = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "CinemaRoom" WHERE id = ${roomId} FOR UPDATE`;
    const now = new Date();
    const room = await tx.cinemaRoom.findUnique({ where: { id: roomId }, include: { movie: { include: { sources: { include: { subtitles: true } } } } } });
    if (!room || room.endedAt) throw new AppError(404, "Screening unavailable.");
    const existing = await tx.roomMembership.findUnique({ where: { roomId_userId: { roomId, userId: user.id } }, include: { invitation: true } });
    if (existing?.status === "BANNED") throw new AppError(403, "You have been removed from this cinema.");
    if (await tx.block.findFirst({ where: { OR: [{ blockerId: room.hostId, blockedId: user.id }, { blockerId: user.id, blockedId: room.hostId }] } })) throw new AppError(403, "This cinema is unavailable.");
    playableSource(room.movie, region, ageAt(user.profile?.birthDate || null));
    const host = room.hostId === user.id;
    const grantValid = validInvitationGrant(existing?.invitation || null, now.getTime()) && existing?.invitation?.roomId === roomId;
    if (existing?.status === "ACTIVE" && (room.visibility === "PUBLIC" ? hasPublicSeat(existing.lastSeenAt, now.getTime()) : host || grantValid)) return { id: room.id, changed: false };
    let invitationId = existing?.invitationId || null;
    if (!host && room.visibility === "PRIVATE" && !grantValid) {
      if (!invitationToken) throw new AppError(404, "A valid invitation is required.");
      const invitation = await tx.invitation.findUnique({ where: { tokenHash: hashToken(invitationToken) } });
      if (!invitation || invitation.roomId !== roomId || invitation.revoked || invitation.expiresAt <= now || invitation.uses >= invitation.maxUses) throw new AppError(403, "This invitation is invalid or expired.");
      if (room.accessCodeHash && (!accessCode || !await compare(accessCode, room.accessCodeHash))) throw new AppError(403, "The access code is incorrect.");
      await tx.invitation.update({ where: { id: invitation.id }, data: { uses: { increment: 1 } } });
      invitationId = invitation.id;
    }
    const grantFilter = room.visibility === "PRIVATE" ? { OR: [{ userId: room.hostId }, { invitation: { revoked: false, expiresAt: { gt: now } } }] } : { lastSeenAt: { gt: seatLeaseCutoff(now.getTime()) } };
    if (await tx.roomMembership.count({ where: { roomId, status: "ACTIVE", ...grantFilter } }) >= room.capacity) throw new AppError(409, "This cinema is full.");
    await tx.roomMembership.upsert({ where: { roomId_userId: { roomId, userId: user.id } }, create: { roomId, userId: user.id, invitationId, role: host ? "HOST" : "MEMBER" }, update: { status: "ACTIVE", invitationId, lastSeenAt: now } });
    return { id: room.id, changed: true };
  }, { isolationLevel: "ReadCommitted", maxWait: 10000, timeout: 15000 });
  if (result.changed) await publishRoomEvent({ roomId, type: "refresh" });
  return { id: result.id };
}
export async function createInvitation(roomId: string, userId: string, requestedUses?: number, expiryHours = 24) {
  const { room } = await roomAccess(roomId, userId);
  if (room.visibility !== "PRIVATE") throw new AppError(403, "Invitations are available only for private theaters.");
  if (room.hostId !== userId) throw new AppError(403, "Only the host can invite participants.");
  const maxUses = requestedUses ?? Math.max(1, room.capacity - 1);
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > room.capacity) throw new AppError(400, "Invite uses cannot exceed room capacity.");
  if (!Number.isInteger(expiryHours) || expiryHours < 1 || expiryHours > 168) throw new AppError(400, "Choose an invitation expiry between 1 hour and 7 days.");
  const token = randomToken(); const expiresAt = new Date(Date.now() + expiryHours * 3600000);
  const invitation = await db.invitation.create({ data: { roomId, createdById: userId, tokenHash: hashToken(token), expiresAt, maxUses } });
  return { id: invitation.id, url: `${process.env.APP_ORIGIN}/invite/${token}`, expiresAt, maxUses };
}
export async function leaveRoom(roomId: string, userId: string) {
  const changed = await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "CinemaRoom" WHERE id = ${roomId} FOR UPDATE`;
    const room = await tx.cinemaRoom.findUnique({ where: { id: roomId }, include: { movie: { select: { durationSeconds: true } } } });
    const membership = await tx.roomMembership.findUnique({ where: { roomId_userId: { roomId, userId } } });
    // Leaving never requires a still-valid invitation or seat. Never change a ban.
    if (!room || membership?.status !== "ACTIVE") return false;
    await tx.roomMembership.update({ where: { roomId_userId: { roomId, userId } }, data: { status: "LEFT" } });
    if (room.hostId === userId && room.visibility === "PRIVATE" && !room.endedAt) await tx.cinemaRoom.update({ where: { id: roomId }, data: { position: currentPosition(room, room.movie.durationSeconds), playing: false, playbackUpdatedAt: new Date(), playbackVersion: { increment: 1 } } });
    return true;
  });
  if (changed) await publishRoomEvent({ roomId, type: "removed", userId });
  return { left: true };
}
export async function roomSnapshot(roomId: string, user: Viewer, region = regionForRequest()) {
  const { room, membership } = await roomAccess(roomId, user.id);
  const source = playableSource(room.movie, region, ageAt(user.profile?.birthDate || null));
  const blocks = await db.block.findMany({ where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] } });
  const blockedIds = blocks.map(b => b.blockerId === user.id ? b.blockedId : b.blockerId);
  const privacyFilter = room.visibility === "PUBLIC" && !canManageTheater(room, user) ? { OR: [{ userId: user.id }, { user: { profile: { publicProfile: true, showActivity: true, birthDate: { lte: adultBirthDateCutoff() } } } }] } : {};
  const participants = await db.roomMembership.findMany({ where: { AND: [privacyFilter], roomId, status: "ACTIVE", userId: { notIn: blockedIds }, ...(room.visibility === "PRIVATE" ? { OR: [{ userId: room.hostId }, { invitation: { revoked: false, expiresAt: { gt: new Date() } } }] } : { lastSeenAt: { gt: seatLeaseCutoff() } }) }, select: { userId: true, role: true, mutedUntil: true, user: { select: { name: true, image: true, profile: { select: { username: true } } } } }, take: room.visibility === "PUBLIC" ? 100 : 50 });
  // Retain historical records for moderation, but never read or serialize public chat.
  const messages = room.visibility === "PRIVATE" ? await db.chatMessage.findMany({ where: { roomId, deleted: false, userId: { notIn: blockedIds } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, body: true, userId: true, createdAt: true, user: { select: { name: true, image: true } } } }) : [];
  return { id: room.id, title: room.title, description: room.description, visibility: room.visibility, hostId: room.hostId, capacity: room.capacity, canManage: canManageTheater(room, user), theme: room.theme, scheduledAt: room.scheduledAt, movie: { id: room.movie.id, title: room.movie.title, poster: room.movie.poster, backdrop: room.movie.backdrop, synopsis: room.movie.synopsis, year: room.movie.year, genres: room.movie.genres, durationSeconds: room.movie.durationSeconds }, media: { url: source.url, format: source.format, subtitleUrl: source.subtitleUrl, subtitles: subtitleTracksFor(source), attribution: source.attribution, rightsUrl: source.rightsUrl, license: source.license }, playback: playbackSnapshot(room, room.movie.durationSeconds), membership: { role: membership.role, mutedUntil: membership.mutedUntil }, participants: participants.map(p => ({ id: p.userId, name: p.user.profile?.username || p.user.name || "Viewer", image: p.user.image, role: p.role, mutedUntil: p.mutedUntil })), messages: messages.reverse().map(m => ({ id: m.id, body: m.body, userId: m.userId, name: m.user.name || "Viewer", image: m.user.image, createdAt: m.createdAt })) };
}
