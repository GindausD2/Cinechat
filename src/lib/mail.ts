import nodemailer from "cinechat-mailer";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { AppError } from "./security";
export function mailAvailable() {
  return Boolean(process.env.SMTP_URL || (process.env.NODE_ENV !== "production" && process.env.EMAIL_DEV_OUTBOX === "true"));
}
export async function sendMail(to: string, subject: string, text: string) {
  if (process.env.SMTP_URL) {
    await nodemailer.createTransport(process.env.SMTP_URL).sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
    return;
  }
  if (process.env.NODE_ENV !== "production" && process.env.EMAIL_DEV_OUTBOX === "true") {
    const directory = join(process.cwd(), ".data", "outbox");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(join(directory, `${Date.now()}-${randomUUID()}.json`), JSON.stringify({ to, subject, text }), { mode: 0o600 });
    return;
  }
  throw new AppError(503, "Email delivery is not configured. Please contact the operator.");
}
