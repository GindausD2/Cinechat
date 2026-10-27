import { db } from "./db";
import { movieSummary } from "./media";

export async function personProfile(slug: string, region: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return null;
  const person = await db.person.findUnique({ where: { slug }, include: { credits: { orderBy: [{ movie: { year: "desc" } }, { movieId: "asc" }, { displayOrder: "asc" }], take: 100, include: { movie: { include: { sources: { include: { subtitles: true } } } } } } } });
  if (!person) return null;
  const { credits, ...profile } = person;
  const films = new Map<string, { movie: ReturnType<typeof movieSummary>; roles: string[]; sources: string[] }>();
  for (const credit of credits) {
    const film = films.get(credit.movieId) || { movie: movieSummary(credit.movie, region), roles: [], sources: [] };
    film.roles.push(`${credit.job}${credit.characterName ? ` · ${credit.characterName}` : ""}`);
    if (!film.sources.includes(credit.sourceUrl)) film.sources.push(credit.sourceUrl);
    films.set(credit.movieId, film);
  }
  return { ...profile, filmography: [...films.values()] };
}
