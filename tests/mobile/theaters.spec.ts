import "dotenv/config";
import { test, expect, devices, type Page } from "@playwright/test";
import { accountViaApi } from "../e2e/helpers";
const headers = { origin:"http://localhost:3000" };

async function activate(page:Page) {
  const button=page.getByRole("button",{name:"Tap to Start Watching",exact:true});
  await expect.poll(async()=>{if(await button.isVisible())await button.click();return page.getByTestId("cinema-video").evaluate((v:HTMLVideoElement)=>!v.paused);}).toBe(true);
}
async function review(page:Page,engine:string,theater:string) {
  for(const theme of ["Dark","Light"] as const){
    await page.getByLabel("Change theme").click();await page.getByRole("button",{name:theme,exact:true}).click();await expect(page.locator("html")).toHaveAttribute("data-theme",theme.toLowerCase());
    for(const orientation of ["portrait","landscape"] as const){
      await page.setViewportSize(orientation==="portrait"?{width:390,height:844}:{width:844,height:390});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await expect(page.getByRole("button",{name:"Fullscreen",exact:true}), JSON.stringify(await page.getByTestId("cinema-video").evaluate((video:HTMLVideoElement)=>({error:video.error?{code:video.error.code,message:video.error.message}:null,readyState:video.readyState,networkState:video.networkState,currentTime:video.currentTime,paused:video.paused})))).toBeVisible();
      await page.evaluate(async()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur();scrollTo(0,0);await document.fonts.ready;await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));});
      await expect.poll(()=>page.evaluate(()=>{const bar=document.querySelector(".reaction-bar")!.getBoundingClientRect(),controls=document.querySelector(".glass-player-controls")!.getBoundingClientRect();return Math.round(controls.top-bar.bottom);})).toBeGreaterThanOrEqual(8);
      await expect.poll(()=>page.locator(".navbar").evaluate(element=>Math.round(element.getBoundingClientRect().top))).toBe(0);
      await page.screenshot({path:`test-results/mobile-engines/captures/${engine}-${theater}-${theme.toLowerCase()}-${orientation}.png`,fullPage:true,animations:"disabled"});
      await page.screenshot({path:`test-results/mobile-engines/captures/${engine}-${theater}-${theme.toLowerCase()}-${orientation}-viewport.png`,animations:"disabled"});
      if(orientation==="landscape"){
        await page.getByRole("button",{name:"Fullscreen",exact:true}).click();
        await expect.poll(()=>page.evaluate(()=>Boolean(document.fullscreenElement)||document.querySelector(".player-shell")?.classList.contains("is-expanded"))).toBe(true);
        await page.screenshot({path:`test-results/mobile-engines/captures/${engine}-${theater}-${theme.toLowerCase()}-fullscreen.png`,animations:"disabled"});
        await page.getByRole("button",{name:"Fullscreen",exact:true}).click();
      }
    }
  }
  await page.setViewportSize({width:390,height:844});
}

test("mobile browser emulation retains synchronized private chat and emoji-only public viewing",async({browser},testInfo)=>{
  test.setTimeout(150000);
  const device=testInfo.project.name.startsWith("ios")?devices["iPhone 13"]:devices["Pixel 7"];
  const {defaultBrowserType:_type,...options}=device;void _type;
  const contexts=await Promise.all([1,2].map(()=>browser.newContext({...options,baseURL:"http://localhost:3000",reducedMotion:"reduce"})));
  const [host,guest]=await Promise.all(contexts.map(c=>c.newPage())), suffix=Date.now().toString(36);let privateId="",publicId="";
  try{
    await accountViaApi(host,`mobileh_${suffix}`,{screeningAdmin:true});await accountViaApi(guest,`mobileg_${suffix}`);
    await host.goto("/cinemas/new?type=private&movie=big-buck-bunny");await host.getByLabel("Theater name").fill("Friends in the front row");await host.getByRole("button",{name:"Create theater",exact:true}).click();
    await expect(host.getByRole("dialog",{name:"Save someone a seat."})).toBeVisible();await expect(host.getByLabel("Invitation link")).toHaveValue(/^http:\/\/localhost:3000\/invite\//);
    privateId=new URL(host.url()).pathname.split("/").pop()!;const invitation=await host.getByLabel("Invitation link").inputValue();
    await guest.goto(invitation);await guest.getByRole("button",{name:"Join screening",exact:true}).click();await expect(guest.getByText("Live & synchronized")).toBeVisible();
    await host.getByRole("button",{name:"Start Watching",exact:true}).click();await activate(host);await activate(guest);
    await expect.poll(()=>guest.getByTestId("cinema-video").evaluate((v:HTMLVideoElement)=>v.currentTime)).toBeGreaterThan(.5);
    await host.getByRole("button",{name:"Pause film",exact:true}).click();await expect(guest.getByTestId("cinema-video")).toHaveJSProperty("paused",true);
    await guest.getByLabel("Chat message").fill("A private screening from a mobile browser.");await guest.getByRole("button",{name:"Send message",exact:true}).click();await expect(host.getByText("A private screening from a mobile browser.",{exact:true})).toBeVisible();
    await guest.getByRole("button",{name:"React ❤️",exact:true}).click();await expect(host.locator(".floating-reaction",{hasText:"❤️"})).toBeVisible();
    await review(host,testInfo.project.name,"private");
    await host.getByRole("button",{name:"Collapse chat",exact:true}).click();await expect(host.getByLabel("Chat message")).toHaveCount(0);await host.getByRole("button",{name:"Open chat",exact:true}).click();await expect(host.getByLabel("Chat message")).toBeVisible();
    await host.getByRole("button",{name:"Hide player controls",exact:true}).click();await expect(host.getByRole("button",{name:"Fullscreen",exact:true})).toBeHidden();await host.getByRole("button",{name:"Show player controls",exact:true}).click();
    await host.getByRole("button",{name:"Fullscreen",exact:true}).click();await expect.poll(()=>host.evaluate(()=>Boolean(document.fullscreenElement)||document.querySelector(".player-shell")?.classList.contains("is-expanded"))).toBe(true);
    await host.getByRole("button",{name:"Fullscreen",exact:true}).click();await expect.poll(()=>host.evaluate(()=>!document.fullscreenElement&&!document.querySelector(".player-shell")?.classList.contains("is-expanded"))).toBe(true);
    const created=await host.request.post("/api/rooms",{headers,data:{title:"Mobile worldwide screening",movieId:"big-buck-bunny",visibility:"PUBLIC",capacity:100}});expect(created.ok()).toBe(true);publicId=(await created.json()).id;
    await host.goto(`/cinemas/${publicId}`);await guest.goto(`/cinemas/${publicId}`);await guest.getByRole("button",{name:"Join screening",exact:true}).click();for(const page of [host,guest])await expect(page.getByText("Live & synchronized")).toBeVisible();
    for(const page of [host,guest]){await expect(page.getByLabel("Chat message")).toHaveCount(0);await expect(page.locator(".glass-chat-panel,.chat-compose,.chat-messages")).toHaveCount(0);}
    await expect(host.getByTestId("live-viewer-count")).toHaveText("2 watching");await host.getByRole("button",{name:"Play film",exact:true}).last().click();await activate(guest);await expect(guest.getByRole("button",{name:"Pause film",exact:true})).toBeDisabled();
    await guest.getByRole("button",{name:"React 😂",exact:true}).click();await expect(host.locator(".floating-reaction",{hasText:"😂"})).toBeVisible();
    await review(host,testInfo.project.name,"public");
    await guest.getByRole("button",{name:"Leave",exact:true}).click();await expect(guest).toHaveURL("/cinemas");await guest.goto(`/cinemas/${publicId}`);await guest.getByRole("button",{name:"Join screening",exact:true}).click();await expect(guest.getByText("Live & synchronized")).toBeVisible();await activate(guest);
  }finally{for(const id of [privateId,publicId].filter(Boolean))await host.request.post(`/api/rooms/${id}`,{headers,data:{action:"end"}});await Promise.all(contexts.map(c=>c.close()));}
});
