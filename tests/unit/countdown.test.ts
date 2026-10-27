import { describe, expect, it } from "vitest";
import { screeningCountdown } from "../../src/lib/countdown";

describe("server-timed screening countdown", () => {
  const now = Date.parse("2026-10-24T12:00:00Z");
  it("rounds up the last second and never emits a negative countdown", () => {
    expect(screeningCountdown(new Date(now + 1), now)).toEqual({ remaining: 1, text: "0m 01s" });
    expect(screeningCountdown(new Date(now - 1000), now)?.remaining).toBe(0);
  });
  it("uses the supplied authoritative clock across timezones and long waits", () => {
    expect(screeningCountdown("2026-10-24T22:02:03+09:00", now)?.text).toBe("1h 2m 03s");
    expect(screeningCountdown(new Date(now + 90061000), now)?.text).toBe("1d 1h 1m");
  });
  it("ignores invalid dates and missing server samples", () => {
    expect(screeningCountdown("invalid", now)).toBeNull();
    expect(screeningCountdown(new Date(now), NaN)).toBeNull();
  });
});
