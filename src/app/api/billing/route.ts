import { api } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { AppError } from "@/lib/security";
export const POST = api(async () => {
  await requireUser();
  throw new AppError(503, "CineChat is free. Payments and subscriptions are disabled.");
});
