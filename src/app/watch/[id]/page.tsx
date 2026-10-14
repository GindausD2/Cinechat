import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Users, ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { playableSource } from "@/lib/media";
import { ageAt, AppError, regionForRequest } from "@/lib/security";
import { SoloPlayer } from "@/components/solo-player";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(); if (!user) redirect("/login"); const { id } = await params;
  const movie = await db.movie.findUnique({ where: { id }, include: { sources: true } }); if (!movie) notFound();
  let source; try { source = playableSource(movie, regionForRequest(), ageAt(user.profile?.birthDate || null)); } catch (error) { return <section className="page-container empty-state"><h1>This screening is unavailable.</h1><p>{error instanceof AppError ? error.message : "Please try another film."}</p><Link href="/movies" className="button button-primary">Explore movies</Link></section>; }
  const history = await db.watchHistory.findUnique({ where: { userId_movieId: { userId: user.id, movieId: id } } });
  return <section className="page-container"><Link href={`/movies/${id}`} className="back-link"><ArrowLeft size={16} />About the film</Link><div className="page-heading"><div><span className="eyebrow">YOUR PERSONAL CINEMA</span><h1>{movie.title}</h1></div><Link href={`/cinemas/new?movie=${id}`} className="button button-glass"><Users size={16} />Watch together</Link></div><SoloPlayer media={{ url: source.url, format: source.format, subtitleUrl: source.subtitleUrl }} movieId={id} duration={movie.durationSeconds} startAt={history?.completed ? 0 : history?.position || 0} /><p className="rights-note"><small>{source.attribution} <a href={source.rightsUrl} rel="noreferrer" target="_blank">{source.license}</a></small></p></section>;
}
