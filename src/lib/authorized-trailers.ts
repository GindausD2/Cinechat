import { sourceAllowed } from "./media";
import type { MediaSource } from "@prisma/client";
// Metadata URLs alone never authorize playback. This one official trailer has
// a documented source/license; add other trailers only after equivalent review.
export function authorizedTrailer(movie: { id: string; trailerUrl: string | null; minAge: number }, region: string, age: number) {
 const url = "https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4";
 if (movie.id !== "sintel" || movie.trailerUrl !== url || age < movie.minAge) return null;
 const source: MediaSource = { id: "official-sintel-trailer", movieId: movie.id, url, format: "mp4", subtitleUrl: null, authorized: true, enabled: true, license: "CC BY 3.0", rightsUrl: "https://durian.blender.org/sharing/", attribution: "Sintel © 2010 Blender Foundation / durian.blender.org. Official trailer, CC BY 3.0.", regions: [], validFrom: new Date(0), validUntil: null };
 return sourceAllowed(source, region) ? { url, license: source.license, rightsUrl: source.rightsUrl, attribution: source.attribution } : null;
}
