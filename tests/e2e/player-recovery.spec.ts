import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { io, type Socket } from "socket.io-client";
import { accountViaApi } from "./helpers";
const db = new PrismaClient(), headers = { origin: "http://localhost:3000" };
test.afterAll(async () => db.$disconnect());
async function socketFor(ticket: string) {
  const socket = io("http://localhost:3001", { auth: {ticket}, transports:["websocket"], extraHeaders:{Origin:"http://localhost:3000"}, reconnection:false });
  await new Promise<void>((resolve,reject)=>{socket.once("connect",resolve);socket.once("connect_error",reject);}); return socket;
}
function emit(socket: Socket,event:string,data:unknown): Promise<{ok:boolean;status?:number}> {return new Promise((resolve,reject)=>socket.timeout(8000).emit(event,data,(err:Error|null,value:{ok:boolean;status?:number})=>err?reject(err):resolve(value)));}

test("buffering, failed media reload, authoritative seek recovery, and mobile fullscreen fallback",async({page})=>{
  await accountViaApi(page,`recover_${Date.now().toString(36)}`); let id=""; let socket:Socket|undefined;
  try {
    const room=await page.request.post("/api/rooms",{headers,data:{title:"Playback recovery check",movieId:"big-buck-bunny",visibility:"PUBLIC",capacity:100}});expect(room.ok()).toBe(true);id=(await room.json()).id;
    socket=await socketFor((await(await page.request.post("/api/realtime-ticket",{headers})).json()).ticket);expect((await emit(socket,"join",{roomId:id})).ok).toBe(true);expect((await emit(socket,"playback",{action:"seek",position:35,expectedVersion:0})).ok).toBe(true);
    let release:()=>void=()=>{};const held=new Promise<void>(resolve=>{release=resolve;});
    await page.route("http://localhost:3002/big-buck-bunny.mp4",async route=>{await held;await route.continue();});
    await page.goto(`/cinemas/${id}`,{waitUntil:"domcontentloaded"});await expect(page.locator(".player-loading")).toBeVisible();release();
    await expect(page.getByTestId("cinema-video")).toHaveJSProperty("readyState",4);await expect.poll(async()=>Math.abs(await page.getByTestId("cinema-video").evaluate((v:HTMLVideoElement)=>v.currentTime)-35)).toBeLessThan(1);
    await page.unroute("http://localhost:3002/big-buck-bunny.mp4");
    let fail=true;await page.route("http://localhost:3002/big-buck-bunny.mp4",route=>fail?route.abort("failed"):route.continue());
    await page.reload();await expect(page.getByRole("button",{name:"Reload media",exact:true})).toBeVisible();fail=false;await page.getByRole("button",{name:"Reload media",exact:true}).click();
    await expect(page.getByTestId("cinema-video")).toHaveJSProperty("readyState",4);await expect.poll(async()=>Math.abs(await page.getByTestId("cinema-video").evaluate((v:HTMLVideoElement)=>v.currentTime)-35)).toBeLessThan(1);
    expect((await db.cinemaRoom.findUniqueOrThrow({where:{id}})).playbackVersion).toBe(1);
    // Simulate a browser requiring a user gesture. Recovery must start this
    // device without sending a new pause/seek to every viewer.
    await page.getByTestId("cinema-video").evaluate((element: HTMLVideoElement) => { const play = element.play.bind(element); let blocked = true; element.play = () => { if (blocked) { blocked = false; return Promise.reject(new DOMException("User gesture required", "NotAllowedError")); } return play(); }; });
    expect((await emit(socket,"playback",{action:"play",position:35,expectedVersion:1})).ok).toBe(true);
    await expect(page.getByRole("button",{name:"Start playback",exact:true})).toBeVisible(); await page.getByRole("button",{name:"Start playback",exact:true}).click();
    await expect(page.getByTestId("cinema-video")).toHaveJSProperty("paused",false); expect((await db.cinemaRoom.findUniqueOrThrow({where:{id}})).playbackVersion).toBe(2);
    await page.setViewportSize({width:390,height:844});await page.evaluate(()=>Object.defineProperty(HTMLElement.prototype,"requestFullscreen",{configurable:true,value:undefined}));
    await page.getByRole("button",{name:"Fullscreen",exact:true}).click();await expect(page.locator(".player-shell")).toHaveClass(/is-expanded/);await expect(page.getByRole("group",{name:"Cinema reactions"})).toBeVisible();await page.keyboard.press("Escape");await expect(page.locator(".player-shell")).not.toHaveClass(/is-expanded/);
  }finally{socket?.close();if(id)await page.request.post(`/api/rooms/${id}`,{headers,data:{action:"end"}});}
});

test("real HLS variants expose quality selection and load authorized subtitle cues",async({page})=>{
  await accountViaApi(page,`hls_${Date.now().toString(36)}`);const suffix=Date.now().toString(36),movieId=`hls-fixture-${suffix}`;let roomId="";
  const original=await db.movie.findUniqueOrThrow({where:{id:"big-buck-bunny"},include:{sources:true}});
  const {sources: _sources,id:_id,createdAt:_createdAt,...metadata}=original;void _sources;void _id;void _createdAt;
  try{
    await db.movie.create({data:{...metadata,id:movieId,title:"Licensed HLS viewing check",durationSeconds:20,sources:{create:{url:"http://localhost:3002/hls/master.m3u8",format:"hls",subtitleUrl:"http://localhost:3002/hls/captions.vtt",authorized:true,enabled:true,license:"CC BY 3.0",rightsUrl:original.sources[0].rightsUrl,attribution:"Big Buck Bunny © 2008 Blender Foundation. 20-second excerpt resized for HLS acceptance testing. CC BY 3.0."}}}});
    const room=await page.request.post("/api/rooms",{headers,data:{title:"Authorized HLS screening",movieId,visibility:"PUBLIC",capacity:20}});expect(room.ok()).toBe(true);roomId=(await room.json()).id;
    await page.goto(`/cinemas/${roomId}`);await expect(page.getByText("Live & synchronized")).toBeVisible();await expect(page.getByLabel("Video quality",{exact:true})).toBeVisible();await expect(page.getByTestId("cinema-video")).toHaveJSProperty("readyState",4);
    await page.getByRole("button",{name:"Toggle subtitles",exact:true}).click();await expect(page.getByRole("button",{name:"Toggle subtitles",exact:true})).toHaveAttribute("aria-pressed","true");
    await expect.poll(()=>page.getByTestId("cinema-video").evaluate((v:HTMLVideoElement)=>(v.textTracks[0]?.cues?.length||0))).toBeGreaterThan(0);
    await page.getByLabel("Video quality",{exact:true}).selectOption("1");await page.getByRole("button",{name:"Play film",exact:true}).last().click();await expect.poll(()=>page.getByTestId("cinema-video").evaluate((v:HTMLVideoElement)=>v.videoHeight)).toBe(180);
    await page.getByLabel("Video quality",{exact:true}).selectOption("0");await expect.poll(()=>page.getByTestId("cinema-video").evaluate((v:HTMLVideoElement)=>v.videoHeight)).toBe(90);
    await page.getByLabel("Video quality",{exact:true}).selectOption("-1");await expect(page.getByLabel("Video quality",{exact:true})).toHaveValue("-1");
    await page.setViewportSize({width:320,height:700});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{if(roomId){await page.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"end"}});await db.cinemaRoom.delete({where:{id:roomId}});}await db.movie.deleteMany({where:{id:movieId}});}
});

test("trusted regional availability remains enforced for HTTP and WebSockets, including hosts",async({page})=>{
  await accountViaApi(page,`region_${Date.now().toString(36)}`);const suffix=Date.now().toString(36),movieId=`region-${suffix}`;let roomId="";let socket:Socket|undefined;
  const original=await db.movie.findUniqueOrThrow({where:{id:"big-buck-bunny"},include:{sources:true}});const {sources,id:_id,createdAt:_createdAt,...metadata}=original;void _id;void _createdAt;const {id:_sourceId,movieId:_movieId,...source}=sources[0];void _sourceId;void _movieId;
  try{
    await db.movie.create({data:{...metadata,id:movieId,title:"Regional availability fixture",sources:{create:{...source,regions:["US"]}}}});
    const room=await page.request.post("/api/rooms",{headers:{...headers,"x-vercel-ip-country":"US"},data:{title:"Region-restricted screening",movieId,visibility:"PUBLIC",capacity:100}});expect(room.ok()).toBe(true);roomId=(await room.json()).id;
    expect((await page.request.get(`/api/rooms/${roomId}`,{headers:{"x-vercel-ip-country":"GB"}})).status()).toBe(451);
    const ticket=(await(await page.request.post("/api/realtime-ticket",{headers:{...headers,"x-vercel-ip-country":"GB"}})).json()).ticket;
    socket=await socketFor(ticket);expect((await emit(socket,"join",{roomId})).status).toBe(451);
    expect((await page.request.get(`/api/rooms/${roomId}`,{headers:{"x-vercel-ip-country":"US"}})).ok()).toBe(true);
  }finally{socket?.close();if(roomId){await page.request.post(`/api/rooms/${roomId}`,{headers,data:{action:"end"}});await db.cinemaRoom.delete({where:{id:roomId}});}await db.movie.deleteMany({where:{id:movieId}});}
});
