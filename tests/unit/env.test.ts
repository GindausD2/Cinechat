import { afterEach, expect, it, vi } from "vitest";
import { requiredSecret } from "@/lib/env";
afterEach(() => vi.unstubAllEnvs());
it("rejects missing, short and template authentication secrets", () => {
  vi.stubEnv("AUTH_SECRET", ""); expect(() => requiredSecret("AUTH_SECRET")).toThrow();
  vi.stubEnv("AUTH_SECRET", "short"); expect(() => requiredSecret("AUTH_SECRET")).toThrow();
  vi.stubEnv("AUTH_SECRET", "replace-with-at-least-32-random-characters"); expect(() => requiredSecret("AUTH_SECRET")).toThrow();
  vi.stubEnv("AUTH_SECRET", "this-is-a-fixture-secret-used-only-in-unit-tests"); expect(requiredSecret("AUTH_SECRET")).toContain("fixture");
});
