"use client";
import { useState, useEffect } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { MovieCard, MovieCardData } from "./movie-card";
export function MovieSearch({ initial, initialQuery = "", initialGenre = "All" }: { initial: MovieCardData[]; initialQuery?: string; initialGenre?: string }) {
  const [query, setQuery] = useState(initialQuery), [genre, setGenre] = useState(initialGenre), [movies, setMovies] = useState(initial), [loading, setLoading] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => { setLoading(true); setError(""); try { const r = await fetch(`/api/movies?q=${encodeURIComponent(query)}&genre=${encodeURIComponent(genre)}`, { signal: controller.signal }); const data = await r.json(); if (!r.ok) throw new Error(data.error); setMovies(data.movies); } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Search failed."); } finally { if (!controller.signal.aborted) setLoading(false); } }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, genre]);
  return <><div className="search-toolbar"><div className="search-field"><Search size={18} /><input aria-label="Search movies" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a film, find a feeling…" /></div><div className="genre-select"><SlidersHorizontal size={17} /><select aria-label="Filter by genre" value={genre} onChange={e => setGenre(e.target.value)}>{["All", "Animation", "Adventure", "Comedy", "Drama", "Fantasy", "Sci-Fi"].map(v => <option key={v} value={v}>{v === "All" ? "All genres" : v}</option>)}</select></div></div><p className="muted search-count" role="status">{loading ? "Searching…" : `${movies.length} films to explore`}</p>{error && <p role="alert" className="error-message">{error}</p>}<div className="movie-grid">{movies.map(movie => <MovieCard key={movie.id} movie={movie} />)}</div>{!movies.length && !loading && <div className="empty-state"><h2>No films found.</h2><p>Try another title or genre.</p></div>}</>;
}
