import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { JoinRoom } from "@/components/join-room";
import { RoomClient } from "@/components/room-client";
import { roomSnapshot } from "@/lib/rooms";
import { AppError } from "@/lib/security";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) redirect("/login"); const { id } = await params;
  const room = await db.cinemaRoom.findUnique({ where: { id }, include: { movie: true, memberships: { where: { userId: user.id } } } });
  const membership = room?.memberships[0];
  if (!room || room.endedAt || membership?.status === "BANNED" || (room.visibility === "PRIVATE" && !membership && room.hostId !== user.id)) notFound();
  if (membership?.status === "ACTIVE") {
    let snapshot: Awaited<ReturnType<typeof roomSnapshot>> | null = null; let message = "Try again shortly.";
    try { snapshot = await roomSnapshot(id, user); }
    catch (error) { if (error instanceof AppError) message = error.message; }
    if (!snapshot) return <section className="page-container empty-state"><h1>Screening unavailable.</h1><p>{message}</p></section>;
    return <section className="page-container"><RoomClient initial={snapshot} viewerId={user.id} /></section>;
  }
  return <section className="page-container max-w-lg"><div className="glass-card"><span className="eyebrow">YOUR NEXT MOVIE NIGHT</span><h1 className="text-3xl">{room.title}</h1><p className="muted">{room.movie.title} · {room.capacity} seats</p><p>{room.description}</p><JoinRoom roomId={id} /></div></section>;
}
