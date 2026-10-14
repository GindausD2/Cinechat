import { Prisma, type User, type Profile, type Subscription } from "@prisma/client";
import { hash, compare } from "bcryptjs";
import { db } from "./db";
import { AppError, ageAt, hashToken, randomToken, regionForRequest } from "./security";
import { createRoomSchema } from "./validation";
import { playableSource } from "./media";
import { publishRoomEvent } from "./events";
import { currentPosition, playbackSnapshot } from "./playback";
type Viewer = User & { profile: Profile | null; subscription: Subscription | null };
export function planLimits(subscription: Subscription | null) {
  const pro = subscription?.plan === "PRO" && ["active", "trialing"].includes(subscription.status) && Boolean(subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date());
  return { pro, capacity: pro ? 50 : 8, activeRooms: pro ? 12 : 3, privateRooms: pro ? 10 : 1 };
}
async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await db.$transaction(work, { isolationLevel: "Serializable" }); }
    catch (e) { if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== "P2034" || attempt === 2) throw e; }
  }
  throw new AppError(409, "Please retry this room action.");
}
export async function createRoom(user: Viewer, raw: unknown) {
  const input = createRoomSchema.parse(raw); const limits = planLimits(user.subscription);
  if (input.capacity > limits.capacity) throw new AppError(403, `Your plan supports up to ${limits.capacity} seats.`);
  if (!limits.pro && input.theme !== "silver") throw new AppError(403, "Room themes require Pro.");
  if (input.scheduledAt && (new Date(input.scheduledAt) <= new Date() || new Date(input.scheduledAt).getTime() > Date.now() + 31536000000)) throw new AppError(400, "Choose a screening date in the next year.");
  const codeHash = input.accessCode ? await hash(input.accessCode, 12) : null;
  return serializable(async tx => {
    const movie = await tx.movie.findUnique({ where: { id: input.movieId }, include: { sources: true } });
    if (!movie) throw new AppError(404, "Film not found.");
    playableSource(movie, regionForRequest(), ageAt(user.profile?.birthDate || null));
    const active = await tx.cinemaRoom.count({ where: { hostId: user.id, endedAt: null } });
    const privateCount = await tx.cinemaRoom.count({ where: { hostId: user.id, visibility: "PRIVATE", endedAt: null } });
    if (active >= limits.activeRooms || (input.visibility === "PRIVATE" && privateCount >= limits.privateRooms)) throw new AppError(403, "Your active cinema limit is reached. End an existing screening to create another.");
    return tx.cinemaRoom.create({ data: { title: input.title, description: input.description, visibility: input.visibility, movieId: input.movieId, hostId: user.id, capacity: input.capacity, accessCodeHash: codeHash, scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null, theme: input.theme, memberships: { create: { userId: user.id, role: "HOST" } } }, select: { id: true } });
  });
}
export async function roomAccess(roomId: string, userId: string) {
  const room = await db.cinemaRoom.findUnique({ where: { id: roomId }, include: { movie: { include: { sources: true } } } });
  if (!room || room.endedAt) throw new AppError(404, "This screening has ended or is unavailable.");
  const membership = await db.roomMembership.findUnique({ where: { roomId_userId: { roomId, userId } } });
  if (membership?.status !== "ACTIVE") throw new AppError(room.visibility === "PRIVATE" ? 404 : 403, "Join this cinema to continue.");
  if (await db.block.findFirst({ where: { OR: [{ blockerId: room.hostId, blockedId: userId }, { blockerId: userId, blockedId: room.hostId }] } })) throw new AppError(403, "This cinema is unavailable.");
  return { room, membership };
}
export async function joinRoom(roomId: string, user: Viewer, invitationToken?: string, accessCode?: string) {
  const now = new Date();
  const result = await serializable(async tx => {
    const room = await tx.cinemaRoom.findUnique({ where: { id: roomId }, include: { movie: { include: { sources: true } } } });
    if (!room || room.endedAt) throw new AppError(404, "Screening unavailable.");
    const existing = await tx.roomMembership.findUnique({ where: { roomId_userId: { roomId, userId: user.id } } });
    if (existing?.status === "BANNED") throw new AppError(403, "You have been removed from this cinema.");
    if (await tx.block.findFirst({ where: { OR: [{ blockerId: room.hostId, blockedId: user.id }, { blockerId: user.id, blockedId: room.hostId }] } })) throw new AppError(403, "This cinema is unavailable.");
    playableSource(room.movie, regionForRequest(), ageAt(user.profile?.birthDate || null));
    if (existing?.status === "ACTIVE") return { id: room.id };
    const authorizedPreviously = Boolean(existing) || room.hostId === user.id;
    if (!authorizedPreviously && (room.visibility === "PRIVATE" || invitationToken)) {
      if (!invitationToken) throw new AppError(404, "A valid invitation is required.");
      const invitation = await tx.invitation.findUnique({ where: { tokenHash: hashToken(invitationToken) } });
      if (!invitation || invitation.roomId !== roomId || invitation.revoked || invitation.expiresAt <= now || invitation.uses >= invitation.maxUses) throw new AppError(403, "This invitation is invalid or expired.");
      if (room.visibility === "PRIVATE" && room.accessCodeHash && (!accessCode || !await compare(accessCode, room.accessCodeHash))) throw new AppError(403, "The access code is incorrect.");
      await tx.invitation.update({ where: { id: invitation.id }, data: { uses: { increment: 1 } } });
    }
    if (await tx.roomMembership.count({ where: { roomId, status: "ACTIVE" } }) >= room.capacity) throw new AppError(409, "This cinema is full.");
    await tx.roomMembership.upsert({ where: { roomId_userId: { roomId, userId: user.id } }, create: { roomId, userId: user.id, role: room.hostId === user.id ? "HOST" : "MEMBER" }, update: { status: "ACTIVE", lastSeenAt: now } });
    return { id: room.id };
  });
  await publishRoomEvent({ roomId, type: "refresh" });
  return result;
}
export async function createInvitation(roomId: string, userId: string, maxUses: number) {
  const { room } = await roomAccess(roomId, userId);
  if (room.hostId !== userId) throw new AppError(403, "Only the host can invite participants.");
  if (maxUses > room.capacity) throw new AppError(400, "Invite uses cannot exceed room capacity.");
  const token = randomToken(); const expiresAt = new Date(Date.now() + 86400000);
  const invitation = await db.invitation.create({ data: { roomId, createdById: userId, tokenHash: hashToken(token), expiresAt, maxUses } });
  return { id: invitation.id, url: `${process.env.APP_ORIGIN}/invite/${token}`, expiresAt, maxUses };
}
export async function leaveRoom(roomId: string, userId: string) {
  const { room } = await roomAccess(roomId, userId);
  await db.$transaction(async tx => {
    await tx.roomMembership.update({ where: { roomId_userId: { roomId, userId } }, data: { status: "LEFT" } });
    if (room.hostId === userId) await tx.cinemaRoom.update({ where: { id: roomId }, data: { position: currentPosition(room, room.movie.durationSeconds), playing: false, playbackUpdatedAt: new Date(), playbackVersion: { increment: 1 } } });
  });
  await publishRoomEvent({ roomId, type: "removed", userId });
  if (room.hostId === userId) await publishRoomEvent({ roomId, type: "refresh" });
  return { left: true };
}
export async function roomSnapshot(roomId: string, user: Viewer) {
  const { room, membership } = await roomAccess(roomId, user.id);
  const source = playableSource(room.movie, regionForRequest(), ageAt(user.profile?.birthDate || null));
  const blocks = await db.block.findMany({ where: { OR: [{ blockerId: user.id }, { blockedId: user.id }] } });
  const blockedIds = blocks.map(b => b.blockerId === user.id ? b.blockedId : b.blockerId);
  const participants = await db.roomMembership.findMany({ where: { roomId, status: "ACTIVE", userId: { notIn: blockedIds } }, select: { userId: true, role: true, mutedUntil: true, user: { select: { name: true, image: true, profile: { select: { username: true } } } } }, take: 50 });
  const messages = await db.chatMessage.findMany({ where: { roomId, deleted: false, userId: { notIn: blockedIds } }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, body: true, userId: true, createdAt: true, user: { select: { name: true, image: true } } } });
  return { id: room.id, title: room.title, description: room.description, visibility: room.visibility, hostId: room.hostId, capacity: room.capacity, theme: room.theme, scheduledAt: room.scheduledAt, movie: { id: room.movie.id, title: room.movie.title, poster: room.movie.poster, durationSeconds: room.movie.durationSeconds }, media: { url: source.url, format: source.format, subtitleUrl: source.subtitleUrl, attribution: source.attribution, rightsUrl: source.rightsUrl, license: source.license }, playback: playbackSnapshot(room, room.movie.durationSeconds), membership: { role: membership.role, mutedUntil: membership.mutedUntil }, participants: participants.map(p => ({ id: p.userId, name: p.user.profile?.username || p.user.name || "Viewer", image: p.user.image, role: p.role, mutedUntil: p.mutedUntil })), messages: messages.reverse().map(m => ({ id: m.id, body: m.body, userId: m.userId, name: m.user.name || "Viewer", image: m.user.image, createdAt: m.createdAt })) };
}
