import "dotenv/config";
import { test, expect, request, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { io, type Socket } from "socket.io-client";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { accountViaApi, testPassword } from "./helpers";
import { realtimeTicket } from "../../src/lib/realtime-auth";
import { hashToken } from "../../src/lib/security";
const db = new PrismaClient(), headers = { origin: "http://localhost:3000" };
type Ack = { ok: boolean; status?: number; data?: { version?: number; position?: number }; error?: string };
test.afterAll(async () => db.$disconnect());
function emit(socket: Socket, event: string, value: unknown): Promise<Ack> { return new Promise((resolve,reject) => socket.timeout(15000).emit(event,value,(err: Error | null,data: Ack) => err ? reject(err) : resolve(data))); }
async function socketFor(ticket: string, port: number) {
  const socket = io(`http://localhost:${port}`, { auth: { ticket }, extraHeaders: { Origin: "http://localhost:3000" }, transports: ["websocket"], reconnection: false });
  await new Promise<void>((resolve,reject) => { socket.once("connect",resolve); socket.once("connect_error",reject); }); return socket;
}
async function authenticatedApi(email: string) {
  const api = await request.newContext({ baseURL: "http://localhost:3000", extraHTTPHeaders: headers });
  const { csrfToken } = await (await api.get("/api/auth/csrf")).json();
  await api.post("/api/auth/callback/credentials", { form: { csrfToken, email, password: testPassword, callbackUrl: "http://localhost:3000/" }, headers: { "X-Auth-Return-Redirect": "1" } });
  expect((await (await api.get("/api/auth/session")).json()).user?.id).toBeTruthy(); return api;
}

test("100 authenticated viewers span two workers with unique presence, isolated concurrent rooms, and authoritative reconnect", async ({ page }) => {
  test.setTimeout(180000);
  const suffix = Date.now().toString(36), hostId = await accountViaApi(page,`scaleh_${suffix}`), sockets: Socket[] = [], apis: APIRequestContext[] = [];
  const host = await db.user.findUniqueOrThrow({ where: { id: hostId } }); const actors = Array.from({length:100}, (_,i) => ({id:randomUUID(),name:`load_${suffix}_${i}`,email:`load_${suffix}_${i}@example.test`,passwordHash:host.passwordHash,emailVerified:new Date()}));
  let roomId = "", privateId = "";
  try {
    const created = await page.request.post("/api/rooms", { headers, data: {title:"Worldwide concurrency check",movieId:"big-buck-bunny",visibility:"PUBLIC",capacity:250,theme:"midnight"} }); expect(created.ok()).toBe(true); roomId=(await created.json()).id;
    await db.user.createMany({data:actors}); await db.profile.createMany({data:actors.map(a=>({userId:a.id,username:a.name,birthDate:new Date("1990-01-01")}))});
    // Ten users authenticate normally and join concurrently through HTTP; the
    // other 90 are explicit audience fixtures for the real socket fanout test.
    for (const actor of actors.slice(0,10)) apis.push(await authenticatedApi(actor.email));
    const joined=await Promise.all(apis.map(api=>api.post(`/api/rooms/${roomId}`,{data:{action:"join"}}))); expect(joined.every(r=>r.ok())).toBe(true);
    await db.roomMembership.createMany({data:actors.slice(10).map(a=>({roomId,userId:a.id}))});
    const tickets=actors.map(()=>realtimeTicket()); await db.realtimeTicket.createMany({data:actors.map((a,i)=>({tokenHash:hashToken(tickets[i]),userId:a.id,authVersion:0,expiresAt:new Date(Date.now()+3600000),region:i%2?"GB":"US"}))});
    const hostTicket=(await (await page.request.post("/api/realtime-ticket",{headers})).json()).ticket;
    const hostSocket=await socketFor(hostTicket,3001); sockets.push(hostSocket); expect((await emit(hostSocket,"join",{roomId})).ok).toBe(true);
    let presence={count:0,ids:[] as string[]}; hostSocket.on("presence",value=>{presence=value;});
    const viewerSockets = new Map<string, Socket>();
    const received = new Set<string>(), messages: unknown[] = []; let latestDelivery=0;
    const started=Date.now();
    for (let offset=0;offset<100;offset+=10) await Promise.all(actors.slice(offset,offset+10).map(async(actor,j)=>{
      const index=offset+j,socket=await socketFor(tickets[index],index%2?3003:3001); sockets.push(socket); viewerSockets.set(actor.id, socket);
      socket.on("reaction",()=>{received.add(actor.id);latestDelivery=Date.now();}); socket.on("message",m=>messages.push(m));
      expect((await emit(socket,"join",{roomId})).ok).toBe(true);
    }));
    const joinMs=Date.now()-started; await expect.poll(()=>presence.count).toBe(101);
    const duplicate=await socketFor(tickets[0],3003); sockets.push(duplicate); expect((await emit(duplicate,"join",{roomId})).ok).toBe(true); await expect.poll(()=>presence.count).toBe(101);
    const reactionStarted=Date.now(); expect((await emit(hostSocket,"reaction",{emoji:"🔥"})).ok).toBe(true); await expect.poll(()=>received.size).toBe(100); const fanoutMs=latestDelivery-reactionStarted;
    expect(fanoutMs).toBeLessThan(5000); expect((await emit(sockets[1],"message",{body:"Public chat is forbidden at scale"})).status).toBe(403);
    expect((await emit(hostSocket,"playback",{action:"play",position:20,expectedVersion:0})).ok).toBe(true);
    const disconnected=viewerSockets.get(actors[0].id)!; disconnected.disconnect(); await expect.poll(()=>presence.count).toBe(101); // Duplicate tab keeps this viewer present.
    duplicate.disconnect(); await expect.poll(()=>presence.count).toBe(100);
    disconnected.connect(); await new Promise<void>(resolve=>disconnected.once("connect",resolve)); expect((await emit(disconnected,"join",{roomId})).ok).toBe(true); await expect.poll(()=>presence.count).toBe(101);
    const synced=await emit(disconnected,"sync",{}); expect(synced.ok).toBe(true); expect(synced.data?.position).toBeGreaterThanOrEqual(20);
    const privateRoom=await page.request.post("/api/rooms",{headers,data:{title:"Concurrent friends screening",movieId:"big-buck-bunny",visibility:"PRIVATE",capacity:20,theme:"blue"}}); expect(privateRoom.ok()).toBe(true); privateId=(await privateRoom.json()).id;
    const invitation=await (await page.request.post(`/api/rooms/${privateId}`,{headers,data:{action:"invite",maxUses:1}})).json(); expect((await apis[0].post(`/api/rooms/${privateId}`,{data:{action:"join",token:invitation.url.split("/").pop()}})).ok()).toBe(true);
    const privateHost=await socketFor(hostTicket,3003),privateGuest=await socketFor(tickets[0],3001);sockets.push(privateHost,privateGuest);
    expect((await emit(privateHost,"join",{roomId:privateId})).ok).toBe(true); expect((await emit(privateGuest,"join",{roomId:privateId})).ok).toBe(true);
    let privateMessage=""; privateGuest.on("message",m=>{privateMessage=m.body;}); expect((await emit(privateHost,"message",{body:"This stays in the friends theater"})).ok).toBe(true); await expect.poll(()=>privateMessage).toContain("friends theater"); expect(messages).toEqual([]);
    expect((await emit(privateHost,"playback",{action:"seek",position:50,expectedVersion:0})).ok).toBe(true);
    expect((await db.cinemaRoom.findUniqueOrThrow({where:{id:roomId}})).playing).toBe(true);expect((await db.cinemaRoom.findUniqueOrThrow({where:{id:privateId}})).position).toBe(50);
    await mkdir("test-results/completion",{recursive:true}); await writeFile("test-results/completion/concurrency.json",JSON.stringify({authenticatedViewers:100,workers:2,uniqueWatchingCount:101,joinMs,reactionFanoutMs:fanoutMs,concurrentRooms:2},null,2));
  } finally {
    sockets.forEach(s=>s.close()); for (const id of [roomId,privateId].filter(Boolean)) await page.request.post(`/api/rooms/${id}`,{headers,data:{action:"end"}});
    await Promise.all(apis.map(api=>api.dispose())); await db.user.deleteMany({where:{id:{in:actors.map(a=>a.id)}}});
  }
});
