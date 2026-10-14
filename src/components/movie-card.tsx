import Link from "next/link";
import { Play, ArrowUpRight } from "lucide-react";
export type MovieCardData = { id: string; title: string; year: number; poster: string; genres: string[]; durationSeconds: number; available: boolean };
export function MovieCard({ movie }: { movie: MovieCardData }) {
  return <Link href={`/movies/${movie.id}`} className="movie-card group"><div className="movie-art" style={{ backgroundImage: `url('${movie.poster}')` }}><span className="movie-rating">{movie.available ? "FREE TO WATCH" : "DISCOVER"}</span><div className="movie-hover"><span className="play-circle"><Play size={20} fill="currentColor" /></span><span>Explore film <ArrowUpRight size={13} /></span></div></div><div className="movie-card-title"><h3>{movie.title}</h3><span>{movie.year}</span></div><p>{movie.genres[0]}<span>·</span>{Math.round(movie.durationSeconds / 60)} min</p></Link>;
}
export function MovieRail({ movies }: { movies: MovieCardData[] }) { return <div className="movie-rail">{movies.map(movie => <MovieCard key={movie.id} movie={movie} />)}</div>; }
