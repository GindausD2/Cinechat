import { AppError } from "./security";
// Legacy payment records remain untouched. No payment SDK is installed or called.
export function billingConfigured() { return false; }
export function stripeClient(): never {
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") || process.env.STRIPE_SECRET_KEY?.startsWith("rk_live_")) throw new AppError(503, "Live charges are disabled in CineChat V1.");
  throw new AppError(503, "CineChat is free. Payments and subscriptions are disabled.");
}
