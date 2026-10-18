import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { accountViaApi } from "./helpers";
import AxeBuilder from "@axe-core/playwright";
const prisma = new PrismaClient();
test.afterAll(async () => prisma.$disconnect());

async function chooseTheme(page: Page, theme: "Dark" | "Light" | "System") {
  await page.getByLabel("Change theme").click();
  await page.getByRole("button", { name: theme, exact: true }).click();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function capture(page: Page, name: string, directory = "redesign") {
  await page.evaluate(() => document.fonts.ready);
  if (await page.getByTestId("cinema-video").count()) {
    await expect(page.getByText("Live & synchronized")).toBeVisible();
    await expect(page.getByTestId("cinema-video")).toHaveJSProperty("readyState",4);
  }
  // Load off-screen artwork for a complete full-page capture without changing its layout.
  await page.evaluate(() => Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>("main img")).map(image => { image.loading = "eager"; return image.decode(); })));
  await expect.poll(() => page.locator('.movie-art img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await noOverflow(page);
  // Exercise off-screen content like a scrolling viewer before capturing it.
  // Chromium can otherwise retain stale composited layers after a theme change.
  await page.evaluate(async () => {
    const paint = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) { scrollTo(0, y); await paint(); }
    scrollTo(0, 0); await paint();
  });
  await page.screenshot({ path: `test-results/${directory}/${name}.png`, fullPage: true, animations: "disabled" });
  await page.screenshot({ path: `test-results/${directory}/${name}-viewport.png`, animations: "disabled" });
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(accessibility.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => ({ target: node.target, reason: node.failureSummary })) })), name).toEqual([]);
}

test("theme follows the system, persists across reloads and tabs, and supports the keyboard", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await chooseTheme(page,"Light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("cinechat-theme"))).toBe("light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("navigation", { name: "Main navigation", exact: true }).getByRole("link", { name: "Movies", exact: true }).click();
  await expect(page).toHaveURL("/movies");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const other = await context.newPage(); await other.goto("/");
  await chooseTheme(page,"Dark");
  await expect(other.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await chooseTheme(page,"System");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Change theme").focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "System", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".theme-menu")).not.toHaveAttribute("open", "");
  await expect(page.getByLabel("Change theme")).toBeFocused();
  expect(errors).toEqual([]);
  await other.close();
});

test("discovery and movie editorial layouts render in both themes at desktop and mobile sizes", async ({ page }) => {
  for (const [device,width,height] of [["desktop",1440,1000],["mobile",390,844]] as const) {
    await page.setViewportSize({ width,height });
    await page.goto("/");
    for (const theme of ["Dark","Light"] as const) {
      await chooseTheme(page,theme); await page.reload();
      await expect(page.getByRole("heading", { level: 1, name: "Big Buck Bunny" })).toBeVisible();
      await capture(page,`home-${device}-${theme.toLowerCase()}`);
      await page.goto("/movies/big-buck-bunny");
      await expect(page.getByRole("heading", { name: "Cast & creators" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "More like this" })).toBeVisible();
      await capture(page,`movie-${device}-${theme.toLowerCase()}`);
      await page.goto("/");
    }
  }
  for (const width of [320,360,768,1024]) {
    await page.setViewportSize({ width,height:900 }); await page.goto("/"); await noOverflow(page);
  }
  await page.setViewportSize({ width: 768,height:1024 }); await page.goto("/movies"); await noOverflow(page);
  await page.setViewportSize({ width: 360,height:800 }); await page.goto("/movies"); await noOverflow(page);
  const comedy = await (await page.request.get("/api/movies?genre=Comedy")).json();
  expect(comedy.movies.length).toBeGreaterThan(0);
  expect(comedy.movies.every((movie: { genres: string[] }) => movie.genres.includes("Comedy"))).toBe(true);
  await page.getByLabel("Filter by genre").selectOption("Comedy");
  await expect(page.locator(".movie-card")).toHaveCount(comedy.movies.length);
  const destination = await page.locator(".movie-card").first().getAttribute("href");
  await page.locator(".movie-card").first().focus(); await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new URL(destination!, "http://localhost:3000").href);
});

test("cinema theme controls, chat collapse, viewer list, and public movie parties preserve privacy", async ({ browser }) => {
  const context = await browser.newContext({viewport:{width:1440,height:1000},colorScheme:"dark"});
  const page = await context.newPage();
  const userId = await accountViaApi(page,`design_${Date.now().toString(36)}`, { screeningAdmin: true });
  const headers = { origin: "http://localhost:3000" };
  await prisma.watchHistory.upsert({ where:{userId_movieId:{userId,movieId:"big-buck-bunny"}}, create:{userId,movieId:"big-buck-bunny",position:120}, update:{position:120} });
  await page.goto("/");
  await expect(page.getByRole("heading",{name:"Continue watching",exact:true})).toBeVisible();
  await expect(page.locator(".continue-card")).toContainText("8 min left");
  const response = await page.request.post("/api/rooms",{headers,data:{title:"Premium private screening",description:"An invitation-only movie night.",movieId:"big-buck-bunny",visibility:"PRIVATE",capacity:8,theme:"silver"}});
  expect(response.ok()).toBe(true); const roomId = (await response.json()).id;
  try {
    await page.goto(`/cinemas/${roomId}`);
    await expect(page.getByText("Live & synchronized")).toBeVisible();
    await expect(page.getByTestId("cinema-video")).toHaveJSProperty("readyState",4);
    for (const [device,width,height] of [["desktop",1440,1000],["mobile",390,844]] as const) {
      await page.setViewportSize({width,height});
      for (const theme of ["Dark","Light"] as const) {
        await chooseTheme(page,theme); await page.reload();
        await capture(page,`room-${device}-${theme.toLowerCase()}`);
        await page.getByRole("button", { name: "Invite Friends", exact: true }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        const dialog = await page.getByRole("dialog").boundingBox(); expect(dialog).not.toBeNull();
        expect(Math.abs(dialog!.x + dialog!.width / 2 - width / 2)).toBeLessThan(2); expect(dialog!.y).toBeGreaterThanOrEqual(15); expect(dialog!.height).toBeLessThanOrEqual(height - 31);
        await expect(page.getByLabel("Invitation link")).not.toHaveValue("");
        await capture(page,`invitation-${device}-${theme.toLowerCase()}`,"completion");
        await page.getByRole("button", { name: "Close dialog", exact: true }).click();
        await page.goto("/cinemas");
        await expect(page.getByRole("heading", { name: "Public Theater", exact: true })).toBeVisible();
        await expect(page.getByRole("heading", { name: "Private Theater", exact: true })).toBeVisible();
        await capture(page,`discovery-${device}-${theme.toLowerCase()}`,"completion");
        await page.goto(`/cinemas/${roomId}`); await expect(page.getByText("Live & synchronized")).toBeVisible();
      }
    }
    await page.getByRole("button",{name:"Collapse chat"}).click();
    await expect(page.locator(".glass-chat-panel")).toHaveCount(0);
    await page.getByRole("button",{name:"Open chat"}).click();
    await expect(page.getByLabel("Chat message")).toBeVisible();
    await page.getByRole("button",{name:/People/}).click();
    await expect(page.locator(".participant")).toHaveCount(1);
    await page.goto("/movies/big-buck-bunny");
    await expect(page.getByRole("heading",{name:"Watch it together"})).toBeVisible();
    await expect(page.getByText("Premium private screening",{exact:true})).toHaveCount(0);
    // Discover a real public screening created through the same authorized API.
    const publicResponse = await page.request.post("/api/rooms",{headers,data:{title:"Premium public screening",movieId:"big-buck-bunny",visibility:"PUBLIC",capacity:8}});
    expect(publicResponse.ok()).toBe(true); const publicId = (await publicResponse.json()).id;
    try {
      await page.reload(); await expect(page.getByText("Premium public screening",{exact:true})).toBeVisible();
      await page.goto(`/cinemas/${publicId}`); await expect(page.getByText("Live & synchronized")).toBeVisible();
      await expect(page.getByTestId("cinema-video")).toHaveJSProperty("readyState",4);
      for (const [device,width,height] of [["desktop",1440,1000],["mobile",390,844]] as const) {
        await page.setViewportSize({width,height});
        for (const theme of ["Dark","Light"] as const) {
          await chooseTheme(page,theme); await page.reload();
          await expect(page.locator(".glass-chat-panel, .chat-compose")).toHaveCount(0);
          await expect(page.getByRole("button",{name:/chat/i})).toHaveCount(0);
          await expect(page.getByRole("group",{name:"Cinema reactions"}).getByRole("button")).toHaveCount(7);
          const play = await page.locator(".center-play").boundingBox(), bar = await page.locator(".reaction-bar").boundingBox();
          expect(bar).not.toBeNull();
          if (play) expect(play.y + play.height <= bar!.y || play.y >= bar!.y + bar!.height).toBe(true);
          else await expect(page.locator(".controls-row").getByRole("button",{name:"Play film",exact:true})).toBeEnabled();
          await capture(page,`public-${device}-${theme.toLowerCase()}`,"theaters");
        }
      }
      for (const width of [320,360,768,1024]) {
        await page.setViewportSize({width,height:900}); await noOverflow(page);
        expect(await page.locator(".reaction-bar").evaluate(e => e.scrollWidth <= e.clientWidth)).toBe(true);
      }
      await page.setViewportSize({width:1440,height:1000}); await page.goto("/cinemas/new?movie=big-buck-bunny");
      for (const [device,width,height] of [["desktop",1440,1000],["mobile",390,844]] as const) {
        await page.setViewportSize({width,height});
        for (const theme of ["Dark","Light"] as const) { await chooseTheme(page,theme); await page.reload(); await capture(page,`creator-${device}-${theme.toLowerCase()}`,"theaters"); }
      }
      await page.getByRole("button",{name:/Private Theater Watch with invited friends/}).click();
      await expect(page.getByLabel("Theater name")).toBeVisible(); await expect(page.getByLabel("Access code (optional)")).toBeVisible(); await noOverflow(page);
      await page.goto("/cinemas?type=private"); await expect(page.getByRole("link",{name:/Premium private screening/})).toBeVisible(); await expect(page.getByRole("link",{name:/Premium public screening/})).toHaveCount(0);
      await page.goto("/cinemas?type=public"); await expect(page.getByRole("link",{name:/Premium public screening/})).toBeVisible(); await expect(page.getByRole("link",{name:/Premium private screening/})).toHaveCount(0);
    }
    finally { await page.request.post(`/api/rooms/${publicId}`,{headers,data:{action:"end"}}); }
  } finally {
    await page.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"end"}});
    await context.close();
  }
});
