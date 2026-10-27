import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import AxeBuilder from "@axe-core/playwright";
import { accountViaApi, testPassword } from "./helpers";
const db = new PrismaClient(), headers = { origin: "http://localhost:3000" };
test.afterAll(async () => db.$disconnect());

async function captureThemes(page: Page, name: string) {
  for (const theme of ["dark", "light"]) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/watching/${name}-${theme}.png` });
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
}

test("discovery, verified people, theater choice, unread private chat and public viewing form one real journey", async ({ browser }) => {
  test.setTimeout(180000);
  const contexts = await Promise.all([browser.newContext({ colorScheme: "dark", viewport: { width: 1440, height: 1000 } }), browser.newContext({ colorScheme: "dark" })]);
  const [host, guest] = await Promise.all(contexts.map(context => context.newPage()));
  const users: string[] = [], suffix = Date.now().toString(36);
  try {
    users.push(await accountViaApi(host, `jh_${suffix}`, { screeningAdmin: true }), await accountViaApi(guest, `jg_${suffix}`));
    await host.goto("/movies"); await host.getByRole("textbox", { name: "Search movies", exact: true }).fill("Big Buck"); await expect(host.locator(".movie-card")).toHaveCount(1); await host.locator(".movie-card").click();
    await expect(host).toHaveURL("/movies/big-buck-bunny"); await expect(host.getByTestId("cinema-video")).toHaveCount(0);
    await expect(host.getByRole("heading", { name: "Cast & crew", exact: true })).toBeVisible();
    await captureThemes(host, "movie-desktop");
    await host.setViewportSize({ width: 390, height: 844 }); await captureThemes(host, "movie-mobile");
    await host.setViewportSize({ width: 320, height: 844 });
    const credits = host.locator(".credit-card"); await credits.first().focus();
    for (let index = 0; index < await credits.count(); index++) {
      if (index) await host.keyboard.press("Tab");
      await expect.poll(() => credits.nth(index).evaluate(element => { const card = element.getBoundingClientRect(), rail = element.closest(".cast-rail")!.getBoundingClientRect(); return element === document.activeElement && card.left >= rail.left - 1 && card.right <= rail.right + 1; })).toBe(true);
    }
    await host.setViewportSize({ width: 1440, height: 1000 });
    await host.locator(".credit-card").filter({ hasText: "Ton Roosendaal" }).click(); await expect(host).toHaveURL("/people/ton-roosendaal");
    await expect(host.getByRole("heading", { name: "Ton Roosendaal", exact: true })).toBeVisible(); await expect(host.getByText(/William Maanders, 2008/)).toBeVisible();
    await captureThemes(host, "person-desktop");
    await host.setViewportSize({ width: 320, height: 844 }); await captureThemes(host, "person-mobile"); await host.setViewportSize({ width: 1440, height: 1000 });
    await host.locator(".filmography-entry .movie-card").filter({ hasText: "Sintel" }).click(); await expect(host).toHaveURL("/movies/sintel");
    await expect(host.getByRole("link", { name: "Watch now", exact: true })).toHaveCount(0);
    await host.locator(".credit-card").filter({ hasText: "Halina Reijn" }).click(); await expect(host.getByRole("heading", { name: "Halina Reijn", exact: true })).toBeVisible();
    await expect(host.locator(".credit-role")).toContainText("Voice actor · Sintel");
    await host.locator(".filmography-entry .movie-card").click(); await host.locator(".credit-card").filter({ hasText: "Ton Roosendaal" }).click();
    await host.locator(".filmography-entry .movie-card").filter({ hasText: "Big Buck Bunny" }).click();
    const publicCreated = await host.request.post("/api/rooms", { headers, data: { title: "Journey public screening", movieId: "big-buck-bunny", visibility: "PUBLIC", capacity: 8 } }); expect(publicCreated.ok()).toBe(true); const publicId = (await publicCreated.json()).id;
    await host.getByRole("link", { name: "Watch now", exact: true }).click(); await expect(host).toHaveURL("/movies/big-buck-bunny/watch");
    await expect(host.getByRole("navigation", { name: "Theater choices" })).toBeVisible();
    const before = await db.cinemaRoom.count({ where: { hostId: users[0] } });
    await host.reload(); expect(await db.cinemaRoom.count({ where: { hostId: users[0] } })).toBe(before);
    await captureThemes(host, "watch-choice-desktop");
    await host.getByRole("link", { name: "Create private theater", exact: true }).click();
    await expect(host.getByLabel("Tonight’s film")).toHaveValue("big-buck-bunny"); await host.getByLabel("Theater name").fill("Journey with friends"); await host.getByRole("button", { name: "Create theater", exact: true }).click();
    await expect(host.getByText("Live & synchronized")).toBeVisible(); const privateId = new URL(host.url()).pathname.split("/").pop()!;
    await expect(host.getByRole("dialog", { name: "Save someone a seat." })).toBeVisible(); await expect(host.getByLabel("Invitation link")).toHaveValue(/^http:\/\/localhost:3000\/invite\//);
    const invitation = await host.getByLabel("Invitation link").inputValue(); await host.getByRole("button", { name: "Close dialog", exact: true }).click();
    await guest.goto(invitation); await guest.getByRole("button", { name: "Join screening", exact: true }).click(); await expect(guest.getByText("Live & synchronized")).toBeVisible();
    const video = await host.getByTestId("cinema-video").elementHandle();
    await host.getByRole("button", { name: "Play film", exact: true }).last().click();
    for (const page of [host, guest]) await expect.poll(() => page.getByTestId("cinema-video").evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(1);
    await host.getByRole("button", { name: "Collapse chat", exact: true }).click();
    await guest.getByLabel("Chat message").fill("A new message while chat is closed 🍿"); await guest.getByRole("button", { name: "Send message", exact: true }).click();
    await expect(host.getByRole("status", { name: "1 unread private message" })).toBeVisible();
    await host.getByRole("button", { name: "Open chat", exact: true }).click(); await expect(host.getByText("A new message while chat is closed 🍿", { exact: true })).toBeVisible(); await expect(host.locator(".unread-badge")).toHaveCount(0);
    expect(await video!.evaluate(element => element.isConnected && element === document.querySelector("video"))).toBe(true);
    expect(await video!.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(1);
    await host.setViewportSize({ width: 390, height: 844 }); await host.getByLabel("Chat message").fill("A draft while the film keeps playing");
    await expect.poll(() => host.evaluate(() => { const chat = document.querySelector(".glass-chat-panel")!.getBoundingClientRect(), info = document.querySelector(".cinema-film-info")!.getBoundingClientRect(); return chat.top >= info.bottom - 1; })).toBe(true);
    await captureThemes(host, "private-chat-mobile");
    await host.getByRole("button", { name: "Pause film", exact: true }).last().click(); await expect(guest.getByTestId("cinema-video")).toHaveJSProperty("paused", true);
    await guest.getByRole("button", { name: "Leave", exact: true }).click(); await expect(guest).toHaveURL("/cinemas"); await guest.goto(`/cinemas/${privateId}`); await guest.getByRole("button", { name: "Join screening", exact: true }).click(); await expect(guest.getByText("A new message while chat is closed 🍿", { exact: true })).toBeVisible();
    await host.goto(`/movies/big-buck-bunny?room=${privateId}`); await host.getByRole("link", { name: "Watch now", exact: true }).click(); await expect(host).toHaveURL(`/cinemas/${privateId}`);
    expect(await db.cinemaRoom.count({ where: { hostId: users[0] } })).toBe(before + 1);
    await host.goto("/movies/big-buck-bunny/watch"); await host.locator(`.screening-card[href="/cinemas/${publicId}"]`).click();
    await guest.goto(`/cinemas/${publicId}`); await guest.getByRole("button", { name: "Join screening", exact: true }).click();
    for (const page of [host, guest]) { await expect(page.getByText("Live & synchronized")).toBeVisible(); await expect(page.getByLabel("Chat message")).toHaveCount(0); }
    await host.getByRole("button", { name: "Play film", exact: true }).last().click();
    await expect.poll(() => guest.getByTestId("cinema-video").evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(1);
    await guest.getByRole("button", { name: "React ❤️", exact: true }).click(); await expect(host.locator(".floating-reaction", { hasText: "❤️" })).toBeVisible();
    expect((await guest.request.post(`/api/rooms/${publicId}`, { headers, data: { action: "message", body: "Not permitted" } })).status()).toBe(403);
  } finally { await Promise.allSettled(contexts.map(context => context.close())); await db.user.deleteMany({ where: { id: { in: users } } }); }
});

test("watch options disclose no private rooms or media URLs without a fresh invitation grant", async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]); const [host, outsider] = await Promise.all(contexts.map(context => context.newPage()));
  const users: string[] = [], suffix = Date.now().toString(36); let futureId = "";
  try {
    users.push(await accountViaApi(host, `oh_${suffix}`), await accountViaApi(outsider, `oo_${suffix}`));
    const created = await host.request.post("/api/rooms", { headers, data: { title: "Invitation protected choice", movieId: "big-buck-bunny", visibility: "PRIVATE", capacity: 8 } }); expect(created.ok()).toBe(true); const id = (await created.json()).id;
    const options = await outsider.request.get("/api/movies/big-buck-bunny/watch-options"); expect(options.ok()).toBe(true); expect(JSON.stringify(await options.json())).not.toContain(id);
    await outsider.goto(`/movies/big-buck-bunny/watch?room=${id}`); await expect(outsider.getByRole("heading", { name: "This seat is empty.", exact: true })).toBeVisible();
    const invitation = await (await host.request.post(`/api/rooms/${id}`, { headers, data: { action: "invite" } })).json();
    expect((await outsider.request.post(`/api/rooms/${id}`, { headers, data: { action: "join", token: new URL(invitation.url).pathname.split("/").pop() } })).ok()).toBe(true);
    const allowed = await (await outsider.request.get("/api/movies/big-buck-bunny/watch-options")).json(); expect(allowed.privateTheaters.some((room: { id: string }) => room.id === id)).toBe(true); expect(JSON.stringify(allowed)).not.toContain("http://localhost:3002");
    expect((await host.request.post(`/api/rooms/${id}`, { headers, data: { action: "revoke-invite", invitationId: invitation.id } })).ok()).toBe(true);
    const revoked = await (await outsider.request.get("/api/movies/big-buck-bunny/watch-options")).json(); expect(revoked.privateTheaters.some((room: { id: string }) => room.id === id)).toBe(false);
    const anonymous = await browser.newContext(); try { const page = await anonymous.newPage(); await page.goto("/login"); expect((await page.request.get("/api/movies/big-buck-bunny/watch-options")).status()).toBe(401); const profile = await page.request.get("/api/people/ton-roosendaal"); expect(profile.ok()).toBe(true); expect(JSON.stringify(await profile.json())).not.toContain("http://localhost:3002");
      await page.goto("/movies/big-buck-bunny"); await page.getByRole("link", { name: "Watch now", exact: true }).click(); await expect(page).toHaveURL(/\/login\?returnTo=/);
      await page.getByLabel("Email address", { exact: true }).fill(`oh_${suffix}@example.com`); await page.getByLabel("Password", { exact: true }).fill(testPassword); await page.getByRole("button", { name: "Sign in", exact: true }).click(); await expect(page).toHaveURL("/movies/big-buck-bunny/watch");
    } finally { await anonymous.close(); }
    const original = await db.movie.findUniqueOrThrow({ where: { id: "big-buck-bunny" }, include: { sources: true } }); const { id: _id, createdAt: _createdAt, sources, ...metadata } = original; void _id; void _createdAt;
    futureId = `future-${suffix}`; await db.movie.create({ data: { ...metadata, id: futureId, title: "Upcoming licensed test screening", sources: { create: { url: sources[0].url, authorized: true, enabled: true, validFrom: new Date(Date.now() + 3600000), license: sources[0].license, rightsUrl: sources[0].rightsUrl, attribution: sources[0].attribution } } } });
    await host.goto(`/movies/${futureId}`); await expect(host.getByRole("link", { name: "Watch now", exact: true })).toHaveCount(0); await expect(host.getByText(/Authorized playback is upcoming/)).toBeVisible();
    expect((await host.request.get(`/api/movies/${futureId}/watch-options`)).status()).toBe(451);
    expect((await host.request.get("/api/people/not-a-real-profile")).status()).toBe(404);
  } finally { await Promise.allSettled(contexts.map(context => context.close())); await db.user.deleteMany({ where: { id: { in: users } } }); if (futureId) await db.movie.deleteMany({ where: { id: futureId } }); }
});

test("overlay controls hide when idle, keyboard restores them, and subtitles stay clear without a player restart", async ({ page }) => {
  let userId = "", movieId = "";
  try {
    userId = await accountViaApi(page, `pc_${Date.now().toString(36)}`);
    const original = await db.movie.findUniqueOrThrow({ where: { id: "big-buck-bunny" }, include: { sources: true } }); const { id: _id, createdAt: _createdAt, sources, ...metadata } = original; void _id; void _createdAt;
    movieId = `player-${Date.now().toString(36)}`;
    await db.movie.create({ data: { ...metadata, id: movieId, title: "Big Buck Bunny · Player acceptance fixture", sources: { create: { url: sources[0].url, format: "mp4", authorized: true, enabled: true, license: sources[0].license, rightsUrl: sources[0].rightsUrl, attribution: sources[0].attribution, subtitleUrl: "http://localhost:3002/hls/captions.vtt", subtitles: { create: { language: "es", label: "Español", url: "http://localhost:3002/hls/captions.es.vtt" } } } } } });
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(`/watch/${movieId}`);
    const video = await page.getByTestId("cinema-video").elementHandle(); await page.getByLabel("Subtitle language", { exact: true }).selectOption("es");
    await expect.poll(() => video!.evaluate((element: HTMLVideoElement) => Array.from(element.textTracks).find(track => track.language === "es")?.cues?.length || 0)).toBeGreaterThan(0);
    const line = () => video!.evaluate((element: HTMLVideoElement) => (Array.from(element.textTracks).find(track => track.language === "es")?.cues?.[0] as VTTCue | undefined)?.line);
    const diagnostic = await video!.evaluate((element: HTMLVideoElement) => { const cue = Array.from(element.textTracks).find(track => track.language === "es")?.cues?.[0] as VTTCue | undefined; const controls = document.querySelector(".glass-player-controls")!; return { cueType: cue?.constructor.name, nativeCue: typeof VTTCue !== "undefined" && cue instanceof VTTCue, snap: cue?.snapToLines, line: cue?.line, controlsPosition: getComputedStyle(controls).position, controlsHeight: controls.getBoundingClientRect().height, playerClass: controls.parentElement?.className }; });
    await expect.poll(async () => { const value = await line(); return typeof value === "number" && value < 0; }, { message: JSON.stringify(diagnostic) }).toBe(true);
    await page.getByRole("button", { name: "Play film", exact: true }).last().click(); await page.mouse.move(1, 1);
    await expect(page.locator(".player-shell")).toHaveClass(/auto-controls-hidden/); await expect.poll(line).toBe("auto");
    await page.getByRole("button", { name: "Hide player controls", exact: true }).focus(); await expect(page.locator(".player-shell")).not.toHaveClass(/auto-controls-hidden/); await expect.poll(line).toBeLessThan(0);
    await page.setViewportSize({ width: 390, height: 844 }); await expect.poll(line).toBe("auto");
    expect(await video!.evaluate(element => element.isConnected && element === document.querySelector("video"))).toBe(true);
    await expect.poll(() => video!.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(1);
    await page.getByRole("button", { name: "Pause film", exact: true }).last().click(); await captureThemes(page, "subtitles-mobile");
  } finally { if (userId) await db.user.deleteMany({ where: { id: userId } }); if (movieId) await db.movie.deleteMany({ where: { id: movieId } }); }
});
