import { describe, expect, it } from "vitest";
import { currentPosition, driftCorrection, playbackSnapshot } from "@/lib/playback";
describe("server-authoritative playback math", () => {
  const state = { playing: true, position: 10, playbackUpdatedAt: new Date(1000), playbackVersion: 7 };
  it("advances for late joiners, clamps duration and ignores negative clock deltas", () => {
    expect(currentPosition(state, 100, 6000)).toBe(15);
    expect(currentPosition(state, 12, 6000)).toBe(12);
    expect(currentPosition(state, 100, 0)).toBe(10);
    expect(currentPosition({ ...state, playing: false }, 100, 6000)).toBe(10);
  });
  it("provides a timestamped versioned snapshot and stops at film end", () => {
    expect(playbackSnapshot(state, 12, 6000)).toEqual({ playing: false, position: 12, version: 7, duration: 12, serverTime: 6000 });
  });
  it("seeks large drift and gently corrects small drift", () => {
    expect(driftCorrection(10, 15)).toEqual({ seek: 15, rate: 1 });
    expect(driftCorrection(10, 10.6).rate).toBe(1.03);
    expect(driftCorrection(10, 9.4).rate).toBe(.97);
    expect(driftCorrection(10, 10.1).rate).toBe(1);
  });
});
