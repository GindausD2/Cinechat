import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { accountViaApi, emailLink, testPassword } from "./helpers";
import { hashToken } from "../../src/lib/security";
const db = new PrismaClient(), headers = { origin: "http://localhost:3000" };
test.afterAll(async () => db.$disconnect());

test("scheduled public premieres share one timeline across timezone contexts and recover after network disconnect", async ({ browser }) => {
  const contexts = await Promise.all(["America/New_York", "Asia/Tokyo"].map(timezoneId => browser.newContext({ timezoneId, reducedMotion: "reduce" })));
  const [host, guest] = await Promise.all(contexts.map(c => c.newPage())); const suffix = Date.now().toString(36); let id = "";
  try {
    await accountViaApi(host, `worldh_${suffix}`, { screeningAdmin: true }); await accountViaApi(guest, `worldg_${suffix}`);
    // A valid device can have the wrong wall clock. Join/reconnect must measure
    // server offset immediately, rather than seek using the browser clock.
    await contexts[1].addInitScript(() => { const now = Date.now.bind(Date); Date.now = () => now() + 120000; });
    const scheduledAt = new Date(Date.now() + 16000).toISOString();
    const response = await host.request.post("/api/rooms", { headers: { ...headers, "x-vercel-ip-country": "US" }, data: { title: "A worldwide premiere", movieId: "big-buck-bunny", visibility: "PUBLIC", capacity: 250, scheduledAt, theme: "blue" } });
    expect(response.ok()).toBe(true); id = (await response.json()).id;
    expect((await guest.request.post(`/api/rooms/${id}`, { headers: { ...headers, "x-vercel-ip-country": "GB" }, data: { action: "join" } })).ok()).toBe(true);
    for (const page of [host, guest]) { await page.goto(`/cinemas/${id}`); await expect(page.getByText(/Live & synchronized|Connected · Starts soon/)).toBeVisible(); }
    await expect(host.locator(`time[datetime="${scheduledAt}"]`).first()).toHaveAttribute("title", "America/New_York");
    await expect(guest.locator(`time[datetime="${scheduledAt}"]`).first()).toHaveAttribute("title", "Asia/Tokyo");
    expect(await host.locator(`time[datetime="${scheduledAt}"]`).first().textContent()).not.toBe(await guest.locator(`time[datetime="${scheduledAt}"]`).first().textContent());
    await expect(host.getByLabel("Chat message")).toHaveCount(0); await expect(guest.getByLabel("Chat message")).toHaveCount(0);
    await expect.poll(async () => (await db.cinemaRoom.findUniqueOrThrow({ where: { id } })).playing, { timeout: 25000 }).toBe(true);
    expect((await db.cinemaRoom.findUniqueOrThrow({ where: { id } })).playbackVersion).toBe(1);
    await expect.poll(() => guest.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(1);
    const positions = await Promise.all([host,guest].map(p => p.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime))); expect(Math.abs(positions[0] - positions[1])).toBeLessThan(1.5);
    await guest.getByRole("button", { name: "React 👏", exact: true }).click(); await expect(host.locator(".floating-reaction", { hasText: "👏" })).toBeVisible();
    await guest.reload(); await expect(guest.getByText("Live & synchronized")).toBeVisible();
    await expect.poll(async () => { const positions = await Promise.all([host,guest].map(p => p.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime))); return Math.abs(positions[0]-positions[1]); }, { timeout: 4000 }).toBeLessThan(1.5);
    await contexts[0].setOffline(true);
    await expect.poll(() => host.evaluate(() => navigator.onLine)).toBe(false);
    await expect(host.getByText("Live & synchronized")).toHaveCount(0);
    // Abrupt network loss may prevent a WebSocket close frame reaching the
    // server. Its 35-second ping deadline is shorter than the 45-second lease.
    await expect(guest.getByTestId("live-viewer-count")).toHaveText("1 watching", { timeout: 45000 });
    const before = await guest.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime);
    await expect.poll(() => guest.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(before + .6);
    await contexts[0].setOffline(false); await expect(host.getByText("Live & synchronized")).toBeVisible(); await expect(guest.getByTestId("live-viewer-count")).toHaveText("2 watching");
    await expect.poll(async () => { const positions = await Promise.all([host,guest].map(p => p.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime))); return Math.abs(positions[0]-positions[1]); }).toBeLessThan(1.5);
    expect((await host.request.post(`/api/rooms/${id}`, { headers, data: { action: "leave" } })).ok()).toBe(true);
    await expect(guest.getByTestId("live-viewer-count")).toHaveText("1 watching");
    const movie = await db.movie.findUniqueOrThrow({ where: { id: "big-buck-bunny" } });
    const finalFrame = await db.cinemaRoom.update({ where: { id }, data: { playing: true, position: movie.durationSeconds - .5, playbackUpdatedAt: new Date(), playbackVersion: { increment: 1 } } });
    await expect(guest.getByRole("heading", { name: "Intermission." })).toBeVisible();
    const finished = await db.cinemaRoom.findUniqueOrThrow({ where: { id } }); expect(finished.endedAt).not.toBeNull(); expect(finished.playbackVersion).toBe(finalFrame.playbackVersion + 1);
    expect((await (await guest.request.get("/api/rooms?type=public")).json()).rooms.some((room: { id: string }) => room.id === id)).toBe(false);
  } finally { await contexts[0].setOffline(false); if (id) await host.request.post(`/api/rooms/${id}`, { headers, data: { action: "end" } }); await Promise.all(contexts.map(c => c.close())); }
});

test("private links preserve login, allow valid-grant rejoin, and lose access when revoked or expired", async ({ browser }) => {
  const contexts = await Promise.all([1,2].map(() => browser.newContext())); const [host,guest] = await Promise.all(contexts.map(c => c.newPage()));
  const suffix = Date.now().toString(36), guestName = `grantg_${suffix}`; let id = "", secondId = "";
  try {
    const hostId = await accountViaApi(host, `granth_${suffix}`);
    await host.goto("/cinemas/new?type=private&movie=big-buck-bunny"); await host.getByLabel("Theater name").fill("Friends without a paywall"); await host.getByLabel("Theater atmosphere").selectOption("blue"); await host.getByRole("combobox", { name: /^Seats/ }).selectOption("12"); await host.getByLabel("Access code (optional)").fill("friends42");
    await host.getByRole("button", { name: "Create theater", exact: true }).click(); await expect(host.getByRole("dialog")).toBeVisible();
    id = new URL(host.url()).pathname.split("/").pop()!; await host.getByLabel("Guest limit").fill("1"); await host.getByLabel("Invitation expiry").selectOption("1"); const previousLink = await host.getByLabel("Invitation link").inputValue(); await host.getByRole("button", { name: "Generate new invitation" }).click(); await expect(host.getByLabel("Invitation link")).not.toHaveValue(previousLink);
    const link = await host.getByLabel("Invitation link").inputValue(), token = link.split("/").pop()!;
    await expect(host.getByRole("link", { name: "WhatsApp", exact: true })).toHaveAttribute("href", `https://wa.me/?text=${encodeURIComponent(`Join my CineChat screening: ${link}`)}`);
    await host.getByRole("button", { name: "Close dialog", exact: true }).click();
    expect(await db.subscription.findUnique({ where: { userId: hostId } })).toBeNull();
    const second = await host.request.post("/api/rooms", { headers, data: { title: "Another free private theater", movieId: "big-buck-bunny", visibility: "PRIVATE", capacity: 20, theme: "midnight" } }); expect(second.ok()).toBe(true); secondId = (await second.json()).id;
    expect((await host.request.post("/api/billing", { headers, data: { action: "checkout" } })).status()).toBe(503);
    await guest.goto(link); await guest.getByRole("main").getByRole("link", { name: "Sign in", exact: true }).click();
    await guest.getByRole("link", { name: "Create an account", exact: true }).click();
    await guest.getByLabel("Username", { exact: true }).fill(guestName); await guest.getByLabel("Date of birth").fill("1990-01-01"); await guest.getByLabel("Email address").fill(`${guestName}@example.com`); await guest.getByLabel("Password", { exact: true }).fill(testPassword); await guest.getByRole("button", { name: "Create account", exact: true }).click(); await expect(guest.getByRole("status")).toContainText("Account created");
    const verification = await emailLink(`${guestName}@example.com`, "Verify"); expect(new URL(verification).searchParams.get("returnTo")).toBe(`/invite/${token}`);
    await guest.goto(verification); await guest.getByRole("button", { name: "Verify email", exact: true }).click(); await expect(guest.getByRole("status")).toContainText("Email verified"); await guest.getByRole("link", { name: "Back to sign in", exact: true }).click();
    await guest.getByLabel("Email address").fill(`${guestName}@example.com`); await guest.getByLabel("Password", { exact: true }).fill(testPassword); await guest.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(guest).toHaveURL(link);
    await guest.getByLabel("Access code", { exact: true }).fill("friends42"); await guest.getByRole("button", { name: "Join screening", exact: true }).click(); await expect(guest.getByText("Live & synchronized")).toBeVisible();
    await guest.getByLabel("Chat message").fill("Only our invited friends can read this."); await guest.getByRole("button", { name: "Send message", exact: true }).click(); await expect(host.getByText("Only our invited friends can read this.", { exact: true })).toBeVisible();
    expect((await guest.request.get(`/api/rooms/${id}/invitations`)).status()).toBe(403);
    await guest.getByRole("button", { name: "Leave", exact: true }).click(); await expect(guest).toHaveURL("/cinemas"); await guest.goto(link); await expect(guest.getByLabel("Access code", { exact: true })).toHaveCount(0); await guest.getByRole("button", { name: "Join screening", exact: true }).click(); await expect(guest.getByText("Live & synchronized")).toBeVisible();
    const invitation = await db.invitation.findUniqueOrThrow({ where: { tokenHash: hashToken(token) } }); expect(invitation.uses).toBe(1); expect(invitation.maxUses).toBe(1);
    expect((await host.request.post(`/api/rooms/${id}`, { headers, data: { action: "revoke-invite", invitationId: invitation.id } })).ok()).toBe(true);
    await expect(guest.getByRole("heading", { name: "Intermission." })).toBeVisible(); expect((await guest.request.get(`/api/rooms/${id}`)).status()).toBe(404);
    expect((await (await guest.request.get("/api/rooms?type=private")).json()).rooms.some((room: { id: string }) => room.id === id)).toBe(false);
    expect((await guest.request.post(`/api/rooms/${id}`, { headers, data: { action: "join", token, accessCode: "friends42" } })).status()).toBe(403);
    const fresh = await (await host.request.post(`/api/rooms/${id}`, { headers, data: { action: "invite", maxUses: 1, expiryHours: 24 } })).json();
    expect((await guest.request.post(`/api/rooms/${id}`, { headers, data: { action: "join", token: fresh.url.split("/").pop(), accessCode: "friends42" } })).ok()).toBe(true);
    await guest.goto(`/cinemas/${id}`); await expect(guest.getByText("Live & synchronized")).toBeVisible();
    await db.invitation.update({ where: { id: fresh.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await guest.request.get(`/api/rooms/${id}`)).status()).toBe(404);
    expect((await guest.request.post(`/api/rooms/${id}`, { headers, data: { action: "join" } })).status()).toBe(404);
    await expect(guest.getByRole("heading", { name: "Intermission." })).toBeVisible({ timeout: 20000 });
  } finally { for (const room of [id,secondId].filter(Boolean)) await host.request.post(`/api/rooms/${room}`, { headers, data: { action: "end" } }); await Promise.all(contexts.map(c => c.close())); }
});
