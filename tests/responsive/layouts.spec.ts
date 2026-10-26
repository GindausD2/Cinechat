import "dotenv/config";
import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import AxeBuilder from "@axe-core/playwright";
import { writeFile } from "node:fs/promises";
import { accountViaApi } from "../e2e/helpers";
import { startDueScreenings } from "../../src/lib/screenings";

const db = new PrismaClient(), headers = { origin: "http://localhost:3000" };
const widths = [320, 360, 375, 390, 430, 600, 768, 1024, 1280, 1440, 1920, 2560, 3440];
test.afterAll(async () => db.$disconnect());

async function appearance(page: Page, width: number, theme: string) {
  await page.setViewportSize({ width, height: width < 600 ? 844 : width < 1000 ? 1024 : 900 });
  await page.evaluate(value => { document.documentElement.dataset.theme = value; localStorage.setItem("cinechat-theme", value); }, theme);
  await page.evaluate(async () => { await document.fonts.ready; if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
}
async function overflow(page: Page) {
  return page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, offenders: Array.from(document.querySelectorAll("body *")).filter(element => { const rect = element.getBoundingClientRect(); return rect.width > 0 && (rect.right > innerWidth + 1 || rect.left < -1); }).slice(0, 12).map(element => `${element.tagName}.${element.className}`) }));
}
async function endScreening(page: Page, roomId: string) {
  // Retry only transport resets. A lost successful response may yield 404 on retry.
  const response = await page.request.post(`/api/rooms/${roomId}`, { headers, maxRetries: 2, data: { action: "end" } });
  expect([200, 404]).toContain(response.status());
  expect((await db.cinemaRoom.findUniqueOrThrow({ where: { id: roomId } })).endedAt).not.toBeNull();
}

test("all page families reflow at representative widths and both themes", async ({ browser }, testInfo) => {
  const signed = await browser.newContext(), anonymous = await browser.newContext();
  const page = await signed.newPage(), publicPage = await anonymous.newPage();
  const username = `r_${Date.now().toString(36)}`.padEnd(24, "x"); let userId = "";
  const findings: unknown[] = [], states: unknown[] = [];
  try {
    userId = await accountViaApi(page, username, { screeningAdmin: true });
    expect((await page.request.patch("/api/account", { headers, data: { username, biography: "A".repeat(300), publicProfile: false, showActivity: false, allowFriendRequests: false } })).ok()).toBe(true);
    const club = await page.request.post("/api/clubs", { headers, data: { action: "create", name: "C".repeat(60), description: "D".repeat(500), genre: "Animation", color: "#98b6b8" } }); expect(club.ok()).toBe(true); const clubId = (await club.json()).id;
    await db.notification.create({ data: { userId, type: "screening", title: "N".repeat(160), href: "/cinemas" } });
    await db.watchHistory.create({ data: { userId, movieId: "big-buck-bunny", position: 40 } });
    const publicRoutes = ["/", "/movies", "/movies/big-buck-bunny", "/cinemas", "/login", "/register", "/forgot-password", "/reset-password", "/resend-verification", "/verify", "/legal", "/legal/privacy", "/legal/terms", "/legal/cookies", "/legal/safety", "/legal/refunds", "/contact", "/missing-page"];
    const privateRoutes = ["/settings", `/profile/${username}`, "/watchlist", "/history", "/notifications", "/community", "/clubs", `/clubs/${clubId}`, "/cinemas/new?type=private", "/admin"];
    for (const [target, routes] of [[publicPage, publicRoutes], [page, privateRoutes]] as const) for (const route of routes) {
      await target.goto(route); await expect(target.locator("main")).toBeVisible();
      for (const width of widths) for (const theme of ["dark", "light"]) {
        await appearance(target, width, theme); const measured = await overflow(target); states.push({ route, width, theme });
        if (["/", "/settings"].includes(route) && [320, 1440].includes(width)) await target.screenshot({ path: `test-results/responsive/captures/${testInfo.project.name}-${route === "/" ? "home" : "settings"}-${width}-${theme}.png` });
        if (measured.scrollWidth > width + 1) {
          findings.push({ route, theme, ...measured });
          if (width === 320 || width === 768) await target.screenshot({ path: testInfo.outputPath(`overflow-${route.replace(/[^a-z0-9]/gi, "_")}-${width}-${theme}.png`) });
        }
      }
    }
    await writeFile(testInfo.outputPath("layout-matrix.json"), JSON.stringify({ states, findings }, null, 2));
    expect(findings, "Document overflow; intentionally scrollable poster rails and tables stay inside the page").toEqual([]);
  } finally { await signed.close(); await anonymous.close(); if (userId) await db.user.deleteMany({ where: { id: userId } }); }
});

async function theaterGeometry(page: Page, testInfo: TestInfo, type: string) {
  const findings: unknown[] = [];
  for (const width of widths) for (const theme of ["dark", "light"]) {
    await appearance(page, width, theme);
    const result = await page.evaluate(() => {
      const shell = document.querySelector(".player-shell")!.getBoundingClientRect(), controls = document.querySelector(".glass-player-controls")!.getBoundingClientRect(), bar = document.querySelector(".reaction-bar")!.getBoundingClientRect();
      const outside = Array.from(document.querySelectorAll(".controls-row button,.controls-row select")).filter(element => { const rect = element.getBoundingClientRect(); return rect.width > 0 && (rect.left < shell.left - 1 || rect.right > shell.right + 1 || rect.bottom > shell.bottom + 1); }).map(element => element.getAttribute("aria-label"));
      const touch = Array.from(document.querySelectorAll(".controls-row button,.controls-row select,.controls-row input,.seek-line input,.reaction-bar button,.player-controls-toggle")).filter(element => { const rect = element.getBoundingClientRect(); return rect.width > 0 && (rect.width < 43 || rect.height < 43); }).map(element => element.getAttribute("aria-label"));
      const video = document.querySelector("video")!;
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1, gap: controls.top - bar.bottom, clippedBar: bar.top < shell.top, outside, touch, fit: getComputedStyle(video).objectFit };
    });
    if (result.overflow || result.gap < 8 || result.clippedBar || result.outside.length || result.touch.length || result.fit !== "contain") findings.push({ width, theme, ...result });
    if ([320, 768, 1440].includes(width)) await page.screenshot({ path: `test-results/responsive/captures/${testInfo.project.name}-${type}-${width}-${theme}.png` });
  }
  return findings;
}

test("public and private theaters keep controls, real chat and emoji reactions accessible", async ({ browser }, testInfo) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]); const [host, guest] = await Promise.all(contexts.map(context => context.newPage()));
  const suffix = Date.now().toString(36); let hostId = "", guestId = "", movieId = "";
  try {
    hostId = await accountViaApi(host, `rh_${suffix}`, { screeningAdmin: true }); guestId = await accountViaApi(guest, `rg_${suffix}`);
    const original = await db.movie.findUniqueOrThrow({ where: { id: "big-buck-bunny" }, include: { sources: true } });
    const { sources, id: _id, createdAt: _createdAt, ...metadata } = original; void _id; void _createdAt; movieId = `responsive-${suffix}`;
    await db.movie.create({ data: { ...metadata, id: movieId, title: "Big Buck Bunny · Authorized responsive test excerpt", durationSeconds: 20, sources: { create: { url: "http://localhost:3002/hls/master.m3u8", format: "hls", authorized: true, enabled: true, license: "CC BY 3.0", rightsUrl: sources[0].rightsUrl, attribution: "Big Buck Bunny © 2008 Blender Foundation. 20-second resized test excerpt. CC BY 3.0.", subtitleUrl: "http://localhost:3002/hls/captions.vtt", subtitles: { create: { language: "es", label: "Español", url: "http://localhost:3002/hls/captions.es.vtt" } } } } } });
    const findings: unknown[] = [];
    for (const visibility of ["PRIVATE", "PUBLIC"] as const) {
      const created = await host.request.post("/api/rooms", { headers, data: { title: `${visibility} ${"S".repeat(65)}`, movieId, visibility, capacity: 8 } }); expect(created.ok()).toBe(true); const roomId = (await created.json()).id;
      const token = visibility === "PRIVATE" ? new URL((await (await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "invite" } })).json()).url).pathname.split("/").pop() : undefined;
      expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join", token } })).ok()).toBe(true);
      for (const target of [host, guest]) { await target.setViewportSize({ width: 1280, height: 900 }); await target.goto(`/cinemas/${roomId}`); await expect(target.getByText("Live & synchronized")).toBeVisible(); await target.getByTestId("cinema-video").scrollIntoViewIfNeeded(); }
      if (visibility === "PRIVATE") {
        const message = "A".repeat(980); await guest.getByLabel("Chat message").fill(message); await guest.getByRole("button", { name: "Send message", exact: true }).click(); await expect(host.getByText(message, { exact: true })).toBeVisible();
      } else for (const target of [host, guest]) await expect(target.getByLabel("Chat message")).toHaveCount(0);
      await expect.poll(() => host.getByTestId("cinema-video").evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(1);
      await host.getByRole("button", { name: "Play film", exact: true }).last().click();
      await expect.poll(async () => { const tap = guest.getByRole("button", { name: "Tap to Start Watching", exact: true }); if (await tap.isVisible()) await tap.click(); return guest.getByTestId("cinema-video").evaluate((video: HTMLVideoElement) => video.currentTime); }).toBeGreaterThan(.3);
      await host.getByRole("button", { name: "Pause film", exact: true }).last().click(); await expect(guest.getByTestId("cinema-video")).toHaveJSProperty("paused", true);
      findings.push(...await theaterGeometry(host, testInfo, visibility.toLowerCase()));
      await db.cinemaRoom.update({ where: { id: roomId }, data: { title: visibility === "PRIVATE" ? "Friday, with friends" : "The world’s front row" } });
      await host.reload(); await expect(host.getByText("Live & synchronized")).toBeVisible();
      for (const width of [320, 768, 1440]) for (const theme of ["dark", "light"]) {
        await appearance(host, width, theme);
        await host.screenshot({ path: `test-results/responsive/captures/${testInfo.project.name}-${visibility.toLowerCase()}-review-${width}-${theme}.png` });
      }
      await appearance(host, 320, "dark");
      await host.getByRole("button", { name: "Playback settings", exact: true }).click();
      const settings = host.getByRole("dialog", { name: "Playback settings" }); await expect(settings).toBeVisible();
      await settings.getByLabel("Subtitle language", { exact: true }).selectOption("es");
      await expect.poll(() => host.getByTestId("cinema-video").evaluate((video: HTMLVideoElement) => Array.from(video.textTracks).find(track => track.language === "es")?.mode)).toBe("showing");
      if (await settings.getByLabel("Video quality", { exact: true }).count()) await settings.getByLabel("Video quality", { exact: true }).selectOption("0");
      expect((await new AxeBuilder({ page: host }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
      await host.keyboard.press("Escape"); await expect(settings).not.toBeVisible(); await expect(host.getByRole("button", { name: "Playback settings", exact: true })).toBeFocused();
      await guest.getByRole("button", { name: "React ❤️", exact: true }).click(); await expect(host.locator(".floating-reaction", { hasText: "❤️" })).toBeVisible();
      await host.getByRole("button", { name: "Play film", exact: true }).last().click();
      await expect.poll(() => guest.getByTestId("cinema-video").evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(.3);
      await host.getByRole("button", { name: "Pause film", exact: true }).last().click(); await expect(guest.getByTestId("cinema-video")).toHaveJSProperty("paused", true);
      // Exercise the CSS fullscreen fallback independently of native fullscreen.
      await host.evaluate(() => { HTMLElement.prototype.requestFullscreen = async () => { throw new Error("Native fullscreen unavailable in this test"); }; });
      for (const viewport of [{ width: 568, height: 320 }, { width: 844, height: 390 }, { width: 1024, height: 768 }]) {
        await host.setViewportSize(viewport); await host.getByRole("button", { name: "Fullscreen", exact: true }).click();
        await expect(host.getByRole("dialog", { name: "Fullscreen cinema" })).toBeVisible();
        expect(await host.evaluate(() => {
          const controls = document.querySelector(".glass-player-controls")!.getBoundingClientRect(), bar = document.querySelector(".reaction-bar")!.getBoundingClientRect();
          return document.documentElement.scrollWidth <= innerWidth && controls.bottom <= innerHeight + 1 && bar.top >= 0 && controls.top - bar.bottom >= 8;
        })).toBe(true);
        for (let index = 0; index < 18; index++) { await host.keyboard.press("Tab"); expect(await host.evaluate(() => Boolean(document.querySelector(".player-shell")?.contains(document.activeElement)))).toBe(true); }
        await host.keyboard.press("Escape"); await expect(host.getByRole("dialog", { name: "Fullscreen cinema" })).toHaveCount(0); await expect(host.getByRole("button", { name: "Fullscreen", exact: true })).toBeFocused();
      }
      await endScreening(host, roomId);
    }
    await writeFile(testInfo.outputPath("theater-matrix.json"), JSON.stringify(findings, null, 2));
    // A short real film must flush its ending even within the 20-second save interval.
    await host.goto(`/watch/${movieId}`); await host.getByTestId("cinema-video").scrollIntoViewIfNeeded(); await expect.poll(() => host.getByTestId("cinema-video").evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(1);
    await host.getByRole("button", { name: "Play film", exact: true }).last().click();
    await expect.poll(() => host.getByTestId("cinema-video").evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(.3);
    await host.getByRole("button", { name: "Pause film", exact: true }).last().click();
    const seek = host.getByRole("slider", { name: "Seek film", exact: true });
    const bounds = await seek.boundingBox(); expect(bounds).not.toBeNull();
    await seek.click({ position: { x: bounds!.width * .92, y: bounds!.height / 2 } });
    await expect.poll(() => host.getByTestId("cinema-video").evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(17);
    await host.getByRole("button", { name: "Play film", exact: true }).last().click();
    await expect.poll(async () => (await db.watchHistory.findUnique({ where: { userId_movieId: { userId: hostId, movieId } } }))?.position).toBeGreaterThanOrEqual(19.9);
    await host.goto("/history"); await expect(host.getByText("Watch again", { exact: true })).toBeVisible();
    await host.getByText("Watch again", { exact: true }).click(); await expect(host).toHaveURL(`/watch/${movieId}`);
    await host.getByTestId("cinema-video").scrollIntoViewIfNeeded();
    await expect.poll(() => host.getByTestId("cinema-video").evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(1);
    await expect.poll(async () => Number(await host.getByRole("slider", { name: "Seek film", exact: true }).inputValue())).toBeLessThan(.25);
    await guest.goto(`/history?userId=${hostId}`); await expect(guest.getByText("Watch again", { exact: true })).toHaveCount(0);
    await host.goto("/"); await expect(host.getByRole("heading", { name: "Recently watched", exact: true })).toBeVisible();
    expect(findings).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); await db.user.deleteMany({ where: { id: { in: [hostId, guestId].filter(Boolean) } } }); if (movieId) await db.movie.deleteMany({ where: { id: movieId } }); }
});

test("enlarged text, keyboard-height forms and modal focus remain usable", async ({ page }, testInfo) => {
  let userId = "";
  try {
    const username = `text_${Date.now().toString(36)}`;
    userId = await accountViaApi(page, username);
    const findings: unknown[] = [];
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    const routes = ["/register", "/settings", `/profile/${username}`, "/movies", "/movies/big-buck-bunny", "/cinemas/new?type=private", "/history", "/legal/cookies", "/contact"];
    for (const route of routes) {
      await page.goto(route); await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
      expect(await page.locator("body").evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(28);
      for (const width of [320, 768, 1280]) for (const theme of ["dark", "light"]) {
        await appearance(page, width, theme); const measured = await overflow(page);
        if (measured.scrollWidth > width + 1) findings.push({ route, theme, ...measured });
      }
    }
    await page.goto("/legal/cookies"); await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; }); await appearance(page, 320, "dark");
    const scrollRegion = page.getByRole("region", { name: "Scrollable cookie and storage details" }).first();
    await scrollRegion.focus(); await page.keyboard.press("ArrowRight");
    await expect.poll(() => scrollRegion.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    await page.goto("/settings"); await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; }); await appearance(page, 320, "dark");
    const deletion = page.getByRole("button", { name: "Delete account", exact: true }); await deletion.click();
    const dialog = page.getByRole("dialog", { name: "Delete your account?" }); await expect(dialog).toBeVisible();
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/responsive/captures/${testInfo.project.name}-large-text-deletion-320-dark.png` });
    await page.keyboard.press("Escape"); await expect(deletion).toBeFocused();
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; });
    await page.goto("/register"); await page.setViewportSize({ width: 390, height: 400 });
    const email = page.getByLabel("Email address", { exact: true }); await email.focus();
    await expect(page.locator("html")).toHaveAttribute("data-keyboard-open", "true");
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeHidden();
    expect(await email.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
    await expect.poll(() => email.evaluate(element => { const rect = element.getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= (window.visualViewport?.height || innerHeight) + 1; })).toBe(true);
    await email.blur(); await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await writeFile(testInfo.outputPath("enlarged-text-matrix.json"), JSON.stringify(findings, null, 2)); expect(findings).toEqual([]);
  } finally { if (userId) await db.user.deleteMany({ where: { id: userId } }); }
});

test("waiting rooms, reminders and private invitations adapt without changing playback permissions", async ({ browser }, testInfo) => {
  const contexts = await Promise.all(["America/New_York", "Asia/Tokyo"].map(timezoneId => browser.newContext({ timezoneId })));
  const [host, guest] = await Promise.all(contexts.map(context => context.newPage()));
  const suffix = Date.now().toString(36); let hostId = "", guestId = "";
  const findings: unknown[] = [];
  try {
    hostId = await accountViaApi(host, `wh_${suffix}`, { screeningAdmin: true }); guestId = await accountViaApi(guest, `wg_${suffix}`);
    await contexts[1].addInitScript(() => { const now = Date.now.bind(Date); Date.now = () => now() + 120000; });
    for (const visibility of ["PRIVATE", "PUBLIC"] as const) {
      const created = await host.request.post("/api/rooms", { headers, data: { title: visibility === "PRIVATE" ? "A premiere with friends" : "The worldwide premiere", movieId: "big-buck-bunny", visibility, capacity: 8, scheduledAt: new Date(Date.now() + 120000).toISOString() } });
      expect(created.ok()).toBe(true); const roomId = (await created.json()).id;
      const token = visibility === "PRIVATE" ? new URL((await (await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "invite" } })).json()).url).pathname.split("/").pop() : undefined;
      expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join", token } })).ok()).toBe(true);
      for (const target of [host, guest]) { await target.goto(`/cinemas/${roomId}`); await expect(target.getByRole("region", { name: "Theater waiting room" })).toBeVisible(); }
      const remaining = async (target: Page) => Number(await target.getByRole("timer", { name: "Time until screening" }).getAttribute("data-remaining"));
      await expect.poll(() => remaining(guest)).toBeGreaterThan(90); expect(Math.abs(await remaining(host) - await remaining(guest))).toBeLessThanOrEqual(2);
      await expect(host.getByRole("button", { name: "Play film", exact: true }).last()).toBeDisabled();
      await expect(guest.locator(".screening-waiting time")).toHaveAttribute("title", "Asia/Tokyo");
      await guest.getByRole("button", { name: "Remind me", exact: true }).click(); await expect(guest.getByRole("button", { name: "Cancel reminder", exact: true })).toBeVisible();
      await guest.reload(); await expect(guest.getByRole("button", { name: "Cancel reminder", exact: true })).toHaveAttribute("aria-pressed", "true");
      await guest.getByRole("button", { name: "Cancel reminder", exact: true }).click(); await expect(guest.getByRole("button", { name: "Remind me", exact: true })).toBeEnabled();
      if (visibility === "PRIVATE") {
        await guest.getByLabel("Chat message").fill("See you at the premiere 🍿"); await guest.getByRole("button", { name: "Send message", exact: true }).click(); await expect(host.getByText("See you at the premiere 🍿", { exact: true })).toBeVisible();
      } else await expect(host.getByLabel("Chat message")).toHaveCount(0);
      for (const width of widths) for (const theme of ["dark", "light"]) {
        await appearance(host, width, theme); const measured = await overflow(host); if (measured.scrollWidth > width + 1) findings.push({ visibility, theme, ...measured });
        if ([320, 768, 1440].includes(width)) await host.screenshot({ path: `test-results/responsive/captures/${testInfo.project.name}-${visibility.toLowerCase()}-waiting-${width}-${theme}.png` });
      }
      if (visibility === "PRIVATE") {
        await appearance(host, 320, "dark"); await host.getByRole("button", { name: "Invite Friends", exact: true }).click();
        const dialog = host.getByRole("dialog", { name: "Save someone a seat." }); await expect(dialog).toBeVisible(); await expect(dialog.getByLabel("Invitation link")).toHaveValue(/^http:\/\/localhost:3000\/invite\//);
        expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        await host.screenshot({ path: `test-results/responsive/captures/${testInfo.project.name}-invitation-320-dark.png` }); await host.keyboard.press("Escape");
      }
      // Move only this fixture's schedule; playback still starts through the real server path.
      await db.cinemaRoom.update({ where: { id: roomId }, data: { scheduledAt: new Date(Date.now() - 2000) } });
      if (visibility === "PUBLIC") await startDueScreenings();
      else { await host.reload(); await host.getByRole("button", { name: "Play film", exact: true }).last().click(); }
      for (const target of [host, guest]) { await expect(target.getByRole("region", { name: "Theater waiting room" })).toHaveCount(0); await expect.poll(() => target.getByTestId("cinema-video").evaluate((video: HTMLVideoElement) => video.currentTime)).toBeGreaterThan(.3); }
      await endScreening(host, roomId);
    }
    await writeFile(testInfo.outputPath("waiting-matrix.json"), JSON.stringify(findings, null, 2)); expect(findings).toEqual([]);
  } finally { await Promise.all(contexts.map(context => context.close())); await db.user.deleteMany({ where: { id: { in: [hostId, guestId].filter(Boolean) } } }); }
});
