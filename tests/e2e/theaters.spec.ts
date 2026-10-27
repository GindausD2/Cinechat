import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { io, type Socket } from "socket.io-client";
import { accountViaApi } from "./helpers";
import { publishRoomEvent } from "../../src/lib/events";

const db = new PrismaClient();
const headers = { origin: "http://localhost:3000" };
type Ack = { ok: boolean; status?: number; data?: { id: string; version: number }; error?: string };
test.afterAll(async () => db.$disconnect());
function emit(socket: Socket, event: string, data: unknown): Promise<Ack> {
  return new Promise((resolve, reject) => socket.timeout(7000).emit(event, data, (err: Error | null, result: Ack) => err ? reject(err) : resolve(result)));
}
async function socketFor(page: Page) {
  const response = await page.request.post("/api/realtime-ticket", { headers }); expect(response.ok()).toBe(true);
  const socket = io("http://localhost:3001", { auth: { ticket: (await response.json()).ticket }, transports: ["websocket"], extraHeaders: { Origin: "http://localhost:3000" }, reconnection: false });
  await new Promise<void>((resolve, reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); });
  return socket;
}
async function noPublicChat(page: Page) {
  await expect(page.locator(".glass-chat-panel, .chat-compose, .chat-messages")).toHaveCount(0);
  await expect(page.getByLabel("Chat message")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /chat|send message/i })).toHaveCount(0);
  await expect(page.getByRole("group", { name: "Cinema reactions" }).getByRole("button")).toHaveCount(7);
}

test("public theaters synchronize video and ephemeral emojis while rejecting every text-chat boundary", async ({ browser }) => {
  const suffix = Date.now().toString(36), contexts = await Promise.all([1, 2].map(() => browser.newContext({ reducedMotion: "reduce" })));
  const [host, guest] = await Promise.all(contexts.map(c => c.newPage()));
  const hostId = await accountViaApi(host, `pubhost_${suffix}`, { screeningAdmin: true }), guestName = `pubguest_${suffix}`;
  await accountViaApi(guest, guestName);
  let roomId = ""; let socket: Socket | undefined;
  try {
    await host.goto("/cinemas/new?movie=big-buck-bunny");
    await expect(host.getByLabel("Theater name")).toHaveCount(0);
    await host.getByRole("button", { name: /Public Theater Watch with everyone/ }).click();
    await expect(host.getByLabel("Access code (optional)")).toHaveCount(0);
    await host.getByLabel("Theater name").fill("Emoji-only public premiere");
    await host.getByRole("button", { name: "Create theater", exact: true }).click();
    await expect(host.getByText("Live & synchronized")).toBeVisible(); roomId = host.url().split("/").pop()!;
    expect((await guest.request.get(`/api/rooms/${roomId}`)).status()).toBe(403);
    const discovery = await guest.request.get("/api/rooms"); expect((await discovery.json()).rooms.some((r: { id: string }) => r.id === roomId)).toBe(true);
    expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join" } })).ok()).toBe(true);
    await guest.goto(`/cinemas/${roomId}`); await expect(guest.getByText("Live & synchronized")).toBeVisible();
    await expect(host.getByTestId("live-viewer-count")).toHaveText("2 watching"); await expect(guest.getByTestId("live-viewer-count")).toHaveText("2 watching");
    await noPublicChat(host); await noPublicChat(guest);
    // Existing public messages remain in storage for moderation but must never
    // be exposed by HTTP snapshots, WS joins, refreshes, or the shared event bus.
    const historical = await db.chatMessage.create({ data: { roomId, userId: hostId, body: "Legacy public text must stay hidden" } });
    const snapshot = await host.request.get(`/api/rooms/${roomId}`); expect((await snapshot.json()).messages).toEqual([]);
    socket = await socketFor(host);
    const receivedMessages: unknown[] = [], receivedReactions: { emoji: string }[] = [], states: { messages: unknown[] }[] = [];
    let participantUpdates = 0; socket.on("participants-changed", () => participantUpdates++);
    socket.on("message", m => receivedMessages.push(m)); socket.on("reaction", r => receivedReactions.push(r)); socket.on("state", state => states.push(state));
    expect((await emit(socket, "join", { roomId })).ok).toBe(true); await expect.poll(() => states.length).toBeGreaterThan(0); expect(states[0].messages).toEqual([]);
    for (const page of [host, guest]) {
      const denied = await page.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "message", body: "Public HTTP text" } });
      expect(denied.status()).toBe(403); expect((await denied.json()).error).toContain("private theaters");
    }
    expect((await emit(socket, "message", { body: "Public WebSocket text" })).status).toBe(403);
    expect((await emit(socket, "message-delete", { messageId: historical.id })).status).toBe(403);
    expect((await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "message-delete", messageId: historical.id } })).status()).toBe(403);
    expect((await emit(socket, "reaction", { emoji: "❤️", messageId: historical.id })).status).toBe(403);
    expect((await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "reaction", emoji: "❤️", messageId: historical.id } })).status()).toBe(403);
    expect((await host.request.post("/api/reports", { headers, data: { roomId, messageId: historical.id, reason: "spam" } })).status()).toBe(403);
    expect((await emit(socket, "reaction", { emoji: "🎬" })).status).toBe(400);
    await publishRoomEvent({ roomId, type: "message", data: { id: historical.id, userId: hostId, body: historical.body, name: "Host", createdAt: new Date().toISOString() } });
    await publishRoomEvent({ roomId, type: "refresh" });
    await expect.poll(() => participantUpdates).toBeGreaterThan(0); expect(states.at(-1)?.messages).toEqual([]);
    for (const emoji of ["❤️", "😂", "😮", "😢", "👏", "🔥", "👍"]) {
      await guest.getByRole("button", { name: `React ${emoji}`, exact: true }).click();
      await expect(host.locator(".floating-reaction", { hasText: emoji })).toBeVisible(); await expect(guest.locator(".floating-reaction", { hasText: emoji })).toBeVisible();
      await expect.poll(() => receivedReactions.some(r => r.emoji === emoji)).toBe(true);
    }
    await expect(host.locator(".floating-reaction")).toHaveCount(0); await expect(guest.locator(".floating-reaction")).toHaveCount(0);
    expect(receivedMessages).toEqual([]); expect(await db.chatMessage.count({ where: { roomId } })).toBe(1);
    await expect(host.getByTestId("cinema-video")).toHaveJSProperty("readyState", 4);
    await host.getByRole("button", { name: "Play film", exact: true }).last().click();
    await expect.poll(() => guest.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(1);
    const times = await Promise.all([host, guest].map(p => p.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime))); expect(Math.abs(times[0] - times[1])).toBeLessThan(1.5);
    await host.getByRole("button", { name: "Pause film", exact: true }).click(); await expect(guest.getByTestId("cinema-video")).toHaveJSProperty("paused", true);
    const version = (await (await host.request.get(`/api/rooms/${roomId}`)).json()).playback.version;
    expect((await emit(socket, "playback", { action: "seek", position: 30, expectedVersion: version })).ok).toBe(true);
    await expect.poll(async () => Math.abs(await guest.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime) - 30)).toBeLessThan(1.5);
    await host.getByRole("button", { name: "Fullscreen", exact: true }).click();
    await expect.poll(() => host.evaluate(() => document.fullscreenElement?.classList.contains("player-shell"))).toBe(true);
    await expect(host.getByRole("group", { name: "Cinema reactions" })).toBeVisible();
    await guest.emulateMedia({ reducedMotion: "no-preference" });
    await host.getByRole("button", { name: "React 👍", exact: true }).click(); await expect(guest.locator(".floating-reaction", { hasText: "👍" })).toBeVisible();
    await expect(guest.locator(".floating-reaction", { hasText: "👍" })).toHaveCSS("animation-name", "reaction-float");
    await expect(host.locator(".floating-reaction", { hasText: "👍" })).toHaveCSS("animation-name", "none");
    await host.getByRole("button", { name: "Fullscreen", exact: true }).click(); await expect.poll(() => host.evaluate(() => document.fullscreenElement === null)).toBe(true);
    await host.getByRole("button", { name: "Viewers", exact: true }).click();
    const guestEntry = host.getByRole("dialog").locator(".participant", { hasText: guestName });
    await guestEntry.getByRole("button", { name: "Mute reactions", exact: true }).click();
    await expect(guestEntry.getByRole("button", { name: "Unmute reactions", exact: true })).toBeVisible();
    await guest.getByRole("button", { name: "React 😢", exact: true }).click(); await expect(guest.locator(".cinema-notice")).toContainText("temporarily muted");
    await guestEntry.getByRole("button", { name: "Unmute reactions", exact: true }).click(); await host.getByRole("dialog").getByRole("button", { name: "Close dialog" }).click();
    await host.getByRole("button", { name: "Report room", exact: true }).click();
    await host.getByRole("dialog").getByLabel("Details").fill("Public theater moderation acceptance check.");
    await host.getByRole("dialog").getByRole("button", { name: "Submit report", exact: true }).click();
    await expect(host.locator(".cinema-notice")).toContainText("Report submitted");
    expect(await db.report.count({ where: { roomId, messageId: null } })).toBe(1);
    await guest.getByRole("button", { name: "Leave", exact: true }).click(); await expect(guest).toHaveURL("/cinemas");
    await host.getByRole("button", { name: "Play film", exact: true }).last().click();
    await guest.goto(`/cinemas/${roomId}`); await guest.getByRole("button", { name: "Join screening", exact: true }).click(); await expect(guest.getByText("Live & synchronized")).toBeVisible();
    await expect.poll(() => guest.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(30.5);
    await guest.reload(); await expect(guest.getByText("Live & synchronized")).toBeVisible(); await noPublicChat(guest);
    await expect.poll(() => guest.getByTestId("cinema-video").evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThan(30.5);
  } finally {
    socket?.close(); if (roomId) await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "end" } });
    await Promise.all(contexts.map(c => c.close()));
  }
});

test("private chat stays member-only and invitation, moderation, and reaction limits apply across transports", async ({ browser }) => {
  const suffix = Date.now().toString(36), contexts = await Promise.all([1, 2, 3].map(() => browser.newContext({ reducedMotion: "reduce" })));
  const [host, guest, outsider] = await Promise.all(contexts.map(c => c.newPage()));
  const hostId = await accountViaApi(host, `prihost_${suffix}`), guestId = await accountViaApi(guest, `priguest_${suffix}`);
  await accountViaApi(outsider, `priother_${suffix}`);
  const sockets: Socket[] = []; let roomId = "";
  try {
    expect(await db.subscription.findUnique({ where: { userId: hostId } })).toBeNull();
    const created = await host.request.post("/api/rooms", { headers, data: { title: "Blue private theater", description: "An evening for invited friends.", movieId: "big-buck-bunny", visibility: "PRIVATE", capacity: 8, theme: "blue", accessCode: "private42" } });
    expect(created.ok()).toBe(true); roomId = (await created.json()).id;
    expect((await (await host.request.get(`/api/rooms/${roomId}`)).json()).theme).toBe("blue");
    for (const page of [guest, outsider]) {
      expect((await page.request.get(`/api/rooms/${roomId}`)).status()).toBe(404);
      expect((await page.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "message", body: "Unauthorized private text" } })).status()).toBe(404);
      expect((await page.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join" } })).status()).toBe(404);
      expect(JSON.stringify(await (await page.request.get("/api/rooms?type=private")).json())).not.toContain(roomId);
    }
    const otherSocket = await socketFor(outsider), hostSocket = await socketFor(host), guestSocket = await socketFor(guest); sockets.push(otherSocket, hostSocket, guestSocket);
    const otherMessages: unknown[] = []; otherSocket.on("message", m => otherMessages.push(m));
    expect((await emit(otherSocket, "join", { roomId })).status).toBe(404);
    expect((await emit(hostSocket, "join", { roomId })).ok).toBe(true);
    const revoked = await (await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "invite" } })).json();
    expect((await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "revoke-invite", invitationId: revoked.id } })).ok()).toBe(true);
    expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join", token: revoked.url.split("/").pop(), accessCode: "private42" } })).status()).toBe(403);
    const expired = await (await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "invite" } })).json();
    await db.invitation.update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join", token: expired.url.split("/").pop(), accessCode: "private42" } })).status()).toBe(403);
    const invite = await (await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "invite", maxUses: 1 } })).json();
    await guest.goto(invite.url); await guest.getByLabel("Access code", { exact: true }).fill("wrong42"); await guest.getByRole("button", { name: "Join screening", exact: true }).click(); await expect(guest.locator(".error-message")).toContainText("incorrect");
    await guest.getByLabel("Access code", { exact: true }).fill("private42"); await guest.getByRole("button", { name: "Join screening", exact: true }).click(); await expect(guest.getByText("Live & synchronized")).toBeVisible();
    expect((await outsider.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join", token: invite.url.split("/").pop(), accessCode: "private42" } })).status()).toBe(403);
    expect((await emit(guestSocket, "join", { roomId })).ok).toBe(true);
    await host.goto(`/cinemas/${roomId}`); await expect(host.getByText("Live & synchronized")).toBeVisible();
    await expect(host.getByTestId("live-viewer-count")).toHaveText("2 watching");
    const sent = await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "message", body: "Private HTTP message for members only" } }); expect(sent.ok()).toBe(true); const messageId = (await sent.json()).id;
    await expect(guest.getByText("Private HTTP message for members only", { exact: true })).toBeVisible();
    await guest.getByLabel("Chat message").fill("Private WebSocket reply"); await guest.getByRole("button", { name: "Send message", exact: true }).click(); await expect(host.getByText("Private WebSocket reply", { exact: true })).toBeVisible();
    await guest.getByRole("button", { name: "React 😢", exact: true }).click(); await expect(host.locator(".floating-reaction", { hasText: "😢" })).toBeVisible();
    expect((await emit(guestSocket, "reaction", { emoji: "❤️", messageId })).ok).toBe(true);
    // Five HTTP + five WS events share one atomic Redis bucket. Neither transport
    // can be switched to bypass the ten-reactions-per-ten-seconds limit.
    for (let i = 0; i < 5; i++) expect((await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "reaction", emoji: "👍" } })).ok()).toBe(true);
    for (let i = 0; i < 5; i++) expect((await emit(hostSocket, "reaction", { emoji: "🔥" })).ok).toBe(true);
    expect((await emit(hostSocket, "reaction", { emoji: "🔥" })).status).toBe(429);
    expect((await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "reaction", emoji: "👍" } })).status()).toBe(429);
    expect(await db.reaction.count({ where: { roomId, userId: hostId } })).toBe(0); // Floating reactions are not persistent personal history.
    expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "moderate", targetId: hostId, command: "remove" } })).status()).toBe(403);
    expect((await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "moderate", targetId: guestId, command: "mute" } })).ok()).toBe(true);
    expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "message", body: "Muted HTTP message" } })).status()).toBe(403);
    expect((await emit(guestSocket, "reaction", { emoji: "😂" })).status).toBe(403);
    expect((await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "moderate", targetId: guestId, command: "remove" } })).ok()).toBe(true);
    expect((await guest.request.get(`/api/rooms/${roomId}`)).status()).toBe(404);
    expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "message", body: "Removed private message" } })).status()).toBe(404);
    expect((await emit(guestSocket, "join", { roomId })).status).toBe(404);
    expect(JSON.stringify(await (await outsider.request.get("/api/rooms")).json())).not.toContain(roomId);
    expect(otherMessages).toEqual([]);
  } finally {
    sockets.forEach(socket => socket.close()); if (roomId) await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "end" } });
    await Promise.all(contexts.map(c => c.close()));
  }
});
