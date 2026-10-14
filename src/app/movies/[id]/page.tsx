import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Play, Users, ArrowLeft, ExternalLink, ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { movieSummary } from "@/lib/media";
import { regionForRequest } from "@/lib/security";
import { backdropFor, filmAttribution } from "@/lib/artwork";
import { WatchlistButton } from "@/components/watchlist-button";
import { MovieRail } from "@/components/movie-card";
import { onlineCount } from "@/lib/events";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await db.movie.findUnique({ where: { id }, include: { sources: true } });
  if (!movie) notFound();
  const user = await currentUser();
  const [saved, related, parties] = await Promise.all([
    user ? db.watchlist.findUnique({ where: { userId_movieId: { userId: user.id, movieId: id } } }) : null,
    db.movie.findMany({ where: { id: { not: id }, genres: { hasSome: movie.genres } }, include: { sources: true }, take: 8, orderBy: { year: "desc" } }),
    // This editorial discovery section shows public activity only. Private screenings
    // continue to be available to their authorized members in the cinema lobby.
    db.cinemaRoom.findMany({ where: { movieId: id, visibility: "PUBLIC", endedAt: null }, include: { host: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 3 })
  ]);
  const region = regionForRequest();
  const data = movieSummary(movie, region);
  const counts = await Promise.all(parties.map(room => onlineCount(room.id)));
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
      <div className="detail-facts"><div><h2>Cast & creators</h2><p>{movie.cast.join(" · ")}</p></div><div><h2>Genres</h2><p>{movie.genres.join(" · ")}</p></div><div><h2>Film project</h2><a href={movie.metadataSource} target="_blank" rel="noreferrer" className="subtle-link">Official project <ExternalLink size={12} className="inline" /></a><Link href="/legal#artwork" className="subtle-link">Artwork credits</Link></div></div>
      {movie.trailerUrl && <section className="trailer-section"><h2>Official trailer</h2><video controls muted preload="none" src={movie.trailerUrl} poster={backdrop} className="trailer-video" aria-label={`${movie.title} authorized trailer`} /><small className="muted">Sintel © Blender Foundation. Official trailer, CC BY 3.0.</small></section>}
      <section aria-labelledby="parties-title"><div className="section-header"><h2 id="parties-title">Watch it together</h2><Link href="/cinemas">All cinemas <ArrowRight size={14} /></Link></div>{parties.length ? <div className="room-grid">{parties.map((room,index) => <Link href={`/cinemas/${room.id}`} className="room-card" key={room.id}><div className="room-card-backdrop" style={{ backgroundImage: `url('${backdrop}')` }} /><div className="room-card-content"><span className="pill">{room.scheduledAt && room.scheduledAt > new Date() ? room.scheduledAt.toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC" : `${counts[index]} watching`}</span><h3>{room.title}</h3><p>Hosted by {room.host.name}</p></div></Link>)}</div> : <div className="section-empty"><p>No public screenings for this film right now.</p>{data.available && <Link href={`/cinemas/new?movie=${id}`}>Host a screening →</Link>}</div>}</section>
      {related.length > 0 && <section aria-labelledby="related-title"><div className="section-header"><h2 id="related-title">More like this</h2></div><MovieRail movies={related.map(item => movieSummary(item, region))} /></section>}
      {data.available && <div className="rights-note"><span className="pill">{data.license}</span>{movie.sources.filter(source => source.authorized && source.enabled).map(source => <p key={source.id}>{filmAttribution(source.attribution)} <a href={source.rightsUrl} target="_blank" rel="noreferrer">License & rights</a></p>)}</div>}
    </div>
  </article>;
}
