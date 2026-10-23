import { PrivacyImage as Image } from "@/components/privacy-image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { posterFor, backdropFor } from "@/lib/artwork";

export type MovieCardData = { id: string; title: string; year: number; poster: string; genres: string[]; durationSeconds: number; available: boolean };
export function MovieCard({ movie }: { movie: MovieCardData }) {
  const poster = posterFor(movie);
  return <Link href={`/movies/${movie.id}`} className="movie-card">
    <div className="movie-art">
      <Image src={poster} alt={`${movie.title} poster`} fill sizes={poster === "/art/films/caminandes-still.webp" ? "(max-width: 700px) 135vw, 50vw" : "(max-width: 700px) 45vw, (max-width: 1100px) 24vw, 16vw"} unoptimized={!poster.startsWith("/art/films/")} />
      {movie.available && <span className="movie-rating">Free to watch</span>}
      {movie.id === "caminandes" && poster === "/art/films/caminandes-still.webp" && <span className="poster-title">Caminandes<small>Gran Dillama</small></span>}
      <span className="movie-hover">Explore film <ArrowUpRight size={16} /></span>
    </div>
    <div className="movie-card-title"><h3>{movie.title}</h3></div>
    <p>{movie.year}<span>·</span>{movie.genres[0]}<span>·</span>{Math.round(movie.durationSeconds / 60)} min</p>
  </Link>;
}
export function MovieRail({ movies }: { movies: MovieCardData[] }) {
  return <div className="movie-rail">{movies.map(movie => <MovieCard key={movie.id} movie={movie} />)}</div>;
}
export function MovieFeatureRail({ movies }: { movies: MovieCardData[] }) {
  return <div className="feature-rail">{movies.map(movie => {
    const backdrop = backdropFor(movie);
    return <Link href={`/movies/${movie.id}`} className="feature-movie" key={movie.id}>
      <div className="feature-art"><Image src={backdrop} alt={`${movie.title} film artwork`} fill sizes="(max-width: 700px) 80vw, 33vw" unoptimized={!backdrop.startsWith("/art/films/")} /></div>
      <h3>{movie.title}</h3><p>{movie.year} · {movie.genres[0]} · {Math.round(movie.durationSeconds / 60)} min</p>
    </Link>;
  })}</div>;
}
export function ContinueWatchingCard({ movie, position }: { movie: MovieCardData; position: number }) {
  const remaining = Math.max(0, Math.ceil((movie.durationSeconds - position) / 60));
  const backdrop = backdropFor(movie);
  return <Link href={movie.available ? `/watch/${movie.id}` : `/movies/${movie.id}`} className="continue-card">
    <div className="continue-art"><Image src={backdrop} alt="" fill sizes="(max-width: 700px) 75vw, 30vw" unoptimized={!backdrop.startsWith("/art/films/")} /><span className="continue-progress"><span style={{ width: `${Math.min(100,Math.max(0,position/movie.durationSeconds*100))}%` }} /></span></div>
    <div><h3>{movie.title}</h3><span>{remaining} min left</span></div>
  </Link>;
}
