import { describe, expect, it } from "vitest";
import { canManageTheater, screeningStatus } from "../../src/lib/theater-policy";

describe("theater control permissions", () => {
  it("rejects ordinary public viewers including a historical non-admin host", () => {
    expect(canManageTheater({ visibility: "PUBLIC", hostId: "host" }, { id: "host", role: "USER" })).toBe(false);
    expect(canManageTheater({ visibility: "PUBLIC", hostId: "host" }, { id: "moderator", role: "ADMIN" })).toBe(true);
  });
  it("keeps private control with the host, including when another member is an administrator", () => {
    expect(canManageTheater({ visibility: "PRIVATE", hostId: "host" }, { id: "host", role: "USER" })).toBe(true);
    expect(canManageTheater({ visibility: "PRIVATE", hostId: "host" }, { id: "moderator", role: "ADMIN" })).toBe(false);
  });
  it("prioritizes ended/unavailable states over a misleading live schedule", () => {
    const now = new Date("2026-10-18T12:00:00Z"), scheduledAt = new Date(now.getTime() + 60000);
    expect(screeningStatus({ endedAt: now, scheduledAt }, true, now)).toBe("Ended");
    expect(screeningStatus({ endedAt: null, scheduledAt }, false, now)).toBe("Unavailable");
    expect(screeningStatus({ endedAt: null, scheduledAt }, true, now)).toBe("Upcoming");
    expect(screeningStatus({ endedAt: null, scheduledAt: now }, true, now)).toBe("Live");
  });
});
