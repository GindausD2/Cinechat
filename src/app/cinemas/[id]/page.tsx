import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { JoinRoom } from "@/components/join-room";
import { RoomClient } from "@/components/room-client";
import { roomSnapshot } from "@/lib/rooms";
import { requestRegion } from "@/lib/request-region";
import { AppError } from "@/lib/security";
import { validInvitationGrant } from "@/lib/invitation-access";
import { hasPublicSeat } from "@/lib/seat-lease";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ invite?: string }> }) {
  const { id } = await params; const user = await currentUser(); if (!user) redirect(`/login?returnTo=${encodeURIComponent(`/cinemas/${id}`)}`);
  const room = await db.cinemaRoom.findUnique({ where: { id }, include: { movie: true, memberships: { where: { userId: user.id }, include: { invitation: true } } } });
  const membership = room?.memberships[0];
  if (!room || room.endedAt || membership?.status === "BANNED" || (room.visibility === "PRIVATE" && !membership && room.hostId !== user.id)) notFound();
  if (room.visibility === "PRIVATE" && room.hostId !== user.id && !validInvitationGrant(membership?.invitation || null)) notFound();
  if (membership?.status === "ACTIVE" && (room.visibility === "PRIVATE" || hasPublicSeat(membership.lastSeenAt))) {
    let snapshot: Awaited<ReturnType<typeof roomSnapshot>> | null = null; let message = "Try again shortly.";
    try { snapshot = await roomSnapshot(id, user, await requestRegion()); }
    catch (error) { if (error instanceof AppError) message = error.message; }
    if (snapshot) return <section className="page-container"><RoomClient key={id} initial={snapshot} viewerId={user.id} autoInvite={(await searchParams).invite === "1" && room.hostId === user.id && room.visibility === "PRIVATE"} /></section>;
    // Leaving can finish between the first membership read and the snapshot.
    // Offer the existing join flow only after checking the current grant again.
    const current = await db.roomMembership.findUnique({ where: { roomId_userId: { roomId: id, userId: user.id } }, include: { invitation: true } });
    const canRejoin = current?.status === "LEFT" && (room.visibility === "PUBLIC" || room.hostId === user.id || (current.invitation?.roomId === id && validInvitationGrant(current.invitation)));
    if (!canRejoin || message !== "Join this cinema to continue.") return <section className="page-container empty-state"><h1>Screening unavailable.</h1><p>{message}</p><LinkBack /></section>;
  }
  return <section className="page-container max-w-lg"><div className="glass-card"><span className="eyebrow">YOUR NEXT MOVIE NIGHT</span><h1 className="text-3xl">{room.title}</h1><p className="muted">{room.movie.title} · {room.capacity} seats</p><p>{room.description}</p><JoinRoom roomId={id} /></div></section>;
}
function LinkBack() { return <a href="/cinemas" className="button button-primary">Back to cinemas</a>; }
