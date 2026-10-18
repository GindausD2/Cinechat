import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { io, type Socket } from "socket.io-client";
import { accountViaApi, emailToken, testPassword } from "./helpers";
import { sendDueReminders } from "../../src/lib/reminders";
const db = new PrismaClient(); const headers = { origin: "http://localhost:3000" };
test.afterAll(async () => db.$disconnect());
type Ack = { ok: boolean; status?: number; error?: string; data?: { id?: string } };
function emit(socket: Socket, event: string, data: unknown): Promise<Ack> { return new Promise((resolve,reject) => socket.timeout(7000).emit(event,data,(err: Error | null, result: Ack) => err ? reject(err) : resolve(result))); }
async function socketFor(ticket: string) {
  const socket = io("http://localhost:3001", { auth: { ticket }, transports: ["websocket"], extraHeaders: { Origin: "http://localhost:3000" }, reconnection: false });
  await new Promise<void>((resolve,reject) => { socket.once("connect", resolve); socket.once("connect_error", reject); }); return socket;
}
test("capacity race, WebSocket permissions, moderation, reports and reminder delivery", async ({ browser }) => {
  const suffix = Date.now().toString(36); const contexts = await Promise.all([1,2,3].map(() => browser.newContext())); const pages = await Promise.all(contexts.map(c => c.newPage()));
  const [a,b,c] = pages; const aId = await accountViaApi(a,`sechost_${suffix}`, { screeningAdmin: true }); const bId = await accountViaApi(b,`secguest_${suffix}`); await accountViaApi(c,`secextra_${suffix}`);
  const created = await a.request.post("/api/rooms", { headers, data: { title: "Capacity test screening", movieId: "big-buck-bunny", visibility: "PUBLIC", capacity: 2 } }); expect(created.ok()).toBe(true); const roomId = (await created.json()).id;
  const joins = await Promise.all([b,c].map(p => p.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join" } })));
  expect(joins.filter(r => r.ok())).toHaveLength(1); expect(joins.filter(r => r.status()===409)).toHaveLength(1);
  const member = joins[0].ok() ? b : c; const memberId = (await (await member.request.get("/api/auth/session")).json()).user.id;
  const token = (await (await member.request.post("/api/realtime-ticket", { headers })).json()).ticket;
  const socket = await socketFor(token); expect((await emit(socket,"join",{roomId})).ok).toBe(true);
  expect((await emit(socket,"playback",{action:"play",expectedVersion:0,position:0})).status).toBe(403);
  expect((await emit(socket,"message",{body:"Public text is forbidden"})).status).toBe(403);
  // Message moderation remains a private-theater feature; use a real invitation
  // to enter a separate private screening with the same authenticated socket.
  const privateResponse = await a.request.post("/api/rooms",{headers,data:{title:"Private moderation screening",movieId:"big-buck-bunny",visibility:"PRIVATE",capacity:8}});
  expect(privateResponse.ok()).toBe(true); const privateId = (await privateResponse.json()).id;
  const invitationResponse = await a.request.post(`/api/rooms/${privateId}`,{headers,data:{action:"invite",maxUses:1}});
  expect(invitationResponse.ok()).toBe(true); const invitationToken = (await invitationResponse.json()).url.split("/").pop();
  expect((await member.request.post(`/api/rooms/${privateId}`,{headers,data:{action:"join",token:invitationToken}})).ok()).toBe(true);
  expect((await emit(socket,"join",{roomId:privateId})).ok).toBe(true);
  const sent = await emit(socket,"message",{body:"Please review this message"}); expect(sent.ok).toBe(true); const messageId = sent.data?.id;
  let r = await a.request.post(`/api/rooms/${privateId}`,{headers,data:{action:"moderate",targetId:memberId,command:"mute"}}); expect(r.ok()).toBe(true);
  expect((await emit(socket,"message",{body:"Muted message"})).status).toBe(403);
  r = await a.request.post("/api/reports",{headers,data:{roomId:privateId,messageId,reason:"spam",details:"Acceptance moderation report"}}); expect(r.ok()).toBe(true); const reportId = (await r.json()).id;
  await db.user.update({where:{id:aId},data:{role:"ADMIN"}});
  r = await a.request.post("/api/admin",{headers,data:{action:"review-report",reportId,status:"RESOLVED",deleteMessage:true,reason:"Acceptance review"}}); expect(r.ok()).toBe(true);
  expect((await db.chatMessage.findUniqueOrThrow({where:{id:messageId}})).deleted).toBe(true);
  r = await a.request.post(`/api/rooms/${privateId}`,{headers,data:{action:"moderate",targetId:memberId,command:"remove"}}); expect(r.ok()).toBe(true);
  expect((await member.request.post(`/api/rooms/${privateId}`,{headers,data:{action:"join"}})).status()).toBe(403);
  const rejected = io("http://localhost:3001",{auth:{ticket:token+"tampered"},transports:["websocket"],extraHeaders:{Origin:"http://localhost:3000"},reconnection:false});
  const invalid = await new Promise<string>(resolve => rejected.once("connect_error", e => resolve(e.message))); expect(invalid).toContain("Unauthorized"); rejected.close(); socket.close();
  const schedule = new Date(Date.now()+600000).toISOString(); const upcoming = await a.request.post("/api/rooms",{headers,data:{title:"Reminder test screening",movieId:"big-buck-bunny",visibility:"PUBLIC",capacity:8,scheduledAt:schedule}}); expect(upcoming.ok()).toBe(true); const scheduledId = (await upcoming.json()).id;
  r = await b.request.post("/api/reminders",{headers,data:{roomId:scheduledId,enabled:true}}); expect(r.ok()).toBe(true);
  expect(await sendDueReminders()).toBeGreaterThanOrEqual(1); await sendDueReminders(); expect(await db.notification.count({where:{userId:bId,dedupeKey:`reminder:${scheduledId}:${bId}`}})).toBe(1);
  const crossOrigin = await a.request.post("/api/rooms",{headers:{origin:"https://attacker.example"},data:{title:"Bad origin",movieId:"big-buck-bunny",visibility:"PUBLIC",capacity:8}}); expect(crossOrigin.status()).toBe(403);
  await a.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"end"}}); await a.request.post(`/api/rooms/${privateId}`,{headers,data:{action:"end"}}); await a.request.post(`/api/rooms/${scheduledId}`,{headers,data:{action:"end"}});
  await Promise.all(contexts.map(ctx=>ctx.close()));
});
test("password reset invalidates sessions, tokens are one-time, billing remains disabled and deletion removes data", async ({ page }) => {
  const username = `reset_${Date.now().toString(36)}`; const id = await accountViaApi(page,username); const email = `${username}@example.com`;
  expect((await page.request.post("/api/billing",{headers,data:{action:"checkout"}})).status()).toBe(503);
  expect((await page.request.post("/api/billing/webhook",{data:{type:"checkout.session.completed"}})).status()).toBe(503);
  let r = await page.request.post("/api/account/email",{headers,data:{action:"request-reset",email}}); expect(r.ok()).toBe(true); const token = await emailToken(email,"Reset"); const password = "A-new-CineChat-password-987";
  r = await page.request.post("/api/account/email",{headers,data:{action:"reset",token,password}}); expect(r.ok()).toBe(true);
  expect((await page.request.get("/api/notifications")).status()).toBe(401);
  expect((await page.request.post("/api/account/email",{headers,data:{action:"reset",token,password:testPassword}})).status()).toBe(400);
  await page.goto("/login"); await page.getByLabel("Email address").fill(email); await page.getByLabel("Password",{exact:true}).fill(password); await page.getByRole("button",{name:"Sign in",exact:true}).click(); await expect(page).toHaveURL("/");
  r = await page.request.delete("/api/account",{headers,data:{confirmEmail:email,password}}); expect(r.ok()).toBe(true);
  expect(await db.user.findUnique({where:{id}})).toBeNull(); expect(await db.profile.findUnique({where:{userId:id}})).toBeNull(); expect((await page.request.get("/api/notifications")).status()).toBe(401);
});
