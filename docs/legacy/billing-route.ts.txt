import { z } from "zod";
import { api, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { stripeClient } from "@/lib/billing";
import { rateLimit } from "@/lib/redis";
import { AppError } from "@/lib/security";
export const POST = api(async request => {
  const user = await requireUser(); await rateLimit(`billing:${user.id}`, 5, 60);
  const { action } = z.object({ action: z.enum(["checkout", "portal", "cancel"]) }).parse(await jsonBody(request));
  const stripe = stripeClient(); const origin = process.env.APP_ORIGIN!;
  let subscription = user.subscription;
  if (action === "cancel") {
    if (!subscription?.stripeSubscriptionId) throw new AppError(404, "No paid subscription to cancel.");
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, { cancel_at_period_end: true });
    await db.subscription.update({ where: { userId: user.id }, data: { cancelAtPeriodEnd: true } }); return { canceled: true, message: "Your plan will end at the current billing period." };
  }
  if (action === "portal") {
    if (!subscription?.customerId) throw new AppError(404, "No billing account exists yet.");
    const portal = await stripe.billingPortal.sessions.create({ customer: subscription.customerId, return_url: `${origin}/billing` }); return { url: portal.url };
  }
  if (subscription?.plan === "PRO" && ["active", "trialing"].includes(subscription.status)) throw new AppError(409, "You already have Pro. Manage your current plan in billing settings.");
  if (!subscription?.customerId) {
    const customer = await stripe.customers.create({ email: user.email, metadata: { cinechatUserId: user.id } }, { idempotencyKey: `cinechat-customer-${user.id}` });
    subscription = await db.subscription.upsert({ where: { userId: user.id }, create: { userId: user.id, customerId: customer.id }, update: { customerId: customer.id } });
  }
  const price = await stripe.prices.retrieve(process.env.STRIPE_PRO_PRICE_ID!);
  if (!price.active || price.livemode || !price.recurring) throw new AppError(503, "A valid Stripe test subscription price is required.");
  const session = await stripe.checkout.sessions.create({ mode: "subscription", customer: subscription.customerId!, line_items: [{ price: price.id, quantity: 1 }], success_url: `${origin}/billing?checkout=success`, cancel_url: `${origin}/billing`, client_reference_id: user.id, subscription_data: { metadata: { cinechatUserId: user.id } } }, { idempotencyKey: `cinechat-checkout-${user.id}-${Math.floor(Date.now()/60000)}` });
  return { url: session.url };
});
