import { afterEach, expect, it, vi } from "vitest";
import { realtimeTicket, verifyRealtimeTicket } from "@/lib/realtime-auth";
afterEach(() => vi.unstubAllEnvs());
it("signs real-time credentials and rejects modified or unsigned credentials", () => {
  vi.stubEnv("REALTIME_SECRET", "a-very-long-test-secret-for-cinechat-only"); const token = realtimeTicket();
  expect(verifyRealtimeTicket(token)).toBe(true);
  expect(verifyRealtimeTicket(token + "extra")).toBe(false);
  expect(verifyRealtimeTicket("unsigned")).toBe(false);
  expect(verifyRealtimeTicket("a".repeat(151))).toBe(false);
});
