import { describe, expect, it } from "vitest";
import { validInvitationGrant } from "@/lib/invitation-access";
import { safeReturnPath } from "@/lib/return-path";
describe("private access grant and invitation login destination", () => {
  it("rejects missing, expired, and revoked grants including the expiry boundary", () => {
    const now = Date.parse("2026-10-17T12:00:00Z");
    expect(validInvitationGrant(null, now)).toBe(false);
    expect(validInvitationGrant({ revoked: false, expiresAt: new Date(now) }, now)).toBe(false);
    expect(validInvitationGrant({ revoked: true, expiresAt: new Date(now + 1000) }, now)).toBe(false);
    expect(validInvitationGrant({ revoked: false, expiresAt: new Date(now + 1000) }, now)).toBe(true);
  });
  it("keeps invitation destinations and rejects redirects outside CineChat", () => {
    const path = "/invite/" + "a".repeat(43); expect(safeReturnPath(path)).toBe(path);
    for (const path of ["//evil.example", "/a/..//evil.example", "/%2e%2e//evil.example", "https://evil.example", "/\\evil", "/%5cevil", "/%2f%2fevil", "\n/evil", "javascript:alert(1)"]) expect(safeReturnPath(path)).toBe("/");
    expect(safeReturnPath(undefined)).toBe("/");
  });
});
