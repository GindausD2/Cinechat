import { test, expect, type Page } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const password = "CineChat-test-password-42";
async function register(page: Page, username: string) {
  await page.goto("/register");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Date of birth").fill("1990-01-01");
  await page.getByLabel("Email address").fill(`${username}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText("Account created");
  const directory = join(process.cwd(), ".data/outbox");
  const files = await readdir(directory);
  let url = "";
  for (const file of files) { const email = JSON.parse(await readFile(join(directory, file), "utf8")); if (email.to === `${username}@example.com` && email.subject.includes("Verify")) url = email.text.match(/http[^\s]+/)?.[0] || ""; }
  expect(url).toContain("/verify?token=");
  await page.goto(url); await page.getByRole("button", { name: "Verify email" }).click(); await expect(page.getByRole("status")).toContainText("Email verified");
  await page.goto("/login"); await page.getByLabel("Email address").fill(`${username}@example.com`); await page.getByLabel("Password", { exact: true }).fill(password); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL("/");
}
test("two viewers register, discover, invite, synchronize, chat, react, and rejoin", async ({ browser }) => {
  const suffix = Date.now().toString(36);
  const hostContext = await browser.newContext(), guestContext = await browser.newContext(); const host = await hostContext.newPage(), guest = await guestContext.newPage();
  await register(host, `host_${suffix}`); await register(guest, `guest_${suffix}`);
  await host.goto("/movies"); await host.getByRole("textbox", { name: "Search movies" }).fill("Big Buck"); await expect(host.locator(".movie-card")).toHaveCount(1); await host.locator(".movie-card").click(); await expect(host.getByRole("heading", { name: "Big Buck Bunny", exact: true })).toBeVisible();
  await host.getByRole("button", { name: "Add to My List", exact: true }).click(); await expect(host.getByRole("button", { name: "In My List" })).toBeVisible();
  await host.goto("/cinemas/new?movie=big-buck-bunny"); await host.getByRole("button", { name: "Private screening" }).click(); await host.getByLabel("Cinema title").fill("Acceptance private screening"); await host.getByLabel("Access code (optional)").fill("secret42"); await host.getByRole("button", { name: "Create your cinema" }).click(); await expect(host.getByText("Live & synchronized")).toBeVisible();
  const roomUrl = host.url(); const roomId = roomUrl.split("/").pop()!;
  const unauthorized = await guest.request.get(`/api/rooms/${roomId}`); expect(unauthorized.status()).toBe(404);
  const publicRooms = await guest.request.get("/api/rooms"); expect(JSON.stringify(await publicRooms.json())).not.toContain(roomId);
  await host.getByRole("button", { name: "Invite", exact: true }).click(); await expect(host.getByRole("dialog")).toBeVisible(); await expect(host.getByLabel("Invitation link")).toHaveValue(/^http/); const invitation = await host.getByLabel("Invitation link").inputValue(); await host.getByRole("button", { name: "Close dialog" }).click();
  await guest.goto(invitation); await guest.getByLabel("Access code", { exact: true }).fill("wrong-code"); await guest.getByRole("button", { name: "Join screening" }).click(); await expect(guest.locator(".error-message[role=alert]")).toContainText("incorrect"); await guest.getByLabel("Access code", { exact: true }).fill("secret42"); await guest.getByRole("button", { name: "Join screening" }).click(); await expect(guest.getByText("Live & synchronized")).toBeVisible();
  await expect(host.getByTestId("cinema-video")).toHaveJSProperty("readyState", 4);
  await host.getByRole("button", { name: "Play film", exact: true }).last().click();
  await expect.poll(() => host.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(1);
  await expect.poll(() => guest.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(1);
  const times = await Promise.all([host,guest].map(p => p.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime))); expect(Math.abs(times[0]-times[1])).toBeLessThan(1.5);
  await guest.getByLabel("Chat message").fill("Hello from the other screen!"); await guest.getByRole("button", { name: "Send message" }).click(); await expect(host.getByText("Hello from the other screen!", { exact: true })).toBeVisible();
  await guest.getByRole("button", { name: "React ❤️", exact: true }).click(); await expect(host.locator(".live-reactions")).toContainText("❤️");
  await host.getByRole("button", { name: "Pause film", exact: true }).click(); await expect(guest.getByTestId("cinema-video")).toHaveJSProperty("paused", true);
  const paused = await guest.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime); expect(paused).toBeGreaterThan(1);
  await guest.getByRole("button", { name: "Leave", exact: true }).click(); await expect(guest).toHaveURL("/cinemas"); await guest.goto(roomUrl); await guest.getByRole("button", { name: "Join screening" }).click(); await expect(guest.getByText("Live & synchronized")).toBeVisible();
  await expect.poll(async () => Math.abs(await guest.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime) - paused)).toBeLessThan(1.5);
  await host.getByRole("button", { name: "Play film", exact: true }).last().click(); await expect.poll(() => guest.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(paused + .5);
  await guest.reload(); await expect(guest.getByText("Live & synchronized")).toBeVisible(); await expect.poll(() => guest.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(paused + .5);
  const hostOnly = await guest.request.post(`/api/rooms/${roomId}`, { headers: { origin: "http://localhost:3000" }, data: { action: "end" } }); expect(hostOnly.status()).toBe(403);
  await host.getByRole("button", { name: "End screening", exact: true }).click(); await expect(host).toHaveURL("/cinemas");
  await hostContext.close(); await guestContext.close();
});
test("public discovery is responsive and has no horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/"); await expect(page.getByRole("heading", { level: 1, name: /Big Buck/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/home-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto("/"); await page.screenshot({ path: "test-results/home-desktop.png", fullPage: true });
});
