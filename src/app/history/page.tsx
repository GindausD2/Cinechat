import Link from "next/link";
import { redirect } from "next/navigation";
import { History } from "lucide-react";
import { currentUser } from "@/lib/session";
import { requestRegion } from "@/lib/request-region";
import { db } from "@/lib/db";
import { movieSummary } from "@/lib/media";
import { ContinueWatchingCard } from "@/components/movie-card";

export const metadata = { title: "Viewing history" };
export default async function Page() {
  const user = await currentUser(); if (!user) redirect("/login?returnTo=%2Fhistory");
  const [region, rows] = await Promise.all([requestRegion(), db.watchHistory.findMany({ where: { userId: user.id }, include: { movie: { include: { sources: true } } }, orderBy: [{ updatedAt: "desc" }, { movieId: "asc" }], take: 50 })]);
  return <section className="page-container">
    <div className="page-heading"><div><span className="eyebrow">BACK TO THE STORIES YOU LOVE</span><h1>Viewing history.</h1><p className="muted">Your 50 most recent films, including finished screenings. Only you can access this page.</p></div><Link href="/watchlist" className="button button-glass">My List</Link></div>
    {rows.length ? <div className="history-grid">{rows.map(row => <ContinueWatchingCard key={row.movieId} movie={movieSummary(row.movie, region)} position={row.position} completed={row.completed} watchedAt={row.updatedAt.toISOString()} />)}</div> : <div className="empty-state"><History size={30} className="mx-auto mb-4" /><h2>Your first screening is ahead.</h2><p>Films you play in your personal cinema or a theater will appear here.</p><Link href="/movies" className="button button-primary">Find a film</Link></div>}
    <p className="muted mt-8">Manage privacy or download your complete account data in <Link href="/settings">account settings</Link>. A film’s playback availability is checked again when you open it.</p>
  </section>;
}
