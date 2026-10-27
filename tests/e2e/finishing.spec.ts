import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { accountViaApi } from "./helpers";
import { sendDueReminders } from "../../src/lib/reminders";

const db = new PrismaClient(), headers = { origin: "http://localhost:3000" };
test.afterAll(async () => db.$disconnect());

test("expired private invitation access prevents screening reminder delivery", async ({ browser }) => {
  const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
  const [host, guest] = await Promise.all(contexts.map(context => context.newPage()));
  const suffix = Date.now().toString(36); let roomId = "";
  try {
    await accountViaApi(host, `remhost_${suffix}`); const guestId = await accountViaApi(guest, `remguest_${suffix}`);
    const created = await host.request.post("/api/rooms", { headers, data: { title: "Invitation reminder review", movieId: "big-buck-bunny", visibility: "PRIVATE", capacity: 4, scheduledAt: new Date(Date.now() + 600000).toISOString() } });
    expect(created.ok()).toBe(true); roomId = (await created.json()).id;
    const invitation = await (await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "invite" } })).json();
    expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join", token: new URL(invitation.url).pathname.split("/").pop() } })).ok()).toBe(true);
    expect((await guest.request.post("/api/reminders", { headers, data: { roomId, enabled: true } })).ok()).toBe(true);
    // Expiration need not change ACTIVE membership or wait for a broker event.
    await db.invitation.update({ where: { id: invitation.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await sendDueReminders();
    expect(await db.notification.findUnique({ where: { dedupeKey: `reminder:${roomId}:${guestId}` } })).toBeNull();
  } finally {
    if (roomId) await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "end" } });
    await Promise.all(contexts.map(context => context.close()));
  }
});
