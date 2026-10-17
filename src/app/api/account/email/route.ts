import { z } from "zod";
import { hash } from "bcryptjs";
import { api, jsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { emailSchema, passwordSchema } from "@/lib/validation";
import { AppError, hashToken, randomToken } from "@/lib/security";
import { rateLimit } from "@/lib/redis";
import { sendMail } from "@/lib/mail";
export const POST = api(async request => {
  const input = z.discriminatedUnion("action", [
    z.object({ action: z.literal("verify"), token: z.string().min(32).max(100) }),
    z.object({ action: z.literal("reset"), token: z.string().min(32).max(100), password: passwordSchema }),
    z.object({ action: z.literal("request-reset"), email: emailSchema }),
    z.object({ action: z.literal("resend-verification"), email: emailSchema })
  ]).parse(await jsonBody(request));
  await rateLimit("email:global", 200, 3600);
  if (input.action === "request-reset" || input.action === "resend-verification") {
    await rateLimit(`email:${hashToken(input.email)}`, 4, 3600);
    const user = await db.user.findUnique({ where: { email: input.email } });
    if (user && !user.suspended && (input.action === "request-reset" || !user.emailVerified)) {
      const token = randomToken();
      const kind = input.action === "request-reset" ? "reset" : "verify";
      await db.authToken.create({ data: { userId: user.id, kind, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 3600000) } });
      await sendMail(user.email, kind === "reset" ? "Reset your CineChat password" : "Verify your CineChat account", `${process.env.APP_ORIGIN}/${kind === "reset" ? "reset-password" : "verify"}?token=${token}`);
    }
    return { message: "If an eligible account exists, an email has been sent." };
  }
  const kind = input.action;
  const passwordHash = input.action === "reset" ? await hash(input.password, 12) : undefined;
  await db.$transaction(async tx => {
    const row = await tx.authToken.findUnique({ where: { tokenHash: hashToken(input.token) } });
    if (!row || row.kind !== kind || row.expiresAt < new Date()) throw new AppError(400, "This link is invalid or expired.");
    await tx.authToken.delete({ where: { id: row.id } });
    await tx.user.update({ where: { id: row.userId }, data: input.action === "verify" ? { emailVerified: new Date() } : { passwordHash, authVersion: { increment: 1 } } });
    if (input.action === "reset") {
      await tx.authToken.deleteMany({ where: { userId: row.userId, kind: "reset" } });
      await tx.realtimeTicket.deleteMany({ where: { userId: row.userId } });
    }
  });
  return { message: input.action === "verify" ? "Email verified. You can sign in." : "Password updated. Please sign in again." };
});
