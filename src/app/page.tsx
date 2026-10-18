import { requestRegion } from "@/lib/request-region";
import { ScreeningTime } from "@/components/screening-time";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Play, Users, ArrowUpRight } from "lucide-react";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { movieSummary } from "@/lib/media";
import { ContinueWatchingCard, MovieFeatureRail, MovieRail } from "@/components/movie-card";
import { secondsAgo } from "@/lib/server-time";
import { TheaterLobby } from "@/components/theater-lobby";
import { listTheaters } from "@/lib/theaters";
import { ageAt } from "@/lib/security";
import { backdropFor } from "@/lib/artwork";
export default async function Page() {
  const viewerRegion = await requestRegion();
  const user = await currentUser();
  const movies = await db.movie.findMany({
    include: { sources: true, _count: { select: {
      watchlists: { where: { createdAt: { gte: secondsAgo(604800) } } },
      history: { where: { updatedAt: { gte: secondsAgo(604800) } } },
      rooms: { where: { createdAt: { gte: secondsAgo(604800) } } }
    } } }, take: 30, orderBy: { createdAt: "desc" }
  });
  const region = viewerRegion; const summaries = movies.map(v => movieSummary(v, region)); const hero = summaries.find(v => v.id === "big-buck-bunny") || summaries[0];
  const listingOptions = { region: viewerRegion, ...(user ? { age: ageAt(user.profile?.birthDate || null) } : {}) };
  const publicRooms = (await listTheaters("public", user?.id, false, listingOptions)).filter(room => room.status === "Live").slice(0, 3);
  const upcoming = (await listTheaters("public", user?.id, true, listingOptions)).filter(room => room.status === "Upcoming").slice(0, 3);
  const clubs = await db.movieClub.findMany({ include: { _count: { select: { memberships: true } } }, take: 3, orderBy: { memberships: { _count: "desc" } } });
  const history = user ? await db.watchHistory.findMany({ where: { userId: user.id, completed: false, position: { gt: 0 } }, include: { movie: { include: { sources: true } } }, take: 6, orderBy: { updatedAt: "desc" } }) : [];
  const preferredGenres = new Set(summaries.filter(movie => user?.profile?.favoriteMovieIds.includes(movie.id)).flatMap(movie => movie.genres));
  const recommendations = summaries.filter(movie => movie.genres.some(genre => preferredGenres.size ? preferredGenres.has(genre) : ["Adventure", "Fantasy"].includes(genre)));
  const ranked = [...summaries].sort((a, b) => (b._count?.watchlists || 0) + (b._count?.rooms || 0) - (a._count?.watchlists || 0) - (a._count?.rooms || 0));
  return <div className="home-page">
    {hero && <section className="cinematic-hero" aria-labelledby="featured-title">
      <div className="hero-art"><Image src={backdropFor(hero)} alt="" fill preload sizes="(max-width: 700px) 180vw, 100vw" unoptimized={!backdropFor(hero).startsWith("/art/films/")} /></div>
      <div className="hero-shade" />
      <div className="hero-content">
        <div className="hero-tags">THE OPEN CINEMA COLLECTION</div>
        <h1 id="featured-title">{hero.title}</h1>
        <div className="movie-meta"><span>{hero.year}</span><span className="pill">{hero.rating}</span><span>{Math.round(hero.durationSeconds / 60)} min</span><span>{hero.genres.join(" · ")}</span></div>
        <p>{hero.id === "big-buck-bunny" ? "A quiet day. A little mischief. One big-hearted bunny. Discover a playful escape from the everyday, and share it with your favorite people." : hero.synopsis}</p>
        <div className="button-row">
          {hero.available && <Link href={user ? `/watch/${hero.id}` : "/login"} className="button button-primary"><Play size={17} fill="currentColor" />Watch now</Link>}
          {hero.available && <Link href={`/cinemas/new?movie=${hero.id}`} className="button button-glass"><Users size={18} />Watch together</Link>}
        </div>
        <div className="hero-credit">A Blender Foundation open film · <Link href={`/movies/${hero.id}`}>Film details</Link></div>
      </div>
      <Link href={`/movies/${hero.id}`} className="hero-caption">Discover the story <ArrowUpRight size={15} /></Link>
    </section>}
    <div className="home-content">
      <section aria-labelledby="trending-title"><div className="section-header"><h2 id="trending-title">Trending movies</h2><Link href="/movies">View all <ArrowRight size={14} /></Link></div><MovieRail movies={ranked} /></section>
      <nav className="genre-links" aria-label="Browse by genre">{["Animation", "Adventure", "Comedy", "Drama", "Fantasy", "Sci-Fi"].map(genre => <Link key={genre} href={`/movies?genre=${encodeURIComponent(genre)}`}>{genre}</Link>)}</nav>
      {history.length > 0 && <section aria-labelledby="continue-title"><div className="section-header"><h2 id="continue-title">Continue watching</h2><Link href="/watchlist">My List <ArrowRight size={14} /></Link></div><div className="continue-rail">{history.map(item => <ContinueWatchingCard key={item.movieId} movie={movieSummary(item.movie, region)} position={item.position} />)}</div></section>}
      <section aria-labelledby="popular-title"><div className="section-header"><h2 id="popular-title">Popular this week</h2><Link href="/movies">Browse movies <ArrowRight size={14} /></Link></div><MovieFeatureRail movies={[...summaries].sort((a,b) => (b._count?.history || 0) - (a._count?.history || 0))} /></section>
      <section aria-labelledby="live-title"><div className="section-header"><h2 id="live-title">Public Theater</h2><Link href="/cinemas">Explore cinemas <ArrowRight size={14} /></Link></div><TheaterLobby initial={publicRooms} scope="public" upcoming={false} signedIn={Boolean(user)} limit={3} liveOnly /></section>
      <section className="private-theater-intro" aria-labelledby="home-private-theater"><div><span className="eyebrow">A SCREENING FOR YOUR FRIENDS</span><h2 id="home-private-theater">Private Theater</h2><p className="muted">A film, your friends, and a conversation just for you. No subscriptions or payments.</p></div><Link href="/cinemas/new?type=private" className="button button-primary">Create Private Theater</Link></section>
      <section className="editorial-banner" aria-labelledby="community-title"><div className="editorial-copy"><span className="eyebrow">THE CONVERSATION CONTINUES</span><h2 id="community-title">Find your people.<br />Share your kind of cinema.</h2><p>From animation enthusiasts to late-night film lovers, there’s a conversation waiting for you.</p><Link href="/clubs" className="button button-glass">Explore movie clubs <ArrowUpRight size={15} /></Link></div><div className="editorial-image"><Image src="/art/films/elephants-still.webp" alt="Emo and Proog in Elephants Dream" fill sizes="(max-width: 700px) 100vw, 45vw" /><small>Elephants Dream · Blender Foundation · CC BY 2.5</small></div></section>
      <section aria-labelledby="recommended-title"><div className="section-header"><h2 id="recommended-title">Recommended for you</h2><Link href="/movies?genre=Adventure">Explore more <ArrowRight size={14} /></Link></div><MovieRail movies={recommendations} /></section>
      <div className="home-columns">
        <section aria-labelledby="upcoming-title"><div className="section-header"><h2 id="upcoming-title">Upcoming screenings</h2><Link href="/cinemas?upcoming=true">View all <ArrowRight size={14} /></Link></div>{upcoming.length ? upcoming.map(room => <Link href={`/cinemas/${room.id}`} className="list-row" key={room.id}><div><h3>{room.title}</h3><span className="muted">{room.movie.title}</span></div><span className="schedule-date">{room.scheduledAt && <ScreeningTime value={room.scheduledAt} />}</span></Link>) : <div className="section-empty"><h3>Make a night of it.</h3><p>Schedule a screening and give everyone something to look forward to.</p><Link href="/cinemas/new">Plan a movie night →</Link></div>}</section>
        <section aria-labelledby="clubs-title"><div className="section-header"><h2 id="clubs-title">Popular movie clubs</h2><Link href="/clubs">View all <ArrowRight size={14} /></Link></div>{clubs.length ? clubs.map(club => <Link href={`/clubs/${club.id}`} className="list-row" key={club.id}><div><h3>{club.name}</h3><span className="muted">{club.genre}</span></div><span className="muted">{club._count.memberships} members</span></Link>) : <div className="section-empty"><h3>A place for your favorite films.</h3><p>Join a club or start a conversation around the movies you love.</p><Link href="/clubs">Discover clubs →</Link></div>}</section>
      </div>
      <section aria-labelledby="recent-title"><div className="section-header"><h2 id="recent-title">Recently added</h2><Link href="/movies">View all <ArrowRight size={14} /></Link></div><MovieRail movies={summaries} /></section>
    </div>
  </div>;
}
