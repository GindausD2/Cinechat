import { requestRegion } from "@/lib/request-region";
import { metadataProvider } from "@/lib/providers";
import { movieSummary } from "@/lib/media";
import { MovieSearch } from "@/components/movie-search";
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; genre?: string }> }) {
  const viewerRegion = await requestRegion();
  const { q, genre } = await searchParams; const initialGenre = ["Animation", "Adventure", "Comedy", "Drama", "Fantasy", "Sci-Fi"].includes(genre || "") ? genre! : "All";
  const movies = await metadataProvider.search((q || "").slice(0, 100), initialGenre);
  return <section className="page-container"><div className="page-heading"><div><span className="eyebrow">FIND YOUR NEXT FAVORITE</span><h1>A world of stories.</h1><p className="muted">Open films, independent voices, and something worth sharing.</p></div><span className="pill">CURATED OPEN CINEMA</span></div><MovieSearch initial={movies.map(v => movieSummary(v, viewerRegion))} initialQuery={q} initialGenre={initialGenre} /></section>;
}
