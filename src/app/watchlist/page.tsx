import { requestRegion } from "@/lib/request-region";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bookmark } from "lucide-react";
import { currentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { movieSummary } from "@/lib/media";
import { MovieCard } from "@/components/movie-card";
export default async function Page() {
  const viewerRegion = await requestRegion();
  const user = await currentUser(); if (!user) redirect("/login");
  const rows = await db.watchlist.findMany({ where: { userId: user.id }, include: { movie: { include: { sources: true } } }, orderBy: { createdAt: "desc" } });
  return <section className="page-container"><div className="page-heading"><div><span className="eyebrow">SAVED FOR A GOOD NIGHT</span><h1>My List.</h1><p className="muted">The stories you don’t want to miss.</p></div><span className="pill"><Bookmark size={12} />{rows.length} films</span></div>{rows.length ? <div className="movie-grid">{rows.map(v => <MovieCard key={v.movieId} movie={movieSummary(v.movie, viewerRegion)} />)}</div> : <div className="empty-state"><Bookmark size={28} className="mx-auto mb-4" /><h2>A little anticipation.</h2><p>Save films from their detail pages and find them here.</p><Link href="/movies" className="button button-primary">Explore movies</Link></div>}</section>;
}
