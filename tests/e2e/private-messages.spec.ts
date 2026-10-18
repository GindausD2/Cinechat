import "dotenv/config";
import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { io, type Socket } from "socket.io-client";
import { accountViaApi } from "./helpers";
import { publishRoomEvent } from "../../src/lib/events";
const db = new PrismaClient(), headers = { origin: "http://localhost:3000" };
test.afterAll(() => db.$disconnect());
type Ack = { ok: boolean; status?: number; data?: { id: string } };
function emit(socket: Socket, event: string, data: unknown): Promise<Ack> { return new Promise((resolve,reject) => socket.timeout(7000).emit(event,data,(error: Error | null,ack: Ack) => error ? reject(error) : resolve(ack))); }
async function socketFor(page: Page, port: number) {
  const response = await page.request.post("/api/realtime-ticket", { headers }); expect(response.ok()).toBe(true);
  const socket = io(`http://localhost:${port}`, { auth: { ticket: (await response.json()).ticket }, transports: ["websocket"], extraHeaders: { Origin: headers.origin }, reconnection: false });
  await new Promise<void>((resolve,reject) => { socket.once("connect",resolve); socket.once("connect_error",reject); }); return socket;
}

test("private messages are retry-safe, deletable by their author or host, and never accessible after removal", async ({ browser }) => {
  const contexts = await Promise.all([1,2,3].map(() => browser.newContext({ reducedMotion: "reduce" })));
  const [host,guest,outsider] = await Promise.all(contexts.map(c => c.newPage())), suffix = Date.now().toString(36); let roomId = ""; const sockets: Socket[] = [];
  try {
    const hostName = `deleteh_${suffix}`, guestName = `deleteg_${suffix}`;
    await accountViaApi(host,hostName); const guestId = await accountViaApi(guest,guestName); await accountViaApi(outsider,`deleteo_${suffix}`);
    const response = await host.request.post("/api/rooms", { headers, data: { title: "A private conversation", movieId: "big-buck-bunny", visibility: "PRIVATE", capacity: 8 } }); expect(response.ok()).toBe(true); roomId = (await response.json()).id;
    const invitation = await (await host.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "invite" } })).json();
    expect((await guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action: "join", token: invitation.url.split("/").pop() } })).ok()).toBe(true);
    await host.goto(`/cinemas/${roomId}`); await guest.goto(`/cinemas/${roomId}`); for (const page of [host,guest]) await expect(page.getByText("Live & synchronized")).toBeVisible();
    const hostSocket = await socketFor(host,3001), guestSocket = await socketFor(guest,3003), outsiderSocket = await socketFor(outsider,3003); sockets.push(hostSocket,guestSocket,outsiderSocket);
    for (const socket of [hostSocket,guestSocket]) expect((await emit(socket,"join",{roomId})).ok).toBe(true);
    expect((await emit(outsiderSocket,"join",{roomId})).status).toBe(404);
    const clientNonce = randomUUID(), body = "Retried across two transports, stored once.";
    const [sent, retried] = await Promise.all([emit(guestSocket,"message",{body,clientNonce}), guest.request.post(`/api/rooms/${roomId}`, { headers, data: { action:"message",body,clientNonce } })]);
    expect(sent.ok).toBe(true); expect(retried.ok()).toBe(true); const messageId = sent.data!.id; expect((await retried.json()).id).toBe(messageId);
    expect(await db.chatMessage.count({where:{roomId,userId:guestId,clientNonce}})).toBe(1);
    await expect(host.getByText(body,{exact:true})).toBeVisible(); await expect(guest.getByText(body,{exact:true})).toBeVisible();
    expect((await outsider.request.post(`/api/rooms/${roomId}`, { headers,data:{action:"message-delete",messageId} })).status()).toBe(404);
    expect((await outsider.request.get(`/api/rooms/${roomId}`)).status()).toBe(404);
    await guest.locator(".chat-message",{hasText:body}).getByRole("button",{name:`Delete message by ${guestName}`,exact:true}).click();
    for (const page of [host,guest]) await expect(page.getByText(body,{exact:true})).toHaveCount(0);
    expect((await guest.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"message-delete",messageId}})).ok()).toBe(true);
    expect(await db.moderationAction.count({where:{targetId:messageId,action:"message:delete-own"}})).toBe(1);
    expect((await emit(guestSocket,"message",{body,clientNonce})).status).toBe(410);
    // Model a committed message whose first broker publication was interrupted.
    const recoveryNonce=randomUUID(),recoveryBody="Recovered after an interrupted publication.";
    const committed=await db.chatMessage.create({data:{roomId,userId:guestId,body:recoveryBody,clientNonce:recoveryNonce}});
    const retry=await emit(guestSocket,"message",{body:recoveryBody,clientNonce:recoveryNonce});expect(retry.ok).toBe(true);expect(retry.data!.id).toBe(committed.id);
    await expect(host.getByText(recoveryBody,{exact:true})).toBeVisible();expect(await db.chatMessage.count({where:{roomId,clientNonce:recoveryNonce}})).toBe(1);
    await db.chatMessage.update({where:{id:committed.id},data:{deleted:true}});
    expect((await emit(guestSocket,"message-delete",{messageId:committed.id})).ok).toBe(true);await expect(host.getByText(recoveryBody,{exact:true})).toHaveCount(0);
    const hostMessage = await host.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"message",body:"A message only its author or host can remove."}}); const hostMessageId = (await hostMessage.json()).id;
    expect((await emit(guestSocket,"message-delete",{messageId:hostMessageId})).status).toBe(403);
    expect((await guest.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"message-delete",messageId:hostMessageId}})).status()).toBe(403);
    const moderated = await emit(guestSocket,"message",{body:"The host will moderate this message."}); expect(moderated.ok).toBe(true);
    await expect(host.getByText("The host will moderate this message.",{exact:true})).toBeVisible();
    await host.locator(".chat-message",{hasText:"The host will moderate this message."}).getByRole("button",{name:`Delete message by ${guestName}`,exact:true}).click();
    await expect(guest.getByText("The host will moderate this message.",{exact:true})).toHaveCount(0);
    expect(await db.moderationAction.count({where:{targetId:moderated.data!.id,action:"message:moderate"}})).toBe(1);
    // A delayed broker notification cannot restore content already deleted in PG.
    await publishRoomEvent({roomId,type:"message",data:{id:messageId,userId:guestId,body,name:guestName,image:null,createdAt:new Date().toISOString()}});
    expect((await emit(guestSocket,"message",{body:"Following the deletion notification."})).ok).toBe(true);
    await expect(host.getByText("Following the deletion notification.",{exact:true})).toBeVisible(); await expect(host.getByText(body,{exact:true})).toHaveCount(0);
    await guest.reload(); await expect(guest.getByText("Live & synchronized")).toBeVisible(); await expect(guest.getByText(body,{exact:true})).toHaveCount(0);
    await contexts[0].grantPermissions(["clipboard-read","clipboard-write"]);
    await host.getByRole("button",{name:"Invite Friends",exact:true}).click(); await expect(host.getByRole("dialog",{name:"Save someone a seat."})).toBeVisible(); await expect(host.getByLabel("Invitation link")).toHaveValue(/^http:\/\/localhost:3000\/invite\//); const invite = await host.getByLabel("Invitation link").inputValue();
    await host.getByRole("button",{name:"Copy invitation",exact:true}).click(); await expect(host.getByRole("button",{name:"Copied",exact:true})).toBeVisible(); expect(await host.evaluate(() => navigator.clipboard.readText())).toBe(invite);
    await host.getByRole("button",{name:"Start Watching",exact:true}).click(); await expect(host.getByRole("dialog")).toHaveCount(0);
    await expect.poll(() => guest.getByTestId("cinema-video").evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.5);
    expect((await host.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"moderate",targetId:guestId,command:"remove"}})).ok()).toBe(true);
    await expect(guest.getByRole("heading",{name:"Intermission."})).toBeVisible(); expect((await emit(guestSocket,"message-delete",{messageId:hostMessageId})).ok).toBe(false);
    expect((await guest.request.get(`/api/rooms/${roomId}`)).status()).toBe(404);
  } finally { for (const socket of sockets) socket.close(); if(roomId) await host.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"end"}}); await Promise.all(contexts.map(c=>c.close())); }
});
