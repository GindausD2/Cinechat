import "dotenv/config";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PrismaClient } from "@prisma/client";
import { io, type Socket } from "socket.io-client";
import { randomUUID } from "node:crypto";
import { accountViaApi, emailToken, emailLinks, testPassword } from "./helpers";
import { runPrivacyMaintenance } from "../../src/lib/privacy-maintenance";
import { db as maintenanceDb } from "../../src/lib/db";
import { hashToken } from "../../src/lib/security";
const headers = { origin: "http://localhost:3000" };
function emit(socket: Socket, name: string, value: unknown) { return new Promise<{ ok: boolean; status?: number }>(resolve => socket.timeout(8000).emit(name, value, (error: Error | null, result: { ok: boolean; status?: number }) => resolve(error ? { ok: false, status: 503 } : result))); }

test("registration acknowledgements are explicit, versioned and free of optional marketing", async ({ page }) => {
 const db = new PrismaClient(); const username = `ack${Date.now()}`;
 try {
  await page.goto("/register");
  for (const name of ["acceptTerms", "acknowledgePrivacy", "ageEligible"]) await expect(page.locator(`input[name="${name}"]`)).not.toBeChecked();
  const input = { email: `${username}@example.com`, username, password: testPassword, birthDate: "1990-01-01" };
  expect((await page.request.post("/api/register", { headers, data: input })).status()).toBe(400);
  expect((await page.request.post("/api/register", { headers, data: { ...input, acceptTerms: true, acknowledgePrivacy: false, ageEligible: true } })).status()).toBe(400);
  expect(await db.user.findUnique({ where: { email: input.email } })).toBeNull();
  const id = await accountViaApi(page, username);
  const freshProfile = await db.profile.findUniqueOrThrow({ where: { userId: id } }); expect(freshProfile.publicProfile).toBe(false); expect(freshProfile.allowFriendRequests).toBe(false);
  const records = await db.policyAcceptance.findMany({ where: { userId: id } }); expect(records).toHaveLength(1); expect(records[0].version).toBe("2026-10-22");
  const repeated = await page.request.post("/api/account/policies", { headers, data: { acceptTerms: true, acknowledgePrivacy: true, ageEligible: true } }); expect(repeated.ok()).toBe(true);
  expect(await db.policyAcceptance.count({ where: { userId: id } })).toBe(1);
  const cookies = await page.context().cookies(); const session = cookies.find(v => v.name === "authjs.session-token"); expect(session?.httpOnly).toBe(true); expect(session?.sameSite).toBe("Lax"); expect(session!.expires * 1000 - Date.now()).toBeLessThanOrEqual(14 * 86400000);
  for (const path of ["/legal/privacy", "/legal/terms", "/legal/cookies", "/legal/refunds", "/legal/safety", "/contact"]) {
   await page.goto(path); await expect(page.locator("main h1")).toBeVisible();
   expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
  }
 } finally { await db.$disconnect(); }
});

test("external images stay blocked until an informed choice, which can be rejected, changed and expired", async ({ page }) => {
 const username = `img${Date.now()}`;
 await accountViaApi(page, username);
 const requests: { cookie?: string; referer?: string }[] = [];
 await page.route("https://images.example.test/avatar.png", async route => {
  const h = route.request().headers(); requests.push({ cookie: h.cookie, referer: h.referer });
  await route.fulfill({ status: 200, headers: { "Content-Type": "image/png", "Access-Control-Allow-Origin": "*", "Set-Cookie": "image_tracker=blocked; SameSite=None; Secure" }, body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aFwAAAABJRU5ErkJggg==", "base64") });
 });
 expect((await page.request.patch("/api/account", { headers, data: { username, biography: "", image: "https://images.example.test/avatar.png", publicProfile: true, showActivity: false, allowFriendRequests: true } })).ok()).toBe(true);
 await page.goto(`/profile/${username}`); const banner = page.getByRole("complementary", { name: "Optional image privacy choices" }); await expect(banner).toBeVisible(); expect(requests).toHaveLength(0);
 await banner.getByRole("button", { name: "Reject optional images" }).click(); await page.reload(); await expect(banner).toHaveCount(0); expect(requests).toHaveLength(0);
 const preferenceButton = page.getByRole("button", { name: "Cookie preferences", exact: true }).first();
 await preferenceButton.focus(); await page.keyboard.press("Enter"); const dialog = page.getByRole("dialog", { name: "Cookie & privacy preferences" }); await expect(dialog).toBeVisible(); await expect(dialog.getByRole("checkbox", { name: "Allow external images" })).not.toBeChecked();
 for (const width of [1440, 390]) for (const theme of ["dark", "light"]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 }); await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
  await page.screenshot({ path: `test-results/trust/cookie-${width}-${theme}.png`, fullPage: true });
 }
 await page.keyboard.press("Escape"); await expect(dialog).not.toBeVisible(); await expect(preferenceButton).toBeFocused();
 await preferenceButton.click(); await dialog.getByRole("checkbox", { name: "Allow external images" }).check(); await dialog.getByRole("button", { name: "Save preferences" }).click(); await expect.poll(() => requests.length).toBeGreaterThan(0);
 for (const request of requests) { expect(request.cookie).toBeUndefined(); expect(request.referer).toBeUndefined(); }
 expect((await page.context().cookies("https://images.example.test")).some(c => c.name === "image_tracker")).toBe(false);
 await preferenceButton.click(); await dialog.getByRole("button", { name: "Reject optional images" }).click(); const count = requests.length; await page.reload(); expect(requests.length).toBe(count);
 await page.evaluate(() => { const data = JSON.parse(localStorage.getItem("cinechat-cookie-preferences")!); data.updatedAt = Date.now() - 181 * 86400000; data.expiresAt = Date.now() - 86400000; data.externalImages = true; localStorage.setItem("cinechat-cookie-preferences", JSON.stringify(data)); });
 await page.reload(); await expect(banner).toBeVisible(); expect(requests.length).toBe(count);
 await banner.getByRole("button", { name: "Accept optional images" }).click(); await expect.poll(() => requests.length).toBeGreaterThan(count);
 await preferenceButton.click(); await dialog.getByRole("link", { name: "Read the Cookie Policy" }).click(); await expect(page).toHaveURL("/legal/cookies"); await expect(dialog).not.toBeVisible();
});

test("public presence and reactions minimize identity, protect younger users and allow leaving despite network failure", async ({ browser }) => {
 const db = new PrismaClient(), hostContext = await browser.newContext(), guestContext = await browser.newContext(), teenContext = await browser.newContext();
 const host = await hostContext.newPage(), guest = await guestContext.newPage(), teen = await teenContext.newPage(); let socket: Socket | undefined;
 const suffix = Date.now(); const teenName = `teen${suffix}`;
 try {
  const hostId = await accountViaApi(host, `safehost${suffix}`, { screeningAdmin: true }); const guestId = await accountViaApi(guest, `safeview${suffix}`); const teenId = await accountViaApi(teen, teenName, { birthDate: `${new Date().getUTCFullYear() - 16}-01-01` });
  const teenProfile = await db.profile.findUniqueOrThrow({ where: { userId: teenId } }); expect(teenProfile.publicProfile).toBe(false); expect(teenProfile.showActivity).toBe(false); expect(teenProfile.allowFriendRequests).toBe(false);
  expect((await teen.request.patch("/api/account", { headers, data: { username: teenName, biography: "", publicProfile: true, showActivity: true, allowFriendRequests: true } })).status()).toBe(400);
  expect((await teen.request.patch("/api/account", { headers, data: { username: teenName, biography: "", birthDate: "1990-01-01", publicProfile: false, showActivity: false, allowFriendRequests: false } })).status()).toBe(400);
  expect((await host.request.post("/api/community", { headers, data: { action: "request", targetId: teenId } })).status()).toBe(403);
  await db.profile.update({ where: { userId: teenId }, data: { publicProfile: true, showActivity: true } }); // Legacy unsafe flags must not bypass fresh age checks.
  expect((await host.request.get(`/profile/${teenName}`)).status()).toBe(404);
  const created = await host.request.post("/api/rooms", { headers, data: { title: "Privacy screening", movieId: "big-buck-bunny", visibility: "PUBLIC", capacity: 8 } }); expect(created.ok()).toBe(true); const { id: roomId } = await created.json();
  for (const page of [host, guest, teen]) { expect((await page.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join" } })).ok()).toBe(true); await page.goto(`/cinemas/${roomId}`); await expect(page.getByText("Live & synchronized")).toBeVisible(); }
  const publicState = await (await guest.request.get(`/api/rooms/${roomId}`)).json(); expect(publicState.participants.map((v: { id: string }) => v.id)).toEqual([guestId]); expect(publicState.messages).toEqual([]);
  const moderatorState = await (await host.request.get(`/api/rooms/${roomId}`)).json(); expect(moderatorState.participants.map((v: { id: string }) => v.id)).toEqual(expect.arrayContaining([hostId, guestId, teenId]));
  const ticket = await (await guest.request.post("/api/realtime-ticket", { headers })).json(); socket = io("http://localhost:3001", { transports: ["websocket"], auth: { ticket: ticket.ticket }, extraHeaders: headers });
  await new Promise<void>(resolve => socket!.once("connect", resolve)); let presence = { count: 0, ids: [] as string[] }; const reactions: Record<string, unknown>[] = [];
  socket.on("presence", value => { presence = value; }); socket.on("reaction", value => reactions.push(value)); expect((await emit(socket, "join", { roomId })).ok).toBe(true);
  await expect.poll(() => presence.count).toBe(3); expect(presence.ids).toEqual([]);
  expect((await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "reaction", emoji: "🔥" } })).ok()).toBe(true); await expect.poll(() => reactions.length).toBe(1); expect(reactions[0]).not.toHaveProperty("userId");
  expect(await db.reaction.count({ where: { roomId } })).toBe(0);
  expect((await emit(socket, "message", { body: "No public text" })).status).toBe(403);
  socket.disconnect();
  await guestContext.setOffline(true); await guest.getByRole("button", { name: "Leave", exact: true }).click(); await expect(guest.getByTestId("cinema-video")).toHaveCount(0); await expect(guest.getByText("You left this theater.")).toBeVisible(); await guestContext.setOffline(false);
  await db.roomMembership.update({ where: { roomId_userId: { roomId, userId: guestId } }, data: { lastSeenAt: new Date(Date.now() - 60000) } });
  expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "leave" } })).ok()).toBe(true); expect((await db.roomMembership.findUniqueOrThrow({ where: { roomId_userId: { roomId, userId: guestId } } })).status).toBe("LEFT");
 } finally { socket?.disconnect(); await hostContext.close(); await guestContext.close(); await teenContext.close(); await db.$disconnect(); }
});

test("email-confirmed deletion works without a password, rejects stolen/expired/revoked links and removes shared access", async ({ browser }) => {
 const db = new PrismaClient(), a = await browser.newContext(), b = await browser.newContext(); const owner = await a.newPage(), guest = await b.newPage(); const suffix = Date.now(), ownerName = `delete${suffix}`, guestName = `kept${suffix}`;
 try {
  const ownerId = await accountViaApi(owner, ownerName), guestId = await accountViaApi(guest, guestName);
  const { id: roomId } = await (await owner.request.post("/api/rooms", { headers, data: { title: "Deletion test theater", movieId: "big-buck-bunny", visibility: "PRIVATE", capacity: 4 } })).json();
  const invitation = await (await owner.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "invite" } })).json();
  expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join", token: new URL(invitation.url).pathname.split("/").pop() } })).ok()).toBe(true);
  for (const page of [owner, guest]) { await page.goto(`/cinemas/${roomId}`); await expect(page.getByText("Live & synchronized")).toBeVisible(); }
  await owner.getByLabel("Chat message").fill("Remove my message text"); await owner.getByRole("button", { name: "Send message", exact: true }).click(); await expect(guest.getByText("Remove my message text", { exact: true })).toBeVisible();
  await owner.getByRole("button", { name: `Delete message by ${ownerName}` }).click(); await expect(guest.getByText("Remove my message text", { exact: true })).toHaveCount(0); const deleted = await db.chatMessage.findFirstOrThrow({ where: { roomId, userId: ownerId } }); expect(deleted.deleted).toBe(true); expect(deleted.body).toBe("");
  await guest.getByLabel("Chat message").fill("Another member private text"); await guest.getByRole("button", { name: "Send message", exact: true }).click(); await expect(owner.getByText("Another member private text", { exact: true })).toBeVisible();
  const portable = await owner.request.get("/api/account/data"); expect(portable.ok()).toBe(true); expect(portable.headers()["cache-control"]).toBe("no-store"); expect(portable.headers()["content-disposition"]).toContain("attachment"); const body = await portable.text(); expect(body).not.toContain("Another member private text"); expect(body).not.toMatch(/passwordHash|tokenHash|access_token/);
  const outbound = await db.notification.create({ data: { userId: guestId, actorId: ownerId, type: "follow", title: "Account deletion fixture", href: "/community" } });
  const audit = await db.moderationAction.create({ data: { actorId: guestId, targetId: ownerId, action: "room:mute", reason: "Deletion verification" } });
  await db.user.update({ where: { id: ownerId }, data: { passwordHash: null } }); // OAuth-only credential state; Google itself is not mocked as verified.
  const ownerEmail = `${ownerName}@example.com`;
  const requestLink = () => owner.request.post("/api/account/deletion", { headers, data: { confirmEmail: ownerEmail } });
  await owner.goto("/settings"); await owner.getByRole("button", { name: "Delete account", exact: true }).click(); const deletionDialog = owner.getByRole("dialog", { name: "Delete your account?" });
  await expect(deletionDialog.getByLabel("Password", { exact: true })).toHaveCount(0); await deletionDialog.getByLabel("Confirm your email").fill(ownerEmail); await deletionDialog.getByRole("button", { name: "Email deletion confirmation" }).click(); await expect(deletionDialog.getByRole("status")).toContainText("Nothing is deleted");
  const expired = await emailToken(ownerEmail, "deletion"); expect(await db.authToken.findUnique({ where: { tokenHash: expired } })).toBeNull();
  expect((await guest.request.delete("/api/account", { headers, data: { confirmEmail: `${guestName}@example.com`, token: expired } })).status()).toBe(400);
  await db.authToken.update({ where: { tokenHash: hashToken(expired) }, data: { expiresAt: new Date(Date.now() - 1000) } });
  expect((await owner.request.delete("/api/account", { headers, data: { confirmEmail: ownerEmail, token: expired } })).status()).toBe(400);
  const parallelRequests = await Promise.all([requestLink(), requestLink()]); expect(parallelRequests.every(result => result.ok())).toBe(true);
  const surviving = await db.authToken.findMany({ where: { userId: ownerId, kind: "delete" } }); expect(surviving).toHaveLength(1);
  const candidates = (await emailLinks(ownerEmail, "deletion")).filter(link => new URL(link).searchParams.get("token") !== expired);
  const finalLink = candidates.find(link => hashToken(new URL(link).searchParams.get("token")!) === surviving[0].tokenHash)!;
  const revoked = new URL(candidates.find(link => link !== finalLink)!).searchParams.get("token"); expect(finalLink).toBeTruthy();
  expect((await owner.request.delete("/api/account", { headers, data: { confirmEmail: ownerEmail, token: revoked } })).status()).toBe(400); expect((await requestLink()).status()).toBe(429);
  await owner.goto(finalLink); expect(await db.user.count({ where: { id: ownerId } })).toBe(1); await owner.getByLabel("Confirm your email").fill(ownerEmail); await owner.getByRole("button", { name: "Permanently delete account" }).click(); await expect(owner).toHaveURL("/account-deleted");
  expect(await db.user.count({ where: { id: ownerId } })).toBe(0); expect(await db.policyAcceptance.count({ where: { userId: ownerId } })).toBe(0); expect(await db.chatMessage.count({ where: { roomId } })).toBe(0); expect(await db.authToken.count({ where: { userId: ownerId } })).toBe(0); expect(await db.realtimeTicket.count({ where: { userId: ownerId } })).toBe(0);
  expect(await db.notification.findUnique({ where: { id: outbound.id } })).toBeNull(); expect(await db.moderationAction.findUnique({ where: { id: audit.id } })).toBeNull();
  await expect(guest.getByRole("heading", { name: "Intermission." })).toBeVisible(); expect((await guest.request.get(`/api/rooms/${roomId}`)).status()).toBe(404); expect(await db.user.count({ where: { id: guestId } })).toBe(1);
 } finally { await a.close(); await b.close(); await db.$disconnect(); }
});

test("privacy maintenance removes expired credentials and old reaction metadata while preserving active chat and legacy records", async ({ page }) => {
 const db = new PrismaClient(); const userId = await accountViaApi(page, `retained${Date.now()}`); const past = new Date(Date.now() - 172800000), future = new Date(Date.now() + 3600000); const marker = randomUUID();
 try {
  const { id: roomId } = await (await page.request.post("/api/rooms", { headers, data: { title: "Retention verification", movieId: "big-buck-bunny", visibility: "PRIVATE", capacity: 4 } })).json();
  const old = await db.authToken.create({ data: { userId, kind: "reset", tokenHash: hashToken(`old-${marker}`), expiresAt: past } }); const current = await db.authToken.create({ data: { userId, kind: "reset", tokenHash: hashToken(`current-${marker}`), expiresAt: future } });
  const floating = await db.reaction.create({ data: { userId, roomId, emoji: "🔥", createdAt: past } });
  const deleted = await db.chatMessage.create({ data: { userId, roomId, deleted: true, body: "Legacy deleted body" } }); const active = await db.chatMessage.create({ data: { userId, roomId, body: "Keep active private history" } }); const like = await db.reaction.create({ data: { userId, roomId, messageId: active.id, emoji: "❤️", createdAt: past } });
  const link = await db.account.create({ data: { userId, type: "oidc", provider: "google", providerAccountId: marker, access_token: "unused-test-token", refresh_token: "unused-test-refresh", id_token: "unused-test-id" } });
  const payment = await db.payment.create({ data: { userId, providerPaymentId: `historical-fixture-${marker}`, amount: 100, currency: "usd", status: "archived" } });
  const retriedDeletion = await db.chatMessage.create({ data: { userId, roomId, deleted: true, body: "Previously committed delete" } });
  expect((await page.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "message-delete", messageId: retriedDeletion.id } })).ok()).toBe(true);
  expect((await db.chatMessage.findUniqueOrThrow({ where: { id: retriedDeletion.id } })).body).toBe("");
  await expect(db.chatMessage.create({ data: { userId, roomId, body: "" } })).rejects.toThrow();
  await runPrivacyMaintenance();
  expect(await db.authToken.findUnique({ where: { id: old.id } })).toBeNull(); expect(await db.authToken.findUnique({ where: { id: current.id } })).not.toBeNull(); expect(await db.reaction.findUnique({ where: { id: floating.id } })).toBeNull(); expect(await db.reaction.findUnique({ where: { id: like.id } })).not.toBeNull();
  expect((await db.chatMessage.findUniqueOrThrow({ where: { id: deleted.id } })).body).toBe(""); expect((await db.chatMessage.findUniqueOrThrow({ where: { id: active.id } })).body).toBe("Keep active private history"); const account = await db.account.findUniqueOrThrow({ where: { id: link.id } }); expect(account.access_token).toBeNull(); expect(account.refresh_token).toBeNull(); expect(account.id_token).toBeNull(); expect(await db.payment.findUnique({ where: { id: payment.id } })).not.toBeNull();
 } finally { await db.$disconnect(); await maintenanceDb.$disconnect(); }
});

test("policy, contact and deletion screens remain accessible in both themes on desktop and mobile", async ({ page }) => {
 await accountViaApi(page, `trustui${Date.now()}`);
 for (const width of [1440, 390]) for (const theme of ["dark", "light"]) {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  await page.evaluate(value => { localStorage.setItem("cinechat-theme", value); document.documentElement.dataset.theme = value; }, theme);
  for (const path of ["/legal/privacy", "/contact", "/settings"]) {
   await page.goto(path);
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
   expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
   if (path === "/settings") {
    const trigger = page.getByRole("button", { name: "Delete account", exact: true }); await trigger.click(); const dialog = page.getByRole("dialog", { name: "Delete your account?" }); await expect(dialog).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `test-results/trust/deletion-${width}-${theme}.png` }); await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
   } else await page.screenshot({ path: `test-results/trust/${path === "/contact" ? "contact" : "privacy"}-${width}-${theme}.png` });
  }
 }
});

test("revoked private members receive no presence data even before a broker notification removes their socket", async ({ browser }) => {
 const db = new PrismaClient(), a = await browser.newContext(), b = await browser.newContext(); const host = await a.newPage(), guest = await b.newPage(); let guestSocket: Socket | undefined, hostSocket: Socket | undefined;
 try {
  const suffix = Date.now(); await accountViaApi(host, `presowner${suffix}`); await accountViaApi(guest, `presguest${suffix}`);
  const { id: roomId } = await (await host.request.post("/api/rooms", { headers, data: { title: "Presence access check", movieId: "big-buck-bunny", visibility: "PRIVATE", capacity: 4 } })).json();
  const invitation = await (await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "invite" } })).json();
  expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join", token: new URL(invitation.url).pathname.split("/").pop() } })).ok()).toBe(true);
  const connect = async (page: typeof host) => {
   const { ticket } = await (await page.request.post("/api/realtime-ticket", { headers })).json(); const socket = io("http://localhost:3001", { transports: ["websocket"], auth: { ticket }, extraHeaders: headers }); await new Promise<void>(resolve => socket.once("connect", resolve)); return socket;
  };
  guestSocket = await connect(guest); expect((await emit(guestSocket, "join", { roomId })).ok).toBe(true);
  // Simulate loss/delay of the separate revocation notification; fresh DB checks
  // must protect every subsequent private presence broadcast anyway.
  await db.invitation.update({ where: { id: invitation.id }, data: { revoked: true } });
  const leaked: unknown[] = []; guestSocket.on("presence", value => leaked.push(value));
  hostSocket = await connect(host); expect((await emit(hostSocket, "join", { roomId })).ok).toBe(true);
  await new Promise(resolve => setTimeout(resolve, 150)); expect(leaked).toEqual([]);
  expect([403, 404]).toContain((await emit(guestSocket, "sync", {})).status); expect((await guest.request.get(`/api/rooms/${roomId}`)).status()).toBe(404);
 } finally { guestSocket?.disconnect(); hostSocket?.disconnect(); await a.close(); await b.close(); await db.$disconnect(); }
});

test("accounts without policy acknowledgement complete profile and preserve their invitation destination before joining", async ({ browser }) => {
 const db = new PrismaClient(), a = await browser.newContext(), b = await browser.newContext(); const host = await a.newPage(), guest = await b.newPage();
 try {
  const suffix = Date.now(), guestName = `onboard${suffix}`; await accountViaApi(host, `inviteowner${suffix}`); const guestId = await accountViaApi(guest, guestName);
  const { id: roomId } = await (await host.request.post("/api/rooms", { headers, data: { title: "Account onboarding screening", movieId: "big-buck-bunny", visibility: "PRIVATE", capacity: 4 } })).json();
  const { url } = await (await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "invite" } })).json(); const token = new URL(url).pathname.split("/").pop();
  // Explicitly simulate an authenticated provider-created account with no
  // profile/acknowledgement. Actual Google OAuth needs external credentials.
  await db.policyAcceptance.deleteMany({ where: { userId: guestId } }); await db.profile.delete({ where: { userId: guestId } });
  expect((await guest.request.post("/api/rooms", { headers, data: { title: "Must review policies", movieId: "big-buck-bunny", visibility: "PRIVATE", capacity: 4 } })).status()).toBe(403);
  expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join", token } })).status()).toBe(403);
  expect((await guest.request.get("/api/account/data")).ok()).toBe(true); // Data rights are not conditional on accepting terms.
  await guest.goto(`/onboarding?returnTo=${encodeURIComponent(`/invite/${token}`)}`); await expect(guest.getByRole("heading", { name: "Review your account policies." })).toBeVisible();
  for (const field of ["acceptTerms", "acknowledgePrivacy", "ageEligible"]) { await expect(guest.locator(`input[name="${field}"]`)).not.toBeChecked(); await guest.locator(`input[name="${field}"]`).check(); }
  await guest.getByRole("button", { name: "Save acknowledgement" }).click(); await expect(guest).toHaveURL(new RegExp("/settings\\?returnTo="));
  await guest.getByLabel("Username", { exact: true }).fill(guestName); await guest.getByLabel("Date of birth").fill("1990-01-01"); await guest.getByRole("button", { name: "Save changes", exact: true }).click(); await expect(guest).toHaveURL(url);
  await guest.getByRole("button", { name: "Join screening" }).click(); await expect(guest).toHaveURL(`/cinemas/${roomId}`); await expect(guest.getByLabel("Chat message")).toBeEnabled();
  expect(await db.policyAcceptance.count({ where: { userId: guestId, version: "2026-10-22" } })).toBe(1);
 } finally { await a.close(); await b.close(); await db.$disconnect(); }
});
