import { describe, it, expect } from "vitest";
import { runtimeLabel, audioLanguageLabel } from "../../src/lib/movie-presentation";
import { verifiedCreditSeed, tonPortrait } from "../../src/lib/credit-catalog";
import { catalogSeed } from "../../src/lib/catalog";

describe("factual editorial metadata", () => {
  it("distinguishes short clips, feature lengths and absent runtimes", () => {
    expect(runtimeLabel(20)).toBe("20 sec"); expect(runtimeLabel(596)).toBe("10 min"); expect(runtimeLabel(7380)).toBe("2h 3m"); expect(runtimeLabel(NaN)).toBe("Runtime not supplied");
  });
  it("formats verified language codes without crashing on malformed imports", () => {
    expect(audioLanguageLabel("en")).toBe("English"); expect(audioLanguageLabel("bad value!")).toBe("Language details not supplied");
  });
  it("has unique role credits only for real catalog films and official project sources", () => {
    const ids = new Set(catalogSeed.map(movie => movie.id as string)), unique = new Set<string>();
    for (const credit of verifiedCreditSeed) {
      expect(ids.has(credit.movieId)).toBe(true); expect(new URL(credit.sourceUrl).protocol).toBe("https:"); expect(new URL(credit.sourceUrl).hostname.endsWith(".blender.org")).toBe(true);
      const key = `${credit.movieId}/${credit.personSlug}/${credit.job}`; expect(unique.has(key)).toBe(false); unique.add(key);
    }
  });
  it("supports a sourced shared filmography and an attributed approved portrait", () => {
    expect(verifiedCreditSeed.filter(credit => credit.personSlug === "ton-roosendaal" && credit.job === "Producer").map(credit => credit.movieId)).toEqual(expect.arrayContaining(["big-buck-bunny", "elephants-dream", "sintel"]));
    expect(tonPortrait.portraitLicenseUrl).toContain("creativecommons.org/licenses/by/3.0/nl"); expect(tonPortrait.portraitAttribution).toContain("William Maanders");
  });
});
