import { describe, expect, it } from "vitest";
import { ageAt, hashToken, randomToken, requireOrigin } from "@/lib/security";
import { signupSchema, messageSchema } from "@/lib/validation";
describe("authentication and validation boundaries", () => {
  it("requires age 13, long passwords and safe usernames", () => {
    const input = { email: "viewer@example.com", password: "long-secure-password", username: "viewer", birthDate: "1990-01-01", acceptTerms: true, acknowledgePrivacy: true, ageEligible: true };
    expect(signupSchema.safeParse(input).success).toBe(true);
    expect(signupSchema.safeParse({ ...input, birthDate: "2025-01-01" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...input, password: "short" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...input, password: "映".repeat(25) }).success).toBe(false);
    expect(signupSchema.safeParse({ ...input, username: "<script>" }).success).toBe(false);
  });
  it("accounts for birthdays in the age gate", () => {
    expect(ageAt(new Date("2013-10-15"), new Date("2026-10-14"))).toBe(12);
    expect(ageAt(new Date("2013-10-14"), new Date("2026-10-14"))).toBe(13);
  });
  it("stores only hashes of unpredictable invitation and verification tokens", () => {
    const a = randomToken(), b = randomToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(40);
    expect(hashToken(a)).not.toContain(a);
    expect(hashToken(a)).toHaveLength(64);
  });
  it("rejects cross-origin mutations and oversized messages", () => {
    expect(() => requireOrigin(new Request("http://localhost:3000/api/rooms", { headers: { origin: "https://attacker.example" } }))).toThrow();
    expect(() => requireOrigin(new Request("http://localhost:3000/api/rooms", { headers: { origin: "http://localhost:3000" } }))).not.toThrow();
    expect(messageSchema.safeParse({ body: " " }).success).toBe(false);
    expect(messageSchema.safeParse({ body: "x".repeat(1001) }).success).toBe(false);
  });
});
