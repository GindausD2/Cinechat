import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { accountViaApi } from "./helpers";
const prisma = new PrismaClient();
test.afterAll(async () => prisma.$disconnect());
test("friendships, following, clubs, privacy, notifications and admin authorization", async ({ browser }) => {
  const suffix = Date.now().toString(36); const aContext = await browser.newContext(), bContext = await browser.newContext(); const a = await aContext.newPage(), b = await bContext.newPage();
  const aId = await accountViaApi(a, `sociala_${suffix}`), bId = await accountViaApi(b, `socialb_${suffix}`);
  const headers = { origin: "http://localhost:3000" };
  let r = await a.request.post("/api/community", { headers, data: { action: "follow", targetId: bId } }); expect(r.ok()).toBe(true);
  r = await a.request.post("/api/community", { headers, data: { action: "request", targetId: bId } }); expect(r.ok()).toBe(true);
  await b.goto("/community"); await expect(b.getByRole("heading", { name: "Friend requests" })).toBeVisible(); await b.getByRole("button", { name: "Accept", exact: true }).click(); await expect(b.getByText(`@sociala_${suffix}`, { exact: true }).first()).toBeVisible();
  const notices = await a.request.get("/api/notifications"); expect(JSON.stringify(await notices.json())).toContain("accepted");
  r = await a.request.post("/api/clubs", { headers, data: { action: "create", name: `Animation Society ${suffix}`, description: "A real community for open animated cinema.", genre: "Animation", color: "#d9e4c8" } }); expect(r.ok()).toBe(true); const clubId = (await r.json()).id;
  await b.goto(`/clubs/${clubId}`); await b.getByRole("button", { name: "Join club", exact: true }).click(); await expect(b.getByRole("button", { name: "Leave club", exact: true })).toBeVisible();
  // Local database fixtures let independent join requests contend for two remaining seats in the plan.
  const quotaClubs = await Promise.all([1,2,3].map(i => prisma.movieClub.create({ data: { name: `Quota fixture ${suffix}-${i}`, description: "Acceptance fixture for concurrent plan enforcement.", genre: "Animation", creatorId: aId } })));
  const quotaResults = await Promise.all(quotaClubs.map(club => b.request.post("/api/clubs", { headers, data: { action: "join", clubId: club.id } })));
  expect(quotaResults.filter(result => result.ok())).toHaveLength(2);
  expect(quotaResults.filter(result => result.status() === 403)).toHaveLength(1);
  expect(await prisma.clubMembership.count({ where: { userId: bId } })).toBe(3);
  expect((await b.request.post("/api/clubs", { headers, data: { action: "join", clubId } })).ok()).toBe(true);
  r = await b.request.patch("/api/account", { headers, data: { username: `socialb_${suffix}`, biography: "Private profile", publicProfile: false, showActivity: false, allowFriendRequests: true } }); expect(r.ok()).toBe(true);
  expect((await a.request.get(`/profile/socialb_${suffix}`)).status()).toBe(404);
  expect((await a.request.get("/api/admin")).status()).toBe(403);
  expect((await a.request.post("/api/admin", { headers, data: { action: "suspend-user", userId: bId, suspended: true, reason: "Unauthorized attempt" } })).status()).toBe(403);
  r = await a.request.post("/api/community", { headers, data: { action: "block", targetId: bId } }); expect(r.ok()).toBe(true);
  expect((await b.request.post("/api/community", { headers, data: { action: "request", targetId: aId } })).status()).toBe(403);
  expect(await prisma.friendship.count({ where: { OR: [{ senderId: aId, receiverId: bId }, { senderId: bId, receiverId: aId }] } })).toBe(0);
  // Test-only role assignment exercises server validation, never the public API.
  await prisma.user.update({ where: { id: aId }, data: { role: "ADMIN" } }); expect((await a.request.get("/api/admin")).ok()).toBe(true);
  r = await a.request.post("/api/admin", { headers, data: { action: "suspend-user", userId: bId, suspended: true, reason: "Acceptance test moderation" } }); expect(r.ok()).toBe(true);
  expect((await b.request.get("/api/notifications")).status()).toBe(401);
  await a.goto("/admin"); await expect(a.getByRole("heading", { name: "A well-run cinema." })).toBeVisible();
  await aContext.close(); await bContext.close();
});
