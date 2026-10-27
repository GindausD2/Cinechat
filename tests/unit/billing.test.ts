import { afterEach, describe, expect, it, vi } from "vitest";
import { billingConfigured, stripeClient } from "@/lib/billing";
import { POST } from "@/app/api/billing/webhook/route";
afterEach(() => vi.unstubAllEnvs());
describe("free release payment isolation", () => {
  it("keeps all payments disabled even with complete test-provider credentials", () => {
    vi.stubEnv("BILLING_ENABLED", "true"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture"); vi.stubEnv("STRIPE_PRO_PRICE_ID", "price_fixture"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
    expect(billingConfigured()).toBe(false); expect(() => stripeClient()).toThrow("Payments and subscriptions are disabled");
  });
  it("still refuses live keys", () => { vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_fixture"); expect(() => stripeClient()).toThrow("Live charges are disabled"); });
  it("rejects all webhook processing without database or provider access", async () => { const response = await POST(); expect(response.status).toBe(503); expect((await response.json()).error).toContain("disabled"); });
});
