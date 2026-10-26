import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile } from "node:fs/promises";
import { accountViaApi } from "../e2e/helpers";

const db = new PrismaClient(), headers = { origin: "http://localhost:3000" };
test.afterAll(async () => db.$disconnect());

async function room(host: Page, guest: Page, visibility: "PUBLIC" | "PRIVATE" = "PRIVATE") {
  const response = await host.request.post("/api/rooms", { headers, data: { title: visibility === "PRIVATE" ? "A film with friends" : "An open screening", movieId: "big-buck-bunny", visibility, capacity: 8 } });
  expect(response.ok()).toBe(true); const id = (await response.json()).id;
  const token = visibility === "PRIVATE" ? new URL((await (await host.request.post(`/api/rooms/${id}`, { headers, data: { action: "invite" } })).json()).url).pathname.split("/").pop() : undefined;
  expect((await guest.request.post(`/api/rooms/${id}`, { headers, data: { action: "join", token } })).ok()).toBe(true);
  for (const page of [host, guest]) { await page.goto(`/cinemas/${id}`); await expect(page.getByText("Live & synchronized")).toBeVisible(); }
  return id;
}
async function playing(page: Page) {
  await page.getByTestId("cinema-video").scrollIntoViewIfNeeded();
  await expect.poll(async () => {
    const tap = page.getByRole("button", { name: "Tap to Start Watching", exact: true }); if (await tap.isVisible()) await tap.click();
    return page.getByTestId("cinema-video").evaluate((video: HTMLVideoElement) => !video.paused && video.currentTime > .3);
  }).toBe(true);
}
async function geometry(page: Page, underneath: boolean) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  if (underneath) await expect.poll(() => page.evaluate(() => {
    const chat = document.querySelector(".glass-chat-panel")!.getBoundingClientRect(), info = document.querySelector(".cinema-film-info")!.getBoundingClientRect();
    return chat.top >= info.bottom - 1 && chat.left >= 0 && chat.right <= innerWidth + 1;
  })).toBe(true);
}

test("one private session survives compact, flip, folded, unfolded and keyboard-height layouts", async ({ browser }, testInfo) => {
  const contexts = await Promise.all([browser.newContext({ colorScheme: "dark" }), browser.newContext({ colorScheme: "dark" })]);
  const [host, guest] = await Promise.all(contexts.map(context => context.newPage()));
  const suffix = Date.now().toString(36), users: string[] = [];
  const states: { width: number; height: number; underneath: boolean }[] = [];
  let connections = 0; host.on("websocket", socket => { if (socket.url().includes("socket.io")) connections++; });
  try {
    users.push(await accountViaApi(host, `fh_${suffix}`), await accountViaApi(guest, `fg_${suffix}`));
    const id = await room(host, guest);
    const video = await host.getByTestId("cinema-video").elementHandle(); expect(video).not.toBeNull();
    const originalConnections = connections;
    await host.getByRole("button", { name: "Play film", exact: true }).last().click(); await playing(host); await playing(guest);
    const draft = "Keep this draft while folding 🍿";
    await host.getByLabel("Chat message").fill(draft);
    for (const viewport of [{ width: 280, height: 600 }, { width: 344, height: 882 }, { width: 390, height: 900 }, { width: 430, height: 700 }, { width: 690, height: 829 }, { width: 900, height: 700 }, { width: 1024, height: 768 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 600, height: 700 }, { width: 844, height: 390 }, { width: 390, height: 400 }, { width: 390, height: 844 }]) {
      await host.setViewportSize(viewport); await geometry(host, viewport.width <= 700);
      await expect(host.getByLabel("Chat message")).toHaveValue(draft);
      expect(await video!.evaluate(element => element.isConnected && element === document.querySelector('[data-testid="cinema-video"]'))).toBe(true);
      expect(connections).toBe(originalConnections);
      states.push({ ...viewport, underneath: viewport.width <= 700 });
      if (viewport.height <= 400) {
        await host.getByLabel("Chat message").focus();
        await expect(host.locator("html")).toHaveAttribute("data-keyboard-open", "true");
        await expect.poll(() => host.getByLabel("Chat message").evaluate(element => { const rect = element.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= (window.visualViewport?.height || innerHeight) + 1; })).toBe(true);
        if (viewport.width === 390) await host.screenshot({ path: `test-results/responsive/captures/${testInfo.project.name}-private-keyboard-height-dark.png` });
      }
    }
    await host.getByLabel("Chat message").focus();
    await expect.poll(() => host.getByLabel("Chat message").evaluate(element => {
      const rect = element.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= (window.visualViewport?.height || innerHeight) + 1;
    })).toBe(true);
    await host.getByRole("button", { name: "Send message", exact: true }).click(); await expect(guest.getByText(draft, { exact: true })).toBeVisible();
    await playing(host); await playing(guest);
    const before = await host.getByTestId("cinema-video").evaluate((element: HTMLVideoElement) => element.currentTime);
    const scrollBeforeMessage = await host.evaluate(() => scrollY);
    await guest.getByLabel("Chat message").fill("The film keeps playing 🎬"); await guest.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(host.getByText("The film keeps playing 🎬", { exact: true })).toBeVisible();
    expect(await host.evaluate(() => scrollY)).toBe(scrollBeforeMessage);
    await expect.poll(() => host.getByTestId("cinema-video").evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(before);
    await host.getByLabel("Chat message").focus();
    await expect.poll(() => host.getByText("The film keeps playing 🎬", { exact: true }).evaluate(element => {
      const message = element.closest("article")!, pane = element.closest(".chat-messages")!;
      const bounds = message.getBoundingClientRect(), viewport = pane.getBoundingClientRect(), player = document.querySelector(".player-shell")!.getBoundingClientRect();
      return bounds.top >= Math.max(viewport.top, player.bottom) - 1 && bounds.bottom <= Math.min(viewport.bottom, innerHeight) + 1;
    })).toBe(true);
    for (const theme of ["dark", "light"]) {
      await host.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
      await host.screenshot({ path: `test-results/responsive/captures/${testInfo.project.name}-private-chat-inline-${theme}.png` });
    }
    await host.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
    await host.getByLabel("Chat message").blur(); await host.evaluate(() => window.scrollTo(0, 0));
    await host.screenshot({ path: `test-results/responsive/captures/${testInfo.project.name}-folded-private-390-dark.png` });
    await host.setViewportSize({ width: 1280, height: 800 }); await geometry(host, false);
    await host.screenshot({ path: `test-results/responsive/captures/${testInfo.project.name}-unfolded-private-1280-dark.png` });
    const membership = await db.roomMembership.findUniqueOrThrow({ where: { roomId_userId: { roomId: id, userId: users[0] } } }); expect(membership.status).toBe("ACTIVE");
    const outsider = await browser.newContext(); try { const page = await outsider.newPage(); await page.goto("/login"); expect((await page.request.get(`/api/rooms/${id}`)).ok()).toBe(false); } finally { await outsider.close(); }
    await host.getByRole("button", { name: "Pause film", exact: true }).last().click(); await expect(guest.getByTestId("cinema-video")).toHaveJSProperty("paused", true);
    await writeFile(testInfo.outputPath("foldable-matrix.json"), JSON.stringify({ engine: testInfo.project.name, browserVersion: browser.version(), states, preservedVideo: true, stableConnection: true, privateMessageDelivered: true, membershipActive: true }, null, 2));
  } finally { await Promise.all(contexts.map(context => context.close())); await db.user.deleteMany({ where: { id: { in: users } } }); }
});

test("native viewport segments keep video, private chat and public reactions away from hinges", async ({ browser, browserName }, testInfo) => {
  test.skip(browserName !== "chromium", "Chromium CDP exposes display-feature emulation; other engines exercise ordinary responsive fallback.");
  const contexts = await Promise.all([browser.newContext({ colorScheme: "dark" }), browser.newContext({ colorScheme: "dark" })]); const [host, guest] = await Promise.all(contexts.map(context => context.newPage()));
  const suffix = Date.now().toString(36), users: string[] = [];
  try {
    users.push(await accountViaApi(host, `dh_${suffix}`, { screeningAdmin: true }), await accountViaApi(guest, `dg_${suffix}`));
    await room(host, guest);
    const video = await host.getByTestId("cinema-video").elementHandle();
    await host.getByRole("button", { name: "Play film", exact: true }).last().click(); await playing(host); await playing(guest);
    const beforeFolding = await video!.evaluate((element: HTMLVideoElement) => element.currentTime);
    await host.getByLabel("Chat message").fill("A draft across the hinge");
    const cdp = await contexts[0].newCDPSession(host);
    async function fold(width: number, height: number, orientation: "vertical" | "horizontal", offset: number, maskLength: number) {
      await host.setViewportSize({ width, height });
      await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, screenWidth: width, screenHeight: height, deviceScaleFactor: 1, mobile: true, displayFeature: { orientation, offset, maskLength } });
      await cdp.send("Emulation.setDevicePostureOverride", { posture: { type: "folded" } });
      await expect(host.locator("html")).toHaveAttribute("data-screen-segments", orientation === "vertical" ? "horizontal" : "vertical");
      expect(await host.evaluate(() => ((window as Window & { viewport?: { segments?: unknown[] } }).viewport?.segments?.length || 0))).toBe(2);
    }
    await fold(1114, 720, "vertical", 540, 34);
    await expect(host.locator("html")).toHaveAttribute("data-screen-columns", "true");
    await expect.poll(() => host.evaluate(() => {
      const player = document.querySelector(".player-shell")!.getBoundingClientRect(), chat = document.querySelector(".glass-chat-panel")!.getBoundingClientRect();
      return player.left >= 0 && player.right <= 540 && chat.left >= 574 && chat.right <= 1114;
    })).toBe(true);
    // Playwright's normal screenshot helper can replace CDP display metrics.
    // Capture the actual segmented viewport without clearing its display feature.
    async function captureSegments(type: string) {
      const capture = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await mkdir("test-results/responsive/captures", { recursive: true });
      await writeFile(`test-results/responsive/captures/${testInfo.project.name}-dual-screen-${type}-dark.png`, Buffer.from(capture.data, "base64"));
    }
    await captureSegments("private");
    await host.getByRole("button", { name: "Invite Friends", exact: true }).click();
    const dialog = host.getByRole("dialog", { name: "Save someone a seat." }); await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(element => { const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= 540 && rect.top >= 0 && rect.bottom <= 720; })).toBe(true);
    await host.keyboard.press("Escape");
    await host.getByRole("button", { name: "Fullscreen", exact: true }).click(); await expect(host.getByRole("dialog", { name: "Fullscreen cinema" })).toBeVisible();
    expect(await host.locator(".player-shell").evaluate(element => { const rect = element.getBoundingClientRect(); return rect.left >= 0 && rect.right <= 540; })).toBe(true); await host.keyboard.press("Escape");
    await fold(818, 800, "vertical", 400, 18); await expect(host.locator("html")).toHaveAttribute("data-screen-columns", "false");
    await geometry(host, true);
    await fold(800, 740, "horizontal", 360, 34);
    expect(await host.locator(".viewport-shell").evaluate(element => { const rect = element.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= 360 && getComputedStyle(element).overflowY === "auto"; })).toBe(true);
    await cdp.send("Emulation.clearDeviceMetricsOverride"); await cdp.send("Emulation.clearDevicePostureOverride"); await host.setViewportSize({ width: 390, height: 844 });
    await expect(host.locator("html")).not.toHaveAttribute("data-screen-segments"); await geometry(host, true);
    await expect(host.getByLabel("Chat message")).toHaveValue("A draft across the hinge");
    expect(await video!.evaluate(element => element.isConnected && element === document.querySelector("video"))).toBe(true);
    await playing(host); await playing(guest);
    const positions = await Promise.all([host, guest].map(page => page.getByTestId("cinema-video").evaluate((element: HTMLVideoElement) => element.currentTime)));
    expect(positions[0]).toBeGreaterThan(beforeFolding); expect(Math.abs(positions[0] - positions[1])).toBeLessThan(2);
    await room(host, guest, "PUBLIC"); await fold(1114, 720, "vertical", 540, 34);
    await expect(host.getByLabel("Chat message")).toHaveCount(0); await expect(host.locator(".glass-chat-panel")).toHaveCount(0);
    await expect.poll(() => host.locator(".player-shell").evaluate(element => element.getBoundingClientRect().right <= 540)).toBe(true);
    await guest.getByRole("button", { name: "React ❤️", exact: true }).click(); await expect(host.locator(".floating-reaction", { hasText: "❤️" })).toBeVisible();
    await captureSegments("public");
    await host.goto("/movies"); await expect(host.locator("html")).toHaveAttribute("data-screen-segments", "horizontal");
    await expect.poll(() => host.locator(".movie-grid").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(2);
    expect(await host.locator("main").evaluate(element => element.getBoundingClientRect().right <= 540)).toBe(true);
    await writeFile(testInfo.outputPath("native-segments.json"), JSON.stringify({ method: "Chromium CDP displayFeature, native viewport.segments", physicalDevice: false, checked: ["wide private panes", "safe invitation dialog", "safe immersive player", "narrow panes", "vertical fold", "unfold with draft and video identity", "active two-viewer playback after folding", "public emoji-only pane", "movie discovery in safe pane"] }, null, 2));
  } finally { await Promise.all(contexts.map(context => context.close())); await db.user.deleteMany({ where: { id: { in: users } } }); }
});
