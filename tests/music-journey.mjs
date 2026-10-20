import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {releaseMouse} from './input-helpers.mjs';
const service=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const context=await browser.newContext({viewport:{width:1280,height:800}});
await context.addInitScript(()=>{const Original=window.Audio;window.testAudio=[];window.Audio=function(src){const a=new Original(src);window.testAudio.push(a);return a;};window.Audio.prototype=Original.prototype;localStorage.setItem('xiangmeta:seasonal-music:v1',JSON.stringify(['season-summer-v1','season-autumn-v1','season-winter-v1']));});
const page=await context.newPage();
const current=()=>page.evaluate(()=>window.testAudio.findLast(a=>!a.paused&&a.src.includes('/backing-'))?.src);
try{
  await page.goto(service.url);await page.locator('#world canvas').waitFor();await page.waitForFunction(()=>window.testAudio.some(a=>!a.paused&&a.src.includes('/backing-')&&a.currentTime>.1));
  const played=[];
  for(let i=0;i<7;i++){const src=await current();played.push(src);await page.waitForFunction(src=>{const a=window.testAudio.findLast(a=>a.src===src);return a&&Number.isFinite(a.duration)&&a.duration>1;},src);await page.evaluate(src=>{const a=window.testAudio.findLast(a=>a.src===src);a.currentTime=a.duration-.08;},src);await page.waitForFunction(src=>window.testAudio.some(a=>a.src.includes('/backing-')&&a.src!==src&&!a.paused&&a.currentTime>.1),src,{timeout:15000});}
  assert.equal(new Set(played).size,7,'one full playlist round must not repeat');assert.notEqual(await current(),played.at(-1));
  await page.locator('[data-region="weiming-studio"]').click();await page.waitForFunction(()=>window.testAudio.some(a=>a.src.endsWith('/summer.mp3')&&!a.paused&&a.currentTime>.1));
  for(let i=0;i<3;i++){await releaseMouse(page);await page.locator('[data-region="ai-mountain"]').click();await page.locator('[data-region="weiming-studio"]').click();}assert.equal(await page.evaluate(()=>window.testAudio.filter(a=>a.src.endsWith('/summer.mp3')).length),1);
  await page.reload();await page.locator('#world canvas').waitFor();await page.locator('[data-region="weiming-studio"]').click();await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.testAudio.some(a=>a.src.endsWith('/summer.mp3'))),false);
  const next=await context.newPage();await next.goto(service.url);await next.locator('#world canvas').waitFor();await next.locator('[data-region="weiming-studio"]').click();await next.waitForFunction(()=>window.testAudio.some(a=>a.src.endsWith('/summer.mp3')&&!a.paused&&a.currentTime>.1));await next.close();
  console.log('PASS: seven automatic song changes without repeats, old lifetime records do not suppress a new journey, rapid re-entry/reload dedupe, next journey receives its seasonal cue');
}finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
