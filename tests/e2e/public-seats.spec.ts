import "dotenv/config";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { io,type Socket } from "socket.io-client";
import { accountViaApi } from "./helpers";
import { renewMemberships } from "../../src/lib/seat-renewal";
const db=new PrismaClient(),headers={origin:"http://localhost:3000"};test.afterAll(()=>db.$disconnect());
type Ack={ok:boolean;status?:number};
function emit(socket:Socket,event:string,data:unknown):Promise<Ack>{return new Promise((resolve,reject)=>socket.timeout(8000).emit(event,data,(error:Error|null,ack:Ack)=>error?reject(error):resolve(ack)));}
async function socketFor(page:Page,port=3001){const ticket=(await(await page.request.post("/api/realtime-ticket",{headers})).json()).ticket;const socket=io(`http://localhost:${port}`,{auth:{ticket},transports:["websocket"],extraHeaders:{Origin:headers.origin},reconnection:false});await new Promise<void>((resolve,reject)=>{socket.once("connect",resolve);socket.once("connect_error",reject);});return socket;}

test("expired public seats free capacity, returning viewers recheck it, and heartbeat renewal cannot revive an expired seat",async({browser})=>{
  const contexts=await Promise.all([1,2,3].map(()=>browser.newContext()));const [host,first,second]=await Promise.all(contexts.map(c=>c.newPage())),suffix=Date.now().toString(36);let id="",privateId="";const sockets:Socket[]=[];
  try{
    const hostId=await accountViaApi(host,`seath_${suffix}`,{screeningAdmin:true}),firstId=await accountViaApi(first,`seata_${suffix}`),secondId=await accountViaApi(second,`seatb_${suffix}`);
    const created=await host.request.post("/api/rooms",{headers,data:{title:"Seats for the current audience",movieId:"big-buck-bunny",visibility:"PUBLIC",capacity:2}});expect(created.ok()).toBe(true);id=(await created.json()).id;
    await host.goto(`/cinemas/${id}`);await expect(host.getByText("Live & synchronized")).toBeVisible();
    expect((await first.request.post(`/api/rooms/${id}`,{headers,data:{action:"join"}})).ok()).toBe(true);const old=await socketFor(first);sockets.push(old);expect((await emit(old,"join",{roomId:id})).ok).toBe(true);await expect(host.getByTestId("live-viewer-count")).toHaveText("2 watching");
    expect((await second.request.post(`/api/rooms/${id}`,{headers,data:{action:"join"}})).status()).toBe(409);
    old.close();await expect(host.getByTestId("live-viewer-count")).toHaveText("1 watching");
    const expired=new Date(Date.now()-46000);
    await db.roomMembership.update({where:{roomId_userId:{roomId:id,userId:firstId}},data:{lastSeenAt:expired}});
    await db.roomMembership.create({data:{roomId:id,userId:secondId,status:"ACTIVE",lastSeenAt:expired}});
    expect((await first.request.get(`/api/rooms/${id}`)).status()).toBe(403);
    await first.goto(`/cinemas/${id}`);await expect(first.getByRole("button",{name:"Join screening",exact:true})).toBeVisible();await expect(first.getByTestId("cinema-video")).toHaveCount(0);
    const results=await Promise.all([first,second].map(page=>page.request.post(`/api/rooms/${id}`,{headers,data:{action:"join"}})));expect(results.filter(response=>response.ok())).toHaveLength(1);expect(results.filter(response=>response.status()===409)).toHaveLength(1);
    const winner=results[0].ok()?first:second,loser=results[0].ok()?second:first,loserId=results[0].ok()?secondId:firstId;
    const returning=await socketFor(loser,3003);sockets.push(returning);expect((await emit(returning,"join",{roomId:id})).status).toBe(409);
    expect((await winner.request.post(`/api/rooms/${id}`,{headers,data:{action:"leave"}})).ok()).toBe(true);
    expect((await emit(returning,"join",{roomId:id})).ok).toBe(true);await expect(host.getByTestId("live-viewer-count")).toHaveText("2 watching");
    const duplicate=await socketFor(loser);sockets.push(duplicate);expect((await emit(duplicate,"join",{roomId:id})).ok).toBe(true);await expect(host.getByTestId("live-viewer-count")).toHaveText("2 watching");
    returning.close();duplicate.close();await expect(host.getByTestId("live-viewer-count")).toHaveText("1 watching");
    // Renewal starts while the seat is valid but waits for a room lock until it
    // expires. Check the cutoff after acquiring that lock, never before it.
    let renewal:Promise<Set<string>>|undefined;
    await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "CinemaRoom" WHERE id = ${id} FOR UPDATE`;
      await tx.roomMembership.update({where:{roomId_userId:{roomId:id,userId:loserId}},data:{lastSeenAt:new Date(Date.now()-44800)}});
      renewal=renewMemberships({id,hostId,visibility:"PUBLIC"},[loserId]);
      await new Promise(resolve=>setTimeout(resolve,450));
    });
    expect((await renewal!).has(loserId)).toBe(false);
    const privateRoom=await host.request.post("/api/rooms",{headers,data:{title:"Friends retain invited seats",movieId:"big-buck-bunny",visibility:"PRIVATE",capacity:2}});expect(privateRoom.ok()).toBe(true);privateId=(await privateRoom.json()).id;
    const invite=await(await host.request.post(`/api/rooms/${privateId}`,{headers,data:{action:"invite"}})).json();expect((await first.request.post(`/api/rooms/${privateId}`,{headers,data:{action:"join",token:invite.url.split("/").pop()}})).ok()).toBe(true);
    await db.roomMembership.update({where:{roomId_userId:{roomId:privateId,userId:firstId}},data:{lastSeenAt:expired}});expect((await first.request.get(`/api/rooms/${privateId}`)).ok()).toBe(true);
  }finally{for(const socket of sockets)socket.close();for(const roomId of [id,privateId].filter(Boolean))await host.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"end"}});await Promise.all(contexts.map(c=>c.close()));}
});
