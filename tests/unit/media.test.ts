import { afterEach, describe, expect, it, vi } from "vitest";
import type { MediaSource, Movie } from "@prisma/client";
import { movieSummary, playableSource, sourceAllowed, subtitleTracksFor } from "@/lib/media";
const source = { id: "s", movieId: "m", url: "https://download.blender.org/film.mp4", license: "CC BY 3.0", rightsUrl: "https://example.com/rights", attribution: "Creator", enabled: true, authorized: true, regions: [], validFrom: new Date("2020-01-01"), validUntil: null } as unknown as MediaSource;
afterEach(() => vi.unstubAllEnvs());
describe("rights separated from metadata", () => {
  it("requires express authorization, valid dates, allowed hosts and regions", () => {
    expect(sourceAllowed(source, "US")).toBe(true);
    expect(sourceAllowed({ ...source, authorized: false }, "US")).toBe(false);
    expect(sourceAllowed({ ...source, validUntil: new Date("2000-01-01") }, "US")).toBe(false);
    expect(sourceAllowed({ ...source, regions: ["FR"] }, "US")).toBe(false);
    expect(sourceAllowed({ ...source, url: "https://untrusted.example/film.mp4" }, "US")).toBe(false);
    expect(sourceAllowed({ ...source, url: "http://download.blender.org/film.mp4" }, "US")).toBe(false);
  });
  it("checks age before returning any playable URL", () => {
    const movie = { id: "m", minAge: 16, sources: [source] } as Movie & { sources: MediaSource[] };
    expect(() => playableSource(movie, "US", 15)).toThrow();
    expect(playableSource(movie, "US", 16).id).toBe("s");
    expect(() => playableSource({ ...movie, sources: [] }, "US", 20)).toThrow();
  });
  it("preserves legacy English captions while accepting explicitly configured languages", () => {
    const media = { ...source, subtitleUrl: "https://download.blender.org/en.vtt", subtitles: [{ language: "es", label: "Español", url: "https://download.blender.org/es.vtt" }] };
    expect(subtitleTracksFor(media).map(track => track.language)).toEqual(["en", "es"]);
    const summary = movieSummary({ id: "m", sources: [media] } as Movie & { sources: typeof media[] }, "US");
    expect(summary.subtitles).toEqual([{ language: "en", label: "English" }, { language: "es", label: "Español" }]);
    expect(JSON.stringify(summary)).not.toContain(".vtt");
  });
  it("hides subtitle URLs on unapproved hosts and disables tracks with revoked source rights", () => {
    const media = { ...source, subtitleUrl: "https://untrusted.example/en.vtt" };
    expect(subtitleTracksFor(media)).toEqual([]);
    expect(subtitleTracksFor({ ...media, authorized: false, subtitleUrl: "https://download.blender.org/en.vtt" })).toEqual([]);
  });
  it("keeps stream URLs out of discovery responses", () => {
    const summary = movieSummary({ id: "m", sources: [source] } as Movie & { sources: MediaSource[] }, "US");
    expect(summary.available).toBe(true);
    expect(JSON.stringify(summary)).not.toContain(source.url);
  });
});
