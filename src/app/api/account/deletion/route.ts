import { z } from "zod";
import { api, jsonBody } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { rateLimit } from "@/lib/redis";
import { AppError } from "@/lib/security";
import { requestAccountDeletion } from "@/lib/account-deletion";

export const POST = api(async request => {
  const user = await requireUser();
  await rateLimit(`delete-request:${user.id}`, 3, 3600);
  const { confirmEmail } = z.object({ confirmEmail: z.email().max(254) }).parse(await jsonBody(request));
  if (confirmEmail.toLowerCase() !== user.email.toLowerCase()) throw new AppError(400, "Type your account email to request deletion.");
  return requestAccountDeletion(user);
});
