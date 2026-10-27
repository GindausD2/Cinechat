"use client";
import { useState, useEffect, useRef } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { MovieCard, type MovieCardData } from "./movie-card";

export function MovieSearch({ initial, initialNextCursor = null, initialQuery = "", initialGenre = "All" }: { initial: MovieCardData[]; initialNextCursor?: string | null; initialQuery?: string; initialGenre?: string }) {
  const [query, setQuery] = useState(initialQuery), [genre, setGenre] = useState(initialGenre), [movies, setMovies] = useState(initial);
  const [cursor, setCursor] = useState(initialNextCursor), [loading, setLoading] = useState(false), [moreLoading, setMoreLoading] = useState(false), [error, setError] = useState("");
  const [searchChanged, setSearchChanged] = useState(false);
  const request = useRef<AbortController | null>(null), generation = useRef(0);
  useEffect(() => {
    if (!searchChanged) return; // The first page was already fetched by the server.
    request.current?.abort(); const controller = new AbortController(); request.current = controller; generation.current++;
    const timer = setTimeout(async () => {
      setLoading(true); setMoreLoading(false); setError("");
      try {
        const response = await fetch(`/api/movies?${new URLSearchParams({ q: query, genre })}`, { signal: controller.signal }); const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Search failed.");
        if (!controller.signal.aborted) { setMovies(data.movies); setCursor(data.nextCursor); }
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Search failed."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, genre, searchChanged]);
  useEffect(() => () => request.current?.abort(), []);
  async function loadMore() {
    if (!cursor || loading || moreLoading) return;
    const current = generation.current, controller = new AbortController(); request.current = controller; setMoreLoading(true); setError("");
    try {
      const response = await fetch(`/api/movies?${new URLSearchParams({ q: query, genre, cursor })}`, { signal: controller.signal }); const data = await response.json();
      if (!response.ok) throw new Error(data.error || "More films could not be loaded.");
      if (!controller.signal.aborted && current === generation.current) {
        setMovies(old => { const ids = new Set(old.map(movie => movie.id)); return [...old, ...data.movies.filter((movie: MovieCardData) => !ids.has(movie.id))]; }); setCursor(data.nextCursor);
      }
    } catch (error) { if (!controller.signal.aborted && current === generation.current) setError(error instanceof Error ? error.message : "More films could not be loaded."); }
    finally { if (!controller.signal.aborted && current === generation.current) setMoreLoading(false); }
  }
  return <>
    <div className="search-toolbar"><div className="search-field"><Search size={18} /><input aria-label="Search movies" value={query} onChange={event => { setSearchChanged(true); setQuery(event.target.value); setCursor(null); setLoading(true); }} placeholder="Search by movie title" /></div><div className="genre-select"><SlidersHorizontal size={17} /><select aria-label="Filter by genre" value={genre} onChange={event => { setSearchChanged(true); setGenre(event.target.value); setCursor(null); setLoading(true); }}>{["All", "Animation", "Adventure", "Comedy", "Drama", "Fantasy", "Sci-Fi"].map(value => <option key={value} value={value}>{value === "All" ? "All genres" : value}</option>)}</select></div></div>
    <p className="muted search-count" role="status">{loading ? "Searching…" : `${movies.length} films to explore${cursor ? " · more available" : ""}`}</p>
    {error && <p role="alert" className="error-message">{error}</p>}
    <div className="movie-grid" aria-busy={loading || moreLoading}>{movies.map(movie => <MovieCard key={movie.id} movie={movie} />)}</div>
    {cursor && <div className="load-more"><button className="button button-glass" disabled={loading || moreLoading} onClick={loadMore}>{moreLoading ? "Loading films…" : "Load more movies"}</button></div>}
    {!movies.length && !loading && !error && <div className="empty-state"><h2>No films found.</h2><p>Try another title or genre.</p></div>}
  </>;
}
