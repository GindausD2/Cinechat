import { requestRegion } from "@/lib/request-region";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { movieSummary } from "@/lib/media";
import { ageAt } from "@/lib/security";
import { CreateRoomForm } from "@/components/create-room-form";
export default async function Page({ searchParams }: { searchParams: Promise<{ movie?: string; type?: string }> }) {
  const viewerRegion = await requestRegion();
  const { movie, type } = await searchParams; const user = await currentUser(); if (!user) { const target = `/cinemas/new?${new URLSearchParams({ ...(movie ? { movie } : {}), ...(type ? { type } : {}) })}`; redirect(`/login?returnTo=${encodeURIComponent(target)}`); }
  const movies = await db.movie.findMany({ include: { sources: true } }); const available = movies.filter(m => m.minAge <= ageAt(user.profile?.birthDate || null) && movieSummary(m, viewerRegion).available).map(m => ({ id: m.id, title: m.title }));
  return <section className="page-container max-w-3xl"><div className="page-heading"><div><span className="eyebrow">SET THE SCENE</span><h1>A theater of your own.</h1><p className="muted">Choose your audience, then make the screening yours.</p></div></div><CreateRoomForm movies={available} selected={movie} initialType={type === "private" ? "PRIVATE" : type === "public" ? "PUBLIC" : undefined} /></section>;
}
