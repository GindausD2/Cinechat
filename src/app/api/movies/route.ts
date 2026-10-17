import { api } from "@/lib/api";
import { metadataProvider } from "@/lib/providers";
import { movieSummary } from "@/lib/media";
import { regionForRequest } from "@/lib/security";
export const GET = api(async request => {
  const params = new URL(request.url).searchParams;
  const movies = await metadataProvider.search((params.get("q") || "").slice(0, 100), (params.get("genre") || "").slice(0, 30));
  return { movies: movies.map(movie => movieSummary(movie, regionForRequest(request.headers))) };
});
