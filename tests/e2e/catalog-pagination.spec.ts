import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient(); test.afterAll(() => db.$disconnect());

test("catalog pages handle tied creation dates, incremental results, empty results and recoverable errors", async ({ page }) => {
  const suffix = Date.now().toString(36), prefix = `Discovery ${suffix}`, ids = Array.from({length:23},(_,i)=>`page-${suffix}-${String(i).padStart(2,"0")}`);
  const original = await db.movie.findUniqueOrThrow({where:{id:"big-buck-bunny"}});
  try {
    const createdAt = new Date();
    await db.movie.createMany({data:ids.map((id,index)=>({...original,id,title:`${prefix} ${String(index).padStart(2,"0")}`,genres:["Drama"],createdAt}))});
    const first = await (await page.request.get(`/api/movies?q=${encodeURIComponent(prefix)}`)).json(); expect(first.movies).toHaveLength(18); expect(first.nextCursor).toBeTruthy();
    const second = await (await page.request.get(`/api/movies?q=${encodeURIComponent(prefix)}&cursor=${first.nextCursor}`)).json(); expect(second.movies).toHaveLength(5); expect(second.nextCursor).toBeNull();
    expect(new Set([...first.movies,...second.movies].map((movie:{id:string})=>movie.id)).size).toBe(23);
    expect((await page.request.get("/api/movies?cursor=not-a-valid-cursor")).status()).toBe(400);
    expect((await page.request.get("/api/movies?limit=5000")).status()).toBe(400);
    await page.goto(`/movies?q=${encodeURIComponent(prefix)}&genre=Drama`); await expect(page.locator(".movie-grid .movie-card")).toHaveCount(18);
    await page.getByRole("button",{name:"Load more movies",exact:true}).click(); await expect(page.locator(".movie-grid .movie-card")).toHaveCount(23); await expect(page.getByRole("button",{name:"Load more movies",exact:true})).toHaveCount(0);
    await page.getByRole("textbox",{name:"Search movies",exact:true}).fill(`No matching title ${suffix}`); await expect(page.getByRole("heading",{name:"No films found."})).toBeVisible();
    await page.route("**/api/movies?**", route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"The catalog is temporarily unavailable."})}));
    await page.getByRole("textbox",{name:"Search movies",exact:true}).fill(prefix); await expect(page.locator(".error-message[role=alert]")).toContainText("temporarily unavailable");
    await page.unroute("**/api/movies?**"); await page.getByRole("textbox",{name:"Search movies",exact:true}).fill(`${prefix} 02`); await expect(page.locator(".movie-grid .movie-card")).toHaveCount(1); await expect(page.locator(".error-message[role=alert]")).toHaveCount(0);
  } finally { await db.movie.deleteMany({where:{id:{in:ids}}}); }
});
