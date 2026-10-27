import { requestRegion } from "@/lib/request-region";
import { PrivacyImage as Image } from "@/components/privacy-image";
import Link from "next/link";
import { authorizedTrailer } from "@/lib/authorized-trailers";
import { AuthorizedTrailer } from "@/components/authorized-trailer";
import { notFound } from "next/navigation";
import { Play, Users, ArrowLeft, ExternalLink, ArrowRight, Lock } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { movieSummary } from "@/lib/media";
import { backdropFor, posterFor, filmAttribution } from "@/lib/artwork";
import { WatchlistButton } from "@/components/watchlist-button";
import { MovieRail } from "@/components/movie-card";
import { listTheaters } from "@/lib/theaters";
import { ageAt } from "@/lib/security";
import { minimumAccountAge } from "@/lib/privacy";
import { sourceAllowed } from "@/lib/media";
import { PeopleRail } from "@/components/people-rail";
import { runtimeLabel, audioLanguageLabel } from "@/lib/movie-presentation";
import { TheaterLobby } from "@/components/theater-lobby";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ room?: string }> }) {
  const viewerRegion = await requestRegion();
  const { id } = await params;
  const movie = await db.movie.findUnique({ where: { id }, include: { sources: { include: { subtitles: true } }, credits: { include: { person: true }, orderBy: [{ displayOrder: "asc" }, { personSlug: "asc" }] } } });
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
  const context = (await searchParams).room;
  const watchHref = `/movies/${id}/watch${context ? `?room=${encodeURIComponent(context.slice(0, 120))}` : ""}`;
  const ageEligible = !user || ageAt(user.profile?.birthDate || null) >= Math.max(movie.minAge, minimumAccountAge());
  const available = data.available && ageEligible;
  const nextSource = movie.sources.filter(source => source.validFrom > new Date() && sourceAllowed(source, region, source.validFrom)).sort((a, b) => a.validFrom.getTime() - b.validFrom.getTime())[0];
  const directors = movie.credits.filter(credit => credit.job === "Director");
  const backdrop = backdropFor(movie);
  return <article className="movie-editorial">
    <section className="detail-hero" aria-labelledby="movie-title">
      <div className="hero-art"><Image src={backdrop} alt="" fill preload sizes="(max-width: 700px) 180vw, 100vw" unoptimized={!backdrop.startsWith("/art/films/")} /></div><div className="hero-shade" />
      <div className="hero-content">
        <Link href="/movies" className="back-link"><ArrowLeft size={16} />All movies</Link>
        <div className="hero-tags">THE CINECHAT COLLECTION</div>
        <div className="movie-introduction"><div className="detail-poster"><Image src={posterFor(movie)} alt={`${movie.title} poster`} fill sizes="(max-width:700px) 100px, 180px" /></div><div><h1 id="movie-title">{movie.title}</h1><div className="movie-meta"><span>{movie.year}</span><span className="pill">{movie.rating}</span><span>{runtimeLabel(movie.durationSeconds)}</span><span>{movie.genres.join(" · ")}</span></div>{directors.length > 0 && <p className="director-line">Directed by {directors.map((credit, index) => <span key={credit.id}>{index > 0 ? ", " : ""}<Link href={`/people/${credit.personSlug}`}>{credit.person.name}</Link></span>)}</p>}</div></div>
        <p className="detail-synopsis">{movie.synopsis}</p>
        <div className="button-row" id="watch-options">{available && <><Link href={watchHref} className="button button-primary"><Play size={17} fill="currentColor" />Watch now</Link><Link href={`${watchHref}${context ? "" : "#private-theaters"}`} className="button button-glass"><Users size={17} />Watch together</Link></>}<WatchlistButton movieId={id} signedIn={Boolean(user)} initialSaved={Boolean(saved)} /></div>
        {!available && <div className="availability-note" role="status">{!ageEligible ? "This film is unavailable for your account’s age settings." : nextSource ? <>Authorized playback is upcoming. Availability begins <time dateTime={nextSource.validFrom.toISOString()}>{nextSource.validFrom.toISOString().slice(0, 10)}</time>.</> : "Available to discover. Authorized playback is not currently available for this title in your region."}</div>}
      </div>
    </section>
    <div className="detail-content">
      <div className="detail-facts"><div><h2>Audio languages</h2><p>{movie.audioLanguages.length ? movie.audioLanguages.map(audioLanguageLabel).join(" · ") : "Audio language details not supplied"}</p>{movie.audioLanguageSource && <a href={movie.audioLanguageSource} className="subtle-link" target="_blank" rel="noreferrer">Language source</a>}</div><div><h2>Subtitles</h2><p>{data.subtitles.length ? data.subtitles.map(track => track.label).join(" · ") : "No authorized subtitle tracks supplied"}</p></div><div><h2>Genres</h2><p>{movie.genres.join(" · ")}</p></div><div><h2>Film project</h2><a href={movie.metadataSource} target="_blank" rel="noreferrer" className="subtle-link">Official project <ExternalLink size={12} className="inline" /></a><Link href="/legal#artwork" className="subtle-link">Artwork credits</Link></div></div>
      <section aria-labelledby="cast-title"><div className="section-header"><h2 id="cast-title">Cast & crew</h2><span className="muted">The people behind the picture</span></div>{movie.credits.length ? <PeopleRail credits={movie.credits} /> : <div><p>{movie.cast.join(" · ")}</p><p className="muted">Individual profiles will appear when verified credits are supplied.</p></div>}</section>
      {(() => { const trailer = authorizedTrailer(movie, viewerRegion, ageAt(user?.profile?.birthDate || null)); return trailer ? <AuthorizedTrailer trailer={trailer} title={movie.title} /> : null; })()}
      <section aria-labelledby="parties-title"><div className="section-header"><h2 id="parties-title">Watch it together</h2><Link href="/cinemas">All cinemas <ArrowRight size={14} /></Link></div><TheaterLobby initial={parties} scope="public" upcoming={false} signedIn={Boolean(user)} movieId={id} limit={3} /></section>
      {available && <section className="private-film-entry" aria-labelledby="private-film-title"><Lock size={28} aria-hidden="true" /><div><h2 id="private-film-title">A private screening with friends</h2><p>Choose an authorized room you have already joined, or create a new theater with a secure invitation.</p><Link href={`${watchHref}${context ? "" : "#private-theaters"}`} className="button button-primary">Choose a private theater <ArrowRight size={16} /></Link></div></section>}
      {related.length > 0 && <section aria-labelledby="related-title"><div className="section-header"><h2 id="related-title">More like this</h2></div><MovieRail movies={related.map(item => movieSummary(item, region))} /></section>}
      {data.available && <div className="rights-note"><span className="pill">{data.license}</span>{movie.sources.filter(source => source.authorized && source.enabled).map(source => <p key={source.id}>{filmAttribution(source.attribution)} <a href={source.rightsUrl} target="_blank" rel="noreferrer">License & rights</a></p>)}</div>}
    </div>
  </article>;
}
