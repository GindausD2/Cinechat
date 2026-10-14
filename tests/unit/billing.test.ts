import { afterEach, describe, expect, it, vi } from "vitest";
import { billingConfigured, stripeClient } from "@/lib/billing";
import { POST } from "@/app/api/billing/webhook/route";
afterEach(() => vi.unstubAllEnvs());
describe("disabled live billing boundary", () => {
  it("rejects missing credentials even when a caller requests checkout", () => { vi.stubEnv("BILLING_ENABLED", "false"); expect(billingConfigured()).toBe(false); expect(() => stripeClient()).toThrow("Billing is not configured"); });
  it("rejects live keys even if someone enables billing", () => { vi.stubEnv("BILLING_ENABLED", "true"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_live_test_of_guard"); expect(() => stripeClient()).toThrow("Live charges are disabled"); });
  it("requires test key, price and signed webhook configuration", () => { vi.stubEnv("BILLING_ENABLED", "true"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture"); vi.stubEnv("STRIPE_PRO_PRICE_ID", "price_fixture"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture"); expect(billingConfigured()).toBe(true); expect(stripeClient()).toBeTruthy(); });
  it("rejects forged signatures without reaching subscription processing", async () => {
    vi.stubEnv("BILLING_ENABLED", "true"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture"); vi.stubEnv("STRIPE_PRO_PRICE_ID", "price_fixture"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
    const response = await POST(new Request("http://localhost:3000/api/billing/webhook", { method: "POST", body: '{"type":"checkout.session.completed"}', headers: { "stripe-signature": `t=${Math.floor(Date.now()/1000)},v1=invalid` } }));
    expect(response.status).toBe(400); expect((await response.json()).error).toBe("Invalid payment signature.");
  });
  it("rejects signed live events before any database or provider call", async () => {
    vi.stubEnv("BILLING_ENABLED", "true"); vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture"); vi.stubEnv("STRIPE_PRO_PRICE_ID", "price_fixture"); vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_fixture");
    const body = JSON.stringify({ id: "evt_fixture", type: "checkout.session.completed", livemode: true, data: { object: {} } });
    const signature = stripeClient().webhooks.generateTestHeaderString({ payload: body, secret: "whsec_fixture" });
    const response = await POST(new Request("http://localhost:3000/api/billing/webhook", { method: "POST", body, headers: { "stripe-signature": signature } }));
    expect(response.status).toBe(400); expect((await response.json()).error).toBe("Live payment events are not accepted.");
  });
});
