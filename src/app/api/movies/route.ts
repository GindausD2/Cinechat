import { api } from "@/lib/api";
import { metadataProvider } from "@/lib/providers";
import { movieSummary } from "@/lib/media";
import { regionForRequest } from "@/lib/security";
export const GET = api(async request => {
  const params = new URL(request.url).searchParams;
  const page = await metadataProvider.page((params.get("q") || "").slice(0, 100), (params.get("genre") || "").slice(0, 30), { cursor: params.get("cursor") || undefined, ...(params.has("limit") ? { limit: Number(params.get("limit")) } : {}) });
  return { movies: page.movies.map(movie => movieSummary(movie, regionForRequest(request.headers))), nextCursor: page.nextCursor };
});
