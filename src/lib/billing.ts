import Stripe from "stripe";
import { AppError } from "./security";
import { db } from "./db";
export function billingConfigured() { return process.env.BILLING_ENABLED === "true" && Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") && process.env.STRIPE_PRO_PRICE_ID && process.env.STRIPE_WEBHOOK_SECRET); }
export function stripeClient() {
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") || process.env.STRIPE_SECRET_KEY?.startsWith("rk_live_")) throw new AppError(503, "Live charges are disabled in CineChat V1.");
  if (!billingConfigured()) throw new AppError(503, "Billing is not configured. CineChat Free remains available.");
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}
export async function applyPaymentEvent(event: Stripe.Event) {
  if (event.livemode) throw new AppError(400, "Live payment events are not accepted.");
  const stripe = stripeClient();
  if (await db.paymentEvent.findUnique({ where: { id: event.id } })) return { duplicate: true };
  let subscription: Stripe.Subscription | null = null;
  if (event.type.startsWith("customer.subscription.")) subscription = await stripe.subscriptions.retrieve((event.data.object as Stripe.Subscription).id);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const id = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    if (id) subscription = await stripe.subscriptions.retrieve(id);
  }
  await db.$transaction(async tx => {
    const accepted = await tx.paymentEvent.createMany({ data: [{ id: event.id }], skipDuplicates: true });
    if (!accepted.count) return;
    if (subscription) {
      const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
      const row = await tx.subscription.findUnique({ where: { customerId } });
      const item = subscription.items.data.find(v => v.price.id === process.env.STRIPE_PRO_PRICE_ID);
      if (row && item) {
        const active = ["active", "trialing"].includes(subscription.status);
        const periodEnd = item.current_period_end;
        await tx.subscription.update({ where: { userId: row.userId }, data: { plan: active ? "PRO" : "FREE", status: subscription.status, stripeSubscriptionId: subscription.id, currentPeriodEnd: new Date(periodEnd * 1000), cancelAtPeriodEnd: subscription.cancel_at_period_end } });
      }
    }
    if (["invoice.paid", "invoice.payment_failed"].includes(event.type)) {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      const row = customerId ? await tx.subscription.findUnique({ where: { customerId } }) : null;
      if (row) await tx.payment.upsert({ where: { providerPaymentId: invoice.id }, create: { userId: row.userId, providerPaymentId: invoice.id, amount: event.type === "invoice.paid" ? invoice.amount_paid : invoice.amount_due, currency: invoice.currency, status: event.type === "invoice.paid" ? "paid" : "failed", receiptUrl: invoice.hosted_invoice_url }, update: { status: event.type === "invoice.paid" ? "paid" : "failed", amount: event.type === "invoice.paid" ? invoice.amount_paid : invoice.amount_due, receiptUrl: invoice.hosted_invoice_url } });
    }
  });
  return { processed: true };
}
