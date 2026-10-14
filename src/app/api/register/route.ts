import { hash } from "bcryptjs";
import { api, jsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { AppError, hashToken, randomToken } from "@/lib/security";
import { rateLimit } from "@/lib/redis";
import { mailAvailable, sendMail } from "@/lib/mail";
export const POST = api(async request => {
  const input = signupSchema.parse(await jsonBody(request));
  await rateLimit("register:global", 100, 3600);
  await rateLimit(`register:${hashToken(input.email)}`, 3, 3600);
  if (!mailAvailable()) throw new AppError(503, "Email delivery must be configured before registration.");
  const token = randomToken();
  const admin = (process.env.ADMIN_EMAILS || "").split(",").map(v => v.trim().toLowerCase()).includes(input.email);
  const user = await db.user.create({ data: {
    email: input.email, name: input.username, passwordHash: await hash(input.password, 12), role: admin ? "ADMIN" : "USER",
    profile: { create: { username: input.username, birthDate: input.birthDate } },
    subscription: { create: {} },
    tokens: { create: { kind: "verify", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 86400000) } }
  }});
  await sendMail(user.email, "Verify your CineChat account", `Welcome to CineChat. Confirm your email: ${process.env.APP_ORIGIN}/verify?token=${token}`);
  return { message: "Account created. Check your email to verify it before signing in." };
});
