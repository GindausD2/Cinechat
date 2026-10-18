import { PrismaClient } from "@prisma/client";
import { expect, type Page } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
export const testPassword = "CineChat-test-password-42";
export async function accountViaApi(page: Page, username: string, options: { screeningAdmin?: boolean } = {}) {
  await page.goto("/login");
  const r = await page.request.post("/api/register", { headers: { origin: "http://localhost:3000" }, data: { email: `${username}@example.com`, password: testPassword, username, birthDate: "1990-01-01" } }); expect(r.ok()).toBe(true);
  const token = await emailToken(`${username}@example.com`, "Verify");
  const verified = await page.request.post("/api/account/email", { headers: { origin: "http://localhost:3000" }, data: { action: "verify", token } }); expect(verified.ok()).toBe(true);
  await page.getByLabel("Email address").fill(`${username}@example.com`); await page.getByLabel("Password", { exact: true }).fill(testPassword); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL("/");
  const profile = await page.request.get("/api/auth/session"); const id = (await profile.json()).user.id as string;
  // Fixture-only elevation: ordinary accounts stay ordinary unless a screening
  // specifically tests administrator-managed public playback.
  if (options.screeningAdmin) { const db = new PrismaClient(); try { await db.user.update({ where: { id }, data: { role: "ADMIN" } }); } finally { await db.$disconnect(); } }
  return id;
}
export async function emailLink(email: string, subject: string) {
  const directory = join(process.cwd(), ".data/outbox"); const files = await readdir(directory); let link = "";
  for (const f of files.sort()) { const m = JSON.parse(await readFile(join(directory, f), "utf8")); if (m.to === email && m.subject.includes(subject)) link = m.text.match(/http[^\s]+/)?.[0] || ""; }
  expect(link).toMatch(/^http:\/\/localhost:3000\//); return link;
}
export async function emailToken(email: string, subject: string) {
  const token = new URL(await emailLink(email, subject)).searchParams.get("token") || "";
  expect(token.length).toBeGreaterThan(32); return token;
}
