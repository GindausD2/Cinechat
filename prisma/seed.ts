import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { catalogSeed } from "../src/lib/catalog";
import { verifiedCreditSeed, tonPortrait } from "../src/lib/credit-catalog";
const db = new PrismaClient();
async function main() {
  for (const item of catalogSeed) {
    const { source, ...movie } = item as typeof catalogSeed[number] & { source?: { url: string; license: string; rightsUrl: string; attribution: string; format: string } };
    await db.movie.upsert({ where: { id: movie.id }, create: { ...movie, genres: [...movie.genres], cast: [...movie.cast] }, update: { ...movie, genres: [...movie.genres], cast: [...movie.cast] } });
    if (source) await db.mediaSource.upsert({ where: { id: `${movie.id}-open` }, create: { id: `${movie.id}-open`, movieId: movie.id, ...source, authorized: true, enabled: true }, update: {} });
  }
  const people = new Map<string, typeof verifiedCreditSeed>();
  for (const credit of verifiedCreditSeed) people.set(credit.personSlug, [...(people.get(credit.personSlug) || []), credit]);
  for (const [slug, credits] of people) {
    const first = credits[0], title = catalogSeed.find(movie => movie.id === first.movieId)!.title;
    await db.person.upsert({ where: { slug }, create: { slug, name: first.name, biography: `${first.name} is credited as ${first.job.toLowerCase()} on ${title}.`, professions: [...new Set(credits.map(credit => credit.job))], sourceUrl: first.sourceUrl, verifiedAt: first.verifiedAt, ...(slug === "ton-roosendaal" ? tonPortrait : {}) }, update: {} });
  }
  for (const { name: _name, ...credit } of verifiedCreditSeed) {
    void _name;
    await db.movieCredit.upsert({ where: { movieId_personSlug_job: { movieId: credit.movieId, personSlug: credit.personSlug, job: credit.job } }, create: credit, update: {} });
  }
  await db.movie.updateMany({ where: { id: "tears-of-steel", audioLanguages: { isEmpty: true } }, data: { audioLanguages: ["en"], audioLanguageSource: "https://mango.blender.org/about/" } });
  console.log("Seeded six curated films. No users, viewers, rooms, or payments fabricated.");
  console.log(`Added verified profiles for ${people.size} people and ${verifiedCreditSeed.length} credits without overwriting existing credit curation.`);
}
main().finally(() => db.$disconnect());
