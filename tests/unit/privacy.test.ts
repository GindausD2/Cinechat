import { afterEach, describe, expect, it, vi } from "vitest";
import { makeCookiePreferences, parseCookiePreferences, isLocalImage, isExternalImage, COOKIE_PREFERENCE_DAYS } from "@/lib/cookie-preferences";
import { minimumAccountAge, isUnder18, adultBirthDateCutoff } from "@/lib/privacy";
import { policyAcknowledgementSchema } from "@/lib/validation";
import { authorizedTrailer } from "@/lib/authorized-trailers";
afterEach(() => vi.unstubAllEnvs());
describe("privacy, consent and age boundaries", () => {
 it("requires affirmative acknowledgements without turning them into optional consent", () => {
  const yes = { acceptTerms: true, acknowledgePrivacy: true, ageEligible: true };
  expect(policyAcknowledgementSchema.safeParse(yes).success).toBe(true);
  for (const key of Object.keys(yes)) for (const value of [false, undefined, "true"]) expect(policyAcknowledgementSchema.safeParse({ ...yes, [key]: value }).success).toBe(false);
 });
 it("rejects corrupt, expired, future and extended-duration image permissions", () => {
  const now = 1000000000, yes = makeCookiePreferences(true, now), no = makeCookiePreferences(false, now);
  expect(parseCookiePreferences(JSON.stringify(yes), now)?.externalImages).toBe(true);
  expect(parseCookiePreferences(JSON.stringify(no), now)?.externalImages).toBe(false);
  expect(parseCookiePreferences(JSON.stringify(yes), now + COOKIE_PREFERENCE_DAYS * 86400000)).toBeNull();
  for (const value of ["invalid", JSON.stringify({ ...yes, version: 2 }), JSON.stringify({ ...yes, expiresAt: yes.expiresAt + 1 }), JSON.stringify({ ...yes, updatedAt: now + 60001 }), JSON.stringify({ ...yes, externalImages: "true" })]) expect(parseCookiePreferences(value, now)).toBeNull();
 });
 it("does not mistake protocol-relative, credentialed or unsafe images for local assets", () => {
  expect(isLocalImage("/art/films/bunny-poster.webp")).toBe(true);
  for (const value of ["//tracker.test/x", "/\\tracker.test/x", "https://tracker.test/x", "data:image/svg+xml,evil"]) expect(isLocalImage(value)).toBe(false);
  expect(isExternalImage("https://images.example.test/avatar.png")).toBe(true);
  for (const value of ["http://images.example.test/x", "https://user:password@images.example.test/x", "javascript:alert(1)"]) expect(isExternalImage(value)).toBe(false);
 });
 it("protects missing/younger ages and validates the configurable service floor", () => {
  expect(isUnder18(null)).toBe(true);
  expect(isUnder18(new Date("2010-01-01"), new Date("2026-10-22"))).toBe(true);
  expect(isUnder18(new Date("2008-10-22"), new Date("2026-10-22"))).toBe(false);
  expect(adultBirthDateCutoff(new Date("2044-02-29T12:00:00Z")).toISOString()).toBe("2026-02-28T00:00:00.000Z");
  vi.stubEnv("MINIMUM_ACCOUNT_AGE", "18"); expect(minimumAccountAge()).toBe(18);
  for (const value of ["12", "22", "16.5", "invalid"]) { vi.stubEnv("MINIMUM_ACCOUNT_AGE", value); expect(() => minimumAccountAge()).toThrow(); }
 });
 it("never treats an arbitrary metadata trailer as authorized media", () => {
  vi.stubEnv("MEDIA_ALLOWED_HOSTS", "download.blender.org");
  const film = { id: "sintel", minAge: 13, trailerUrl: "https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4" };
  expect(authorizedTrailer(film, "US", 18)?.license).toBe("CC BY 3.0");
  expect(authorizedTrailer(film, "US", 12)).toBeNull();
  expect(authorizedTrailer({ ...film, trailerUrl: "https://example.test/unlicensed.mp4" }, "US", 18)).toBeNull();
  expect(authorizedTrailer({ ...film, id: "unreviewed" }, "US", 18)).toBeNull();
  vi.stubEnv("MEDIA_ALLOWED_HOSTS", "media.example.test"); expect(authorizedTrailer(film, "US", 18)).toBeNull();
 });
});
