// Legacy payment callbacks must never mutate accounts in the free release.
export async function POST() {
  return Response.json({ error: "Payments and subscriptions are disabled." }, { status: 503 });
}
