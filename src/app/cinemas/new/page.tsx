import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { movieSummary } from "@/lib/media";
import { regionForRequest } from "@/lib/security";
import { planLimits } from "@/lib/rooms";
import { CreateRoomForm } from "@/components/create-room-form";
export default async function Page({ searchParams }: { searchParams: Promise<{ movie?: string }> }) {
  const user = await currentUser(); if (!user) redirect("/login"); const { movie } = await searchParams;
  const movies = await db.movie.findMany({ include: { sources: true } }); const available = movies.filter(m => movieSummary(m, regionForRequest()).available).map(m => ({ id: m.id, title: m.title }));
  return <section className="page-container max-w-3xl"><div className="page-heading"><div><span className="eyebrow">SET THE SCENE</span><h1>A cinema of your own.</h1><p className="muted">Choose a film, gather your people, share the moment.</p></div></div><CreateRoomForm movies={available} selected={movie} limits={planLimits(user.subscription)} /></section>;
}
