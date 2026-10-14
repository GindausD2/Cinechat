import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { catalogSeed } from "../src/lib/catalog";
const db = new PrismaClient();
async function main() {
  for (const item of catalogSeed) {
    const { source, ...movie } = item as typeof catalogSeed[number] & { source?: { url: string; license: string; rightsUrl: string; attribution: string; format: string } };
    await db.movie.upsert({ where: { id: movie.id }, create: { ...movie, genres: [...movie.genres], cast: [...movie.cast] }, update: { ...movie, genres: [...movie.genres], cast: [...movie.cast] } });
    if (source) await db.mediaSource.upsert({ where: { id: `${movie.id}-open` }, create: { id: `${movie.id}-open`, movieId: movie.id, ...source, authorized: true, enabled: true }, update: {} });
  }
  console.log("Seeded six curated films. No users, viewers, rooms, or payments fabricated.");
}
main().finally(() => db.$disconnect());
