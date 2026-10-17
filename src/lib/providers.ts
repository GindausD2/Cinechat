import { db } from "./db";
import { AppError } from "./security";
export interface MovieMetadataProvider {
  search(query: string, genre?: string): ReturnType<typeof db.movie.findMany>;
  get(id: string): ReturnType<typeof db.movie.findUnique>;
}
export class CuratedMetadataProvider implements MovieMetadataProvider {
  search(query: string, genre?: string) {
    return db.movie.findMany({ where: { ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" } }, { synopsis: { contains: query, mode: "insensitive" } }] } : {}), ...(genre && genre !== "All" ? { genres: { has: genre } } : {}) }, include: { sources: true }, orderBy: { createdAt: "desc" }, take: 60 });
  }
  get(id: string) { return db.movie.findUnique({ where: { id }, include: { sources: true } }); }
}
export class FrameXMetadataProvider {
  readonly enabled = false;
  async search(): Promise<never> { throw new AppError(503, "FrameXTV is disabled pending a documented API contract and permission review."); }
}
export const metadataProvider = new CuratedMetadataProvider();
