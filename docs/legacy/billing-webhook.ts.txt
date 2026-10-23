import { applyPaymentEvent, stripeClient } from "@/lib/billing";
import { AppError } from "@/lib/security";
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 65536) return Response.json({ error: "Event too large." }, { status: 413 });
    const body = await request.text(); if (body.length > 65536) return Response.json({ error: "Event too large." }, { status: 413 });
    const signature = request.headers.get("stripe-signature"); if (!signature) return Response.json({ error: "Missing payment signature." }, { status: 400 });
    const stripe = stripeClient(); let event;
    try { event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!); } catch { return Response.json({ error: "Invalid payment signature." }, { status: 400 }); }
    return Response.json(await applyPaymentEvent(event));
  } catch (e) { return Response.json({ error: e instanceof AppError ? e.message : "Payment processing unavailable." }, { status: e instanceof AppError ? e.status : 503 }); }
}
