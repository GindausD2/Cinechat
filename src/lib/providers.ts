import { db } from "./db";
import { AppError } from "./security";
import { catalogCursor, readCatalogCursor } from "./catalog-pagination";
function movieFilter(query: string, genre?: string) {
  return { ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" as const } }, { synopsis: { contains: query, mode: "insensitive" as const } }] } : {}), ...(genre && genre !== "All" ? { genres: { has: genre } } : {}) };
}
export interface MovieMetadataProvider {
  search(query: string, genre?: string): ReturnType<typeof db.movie.findMany>;
  get(id: string): ReturnType<typeof db.movie.findUnique>;
}
export class CuratedMetadataProvider implements MovieMetadataProvider {
  search(query: string, genre?: string) {
    return db.movie.findMany({ where: movieFilter(query, genre), include: { sources: { include: { subtitles: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 60 });
  }
  async page(query: string, genre?: string, options: { cursor?: string; limit?: number } = {}) {
    const cursor = readCatalogCursor(options.cursor), limit = options.limit ?? 18;
    if (!Number.isInteger(limit) || limit < 1 || limit > 24) throw new AppError(400, "Choose between 1 and 24 movies per page.");
    const rows = await db.movie.findMany({
      where: { AND: [movieFilter(query, genre), ...(cursor ? [{ OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] }] : [])] },
      include: { sources: { include: { subtitles: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1
    });
    const movies = rows.slice(0, limit);
    return { movies, nextCursor: rows.length > limit ? catalogCursor(movies[movies.length - 1]) : null };
  }
  get(id: string) { return db.movie.findUnique({ where: { id }, include: { sources: { include: { subtitles: true } } } }); }
}
export class FrameXMetadataProvider {
  readonly enabled = false;
  async search(): Promise<never> { throw new AppError(503, "FrameXTV is disabled pending a documented API contract and permission review."); }
}
export const metadataProvider = new CuratedMetadataProvider();
