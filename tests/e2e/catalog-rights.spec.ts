import "dotenv/config";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { accountViaApi } from "./helpers";
const db=new PrismaClient(), headers={origin:"http://localhost:3000"};test.afterAll(()=>db.$disconnect());

test("the administrator form persists licensed subtitle tracks, preserves existing tracks and rejects unsafe rights updates",async({browser})=>{
  const contexts=await Promise.all([1,2].map(()=>browser.newContext()));const [admin,viewer]=await Promise.all(contexts.map(c=>c.newPage())),suffix=Date.now().toString(36),id=`rights-${suffix}`;
  try{
    await accountViaApi(admin,`rightsh_${suffix}`,{screeningAdmin:true});await accountViaApi(viewer,`rightsv_${suffix}`);
    expect((await viewer.request.post("/api/admin",{headers,data:{action:"save-source"}})).status()).toBe(403);
    const original=await db.movie.findUniqueOrThrow({where:{id:"big-buck-bunny"}});
    const created=await admin.request.post("/api/admin",{headers,data:{...original,action:"create-movie",id,title:`Licensed caption fixture ${suffix}`}});expect(created.ok()).toBe(true);
    await admin.goto("/admin");await admin.getByRole("button",{name:"Add or update media rights",exact:true}).click();const dialog=admin.getByRole("dialog",{name:"Media authorization",exact:true});await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox",{name:"Movie",exact:true}).selectOption(id);await dialog.getByLabel("Approved media delivery URL").fill("http://localhost:3002/big-buck-bunny.mp4");
    await dialog.getByLabel("English subtitle URL (optional)").fill("http://localhost:3002/hls/captions.vtt");await dialog.getByLabel(/^Additional subtitle tracks/).fill("es | Español | http://localhost:3002/hls/captions.es.vtt");
    await dialog.getByLabel("License or distribution agreement").fill("CC BY 3.0");await dialog.getByLabel("Rights evidence URL").fill("https://peach.blender.org/about/");await dialog.getByLabel("Attribution",{exact:true}).fill("Big Buck Bunny © 2008 Blender Foundation. Caption fixture text for licensed CC BY 3.0 media.");
    await dialog.getByLabel("Rights start",{exact:true}).fill("2020-01-01T00:00");
    for(const name of ["Distribution rights documented","Authorized","Enable playback"])await dialog.getByRole("checkbox",{name,exact:true}).check();
    await dialog.getByRole("button",{name:"Save catalog record",exact:true}).click();await expect(dialog).toBeHidden();
    const source=await db.mediaSource.findFirstOrThrow({where:{movieId:id},include:{subtitles:true}});expect(source.subtitles.map(track=>track.language)).toEqual(["es"]);
    const result=await(await viewer.request.get(`/api/movies?q=${encodeURIComponent(`Licensed caption fixture ${suffix}`)}`)).json();expect(result.movies[0].subtitles).toEqual([{language:"en",label:"English"},{language:"es",label:"Español"}]);expect(JSON.stringify(result)).not.toContain(source.url);expect(JSON.stringify(result)).not.toContain(".vtt");
    const {subtitles:_tracks,...current}=source;void _tracks;const update={...current,action:"save-source",rightsConfirmed:true};
    expect((await admin.request.post("/api/admin",{headers,data:{...update,rightsConfirmed:false}})).status()).toBe(400);
    expect((await admin.request.post("/api/admin",{headers,data:{...update,subtitles:[{language:"es",label:"Español",url:"https://unapproved.example/captions.vtt"}]}})).status()).toBe(400);
    expect((await admin.request.post("/api/admin",{headers,data:update})).ok()).toBe(true);expect(await db.subtitleTrack.count({where:{mediaSourceId:source.id}})).toBe(1);
    await expect(db.subtitleTrack.create({data:{mediaSourceId:source.id,language:"invalid!",label:"Invalid",url:source.url}})).rejects.toThrow();
    await expect(db.subtitleTrack.create({data:{mediaSourceId:source.id,language:"es",label:"Duplicate",url:source.url}})).rejects.toThrow();
    expect(await db.moderationAction.count({where:{targetId:source.id,action:"save-source-rights"}})).toBe(2);
  }finally{await db.movie.deleteMany({where:{id}});await Promise.all(contexts.map(c=>c.close()));}
});
