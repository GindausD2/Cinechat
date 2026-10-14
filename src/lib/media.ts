import type { MediaSource, Movie } from "@prisma/client";
import { AppError } from "./security";
export function sourceAllowed(source: MediaSource, region: string, now = new Date()) {
  if (!source.authorized || !source.enabled || !source.rightsUrl || !source.license) return false;
  if (source.validFrom > now || (source.validUntil && source.validUntil <= now)) return false;
  if (source.regions.length && !source.regions.includes(region.toUpperCase())) return false;
  try {
    const url = new URL(source.url);
    const hosts = (process.env.MEDIA_ALLOWED_HOSTS || "download.blender.org").split(",").map(v => v.trim());
    const local = process.env.ALLOW_LOCAL_MEDIA === "true" && ["localhost", "127.0.0.1"].includes(url.hostname);
    return (url.protocol === "https:" || (local && url.protocol === "http:")) && hosts.includes(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}
export function playableSource(movie: Movie & { sources: MediaSource[] }, region: string, age: number) {
  if (age < movie.minAge) throw new AppError(403, "Complete your birth date in account settings, or choose an age-appropriate film.");
  const source = movie.sources.find(s => sourceAllowed(s, region));
  if (!source) throw new AppError(451, "This film is not available to play in your region. You can still explore its details.");
  return source;
}
export function movieSummary<T extends Movie & { sources: MediaSource[] }>(movie: T, region: string) {
  const { sources, ...metadata } = movie;
  const source = sources.find(s => sourceAllowed(s, region));
  return { ...metadata, available: Boolean(source), license: source?.license || null };
}
