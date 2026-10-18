import { requestRegion } from "@/lib/request-region";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Users, ArrowLeft, ExternalLink, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { movieSummary } from "@/lib/media";
import { backdropFor, filmAttribution } from "@/lib/artwork";
import { WatchlistButton } from "@/components/watchlist-button";
import { MovieRail } from "@/components/movie-card";
import { listTheaters } from "@/lib/theaters";
import { ageAt } from "@/lib/security";
import { TheaterLobby } from "@/components/theater-lobby";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const viewerRegion = await requestRegion();
  const { id } = await params;
  const movie = await db.movie.findUnique({ where: { id }, include: { sources: { include: { subtitles: true } } } });
  if (!movie) notFound();
  const user = await currentUser();
  const [saved, related, parties] = await Promise.all([
    user ? db.watchlist.findUnique({ where: { userId_movieId: { userId: user.id, movieId: id } } }) : null,
    db.movie.findMany({ where: { id: { not: id }, genres: { hasSome: movie.genres } }, include: { sources: { include: { subtitles: true } } }, take: 8, orderBy: { year: "desc" } }),
    // This editorial discovery section shows public activity only. Private screenings
    // continue to be available to their authorized members in the cinema lobby.
    listTheaters("public", user?.id, false, { movieId: id, region: viewerRegion, ...(user ? { age: ageAt(user.profile?.birthDate || null) } : {}) })
  ]);
  const region = viewerRegion;
  const data = movieSummary(movie, region);
  const backdrop = backdropFor(movie);
  return <article className="movie-editorial">
    <section className="detail-hero" aria-labelledby="movie-title">
      <div className="hero-art"><Image src={backdrop} alt="" fill preload sizes="(max-width: 700px) 180vw, 100vw" unoptimized={!backdrop.startsWith("/art/films/")} /></div><div className="hero-shade" />
      <div className="hero-content">
        <Link href="/movies" className="back-link"><ArrowLeft size={16} />All movies</Link>
        <div className="hero-tags">BLENDER OPEN CINEMA</div>
        <h1 id="movie-title">{movie.title}</h1>
        <div className="movie-meta"><span>{movie.year}</span><span className="pill">{movie.rating}</span><span>{Math.round(movie.durationSeconds / 60)} min</span><span>{movie.genres.join(" · ")}</span></div>
        <p className="detail-synopsis">{movie.synopsis}</p>
        <div className="button-row">{data.available && <><Link href={user ? `/watch/${id}` : "/login"} className="button button-primary"><Play size={17} fill="currentColor" />Watch now</Link><Link href={`/cinemas/new?movie=${id}`} className="button button-glass"><Users size={17} />Watch together</Link></>}<WatchlistButton movieId={id} signedIn={Boolean(user)} initialSaved={Boolean(saved)} /></div>
        {!data.available && <div className="availability-note">Available to discover. Authorized full-film delivery is not configured for this title yet.</div>}
      </div>
    </section>
    <div className="detail-content">
      <div className="detail-facts"><div><h2>Cast & creators</h2><p>{movie.cast.join(" · ")}</p></div><div><h2>Subtitles</h2><p>{data.subtitles.length ? data.subtitles.map(track => track.label).join(" · ") : "No subtitle tracks supplied"}</p></div><div><h2>Genres</h2><p>{movie.genres.join(" · ")}</p></div><div><h2>Film project</h2><a href={movie.metadataSource} target="_blank" rel="noreferrer" className="subtle-link">Official project <ExternalLink size={12} className="inline" /></a><Link href="/legal#artwork" className="subtle-link">Artwork credits</Link></div></div>
      {movie.trailerUrl && <section className="trailer-section"><h2>Official trailer</h2><video controls muted preload="none" src={movie.trailerUrl} poster={backdrop} className="trailer-video" aria-label={`${movie.title} authorized trailer`} /><small className="muted">Sintel © Blender Foundation. Official trailer, CC BY 3.0.</small></section>}
      <section aria-labelledby="parties-title"><div className="section-header"><h2 id="parties-title">Watch it together</h2><Link href="/cinemas">All cinemas <ArrowRight size={14} /></Link></div><TheaterLobby initial={parties} scope="public" upcoming={false} signedIn={Boolean(user)} movieId={id} limit={3} /></section>
      {related.length > 0 && <section aria-labelledby="related-title"><div className="section-header"><h2 id="related-title">More like this</h2></div><MovieRail movies={related.map(item => movieSummary(item, region))} /></section>}
      {data.available && <div className="rights-note"><span className="pill">{data.license}</span>{movie.sources.filter(source => source.authorized && source.enabled).map(source => <p key={source.id}>{filmAttribution(source.attribution)} <a href={source.rightsUrl} target="_blank" rel="noreferrer">License & rights</a></p>)}</div>}
    </div>
  </article>;
}
