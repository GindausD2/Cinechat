import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { io, type Socket } from "socket.io-client";
import { accountViaApi } from "./helpers";
const db = new PrismaClient(), headers = { origin: "http://localhost:3000" };
test.afterAll(() => db.$disconnect());
type Ack = { ok: boolean; status?: number; data?: { version: number } };
function emit(socket:Socket,event:string,data:unknown):Promise<Ack>{return new Promise((resolve,reject)=>socket.timeout(8000).emit(event,data,(error:Error|null,ack:Ack)=>error?reject(error):resolve(ack)));}

test("two browsers correct asymmetric latency and stale frames, then recover private history and playback on reconnect",async({browser})=>{
  test.setTimeout(120000);
  const contexts=await Promise.all([1,2].map(()=>browser.newContext({reducedMotion:"reduce"})));
  const [host,guest]=await Promise.all(contexts.map(c=>c.newPage())), suffix=Date.now().toString(36);let roomId="";let socket:Socket|undefined;
  let staleReleased=false, delayStale=false;
  try{
    await accountViaApi(host,`delayh_${suffix}`);await accountViaApi(guest,`delayg_${suffix}`);
    await contexts[1].addInitScript(()=>{const now=Date.now.bind(Date);Date.now=()=>now()+90000;});
    // Real server connections, with asymmetric network delay. Deliberately send
    // revision 2 after revision 3 to exercise stale-event rejection as well.
    await contexts[1].routeWebSocket(/^ws:\/\/localhost:3001\/socket\.io\//,route=>{
      const server=route.connectToServer(), timers=new Set<ReturnType<typeof setTimeout>>();let closed=false;
      const later=(action:()=>void,delay:number)=>{const timer=setTimeout(()=>{timers.delete(timer);if(!closed)action();},delay);timers.add(timer);};
      route.onMessage(message=>later(()=>server.send(message),90));
      server.onMessage(message=>{
        let stale=false;
        if(delayStale&&typeof message==="string"&&message.startsWith('42["playback",')){
          const [,state]=JSON.parse(message.slice(2)) as [string,{version:number}];stale=state.version===2;
        }
        later(()=>{route.send(message);if(stale)staleReleased=true;},stale?2200:350);
      });
      const stop=()=>{closed=true;for(const timer of timers)clearTimeout(timer);timers.clear();};
      route.onClose((code,reason)=>{stop();void server.close({code,reason});});
      server.onClose((code,reason)=>{stop();void route.close({code,reason});});
    });
    const created=await host.request.post("/api/rooms",{headers,data:{title:"A screening through a slow connection",movieId:"big-buck-bunny",visibility:"PRIVATE",capacity:8}});expect(created.ok()).toBe(true);roomId=(await created.json()).id;
    const invitation=await(await host.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"invite"}})).json();expect((await guest.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"join",token:invitation.url.split("/").pop()}})).ok()).toBe(true);
    const ticket=(await(await host.request.post("/api/realtime-ticket",{headers})).json()).ticket;
    socket=io("http://localhost:3001",{auth:{ticket},transports:["websocket"],extraHeaders:{Origin:headers.origin},reconnection:false});
    await new Promise<void>((resolve,reject)=>{socket!.once("connect",resolve);socket!.once("connect_error",reject);});expect((await emit(socket,"join",{roomId})).ok).toBe(true);
    expect((await emit(socket,"playback",{action:"play",position:40,expectedVersion:0})).ok).toBe(true);
    for(const page of [host,guest]){await page.goto(`/cinemas/${roomId}`);await expect(page.getByText("Live & synchronized")).toBeVisible();}
    const drift=async()=>{const positions=await Promise.all([host,guest].map(page=>page.getByTestId("cinema-video").evaluate((v:HTMLVideoElement)=>v.currentTime)));return Math.abs(positions[0]-positions[1]);};
    await expect.poll(drift,{timeout:8000}).toBeLessThan(1.5);await expect.poll(()=>guest.getByTestId("cinema-video").evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(40);
    delayStale=true;
    expect((await emit(socket,"playback",{action:"seek",position:70,expectedVersion:1})).ok).toBe(true);
    expect((await emit(socket,"playback",{action:"pause",position:90,expectedVersion:2})).ok).toBe(true);
    await expect.poll(()=>staleReleased).toBe(true);await expect(guest.getByTestId("cinema-video")).toHaveJSProperty("paused",true);
    await expect.poll(async()=>Math.abs(await guest.getByTestId("cinema-video").evaluate((v:HTMLVideoElement)=>v.currentTime)-90)).toBeLessThan(.5);
    expect((await emit(socket,"playback",{action:"play",position:0,expectedVersion:1})).status).toBe(409);
    await guest.getByLabel("Chat message").fill("Delayed delivery remains a private conversation.");await guest.getByRole("button",{name:"Send message",exact:true}).click();await expect(host.getByText("Delayed delivery remains a private conversation.",{exact:true})).toBeVisible();await expect(guest.getByText("Delayed delivery remains a private conversation.",{exact:true})).toBeVisible();
    await expect(guest.getByTestId("cinema-video")).toHaveJSProperty("paused",true);await expect.poll(async()=>Math.abs(await guest.getByTestId("cinema-video").evaluate((v:HTMLVideoElement)=>v.currentTime)-90)).toBeLessThan(.5);
    await guest.getByRole("button",{name:"React 😮",exact:true}).click();await expect(host.locator(".floating-reaction",{hasText:"😮"})).toBeVisible();
    await contexts[1].setOffline(true);await expect(guest.getByText("Live & synchronized")).toHaveCount(0);await expect(host.getByTestId("live-viewer-count")).toHaveText("1 watching",{timeout:45000});
    expect((await emit(socket,"playback",{action:"play",position:110,expectedVersion:3})).ok).toBe(true);
    expect((await host.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"message",body:"Saved while your connection was away."}})).ok()).toBe(true);
    await contexts[1].setOffline(false);await expect(guest.getByText("Live & synchronized")).toBeVisible();await expect(host.getByTestId("live-viewer-count")).toHaveText("2 watching");
    await expect(guest.getByText("Saved while your connection was away.",{exact:true})).toBeVisible();await expect.poll(drift,{timeout:8000}).toBeLessThan(1.5);
    await expect.poll(()=>guest.getByTestId("cinema-video").evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(110);
    expect((await db.cinemaRoom.findUniqueOrThrow({where:{id:roomId}})).playbackVersion).toBe(4);
  }finally{socket?.close();await contexts[1].setOffline(false);if(roomId)await host.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"end"}});await Promise.all(contexts.map(c=>c.close()));}
});
