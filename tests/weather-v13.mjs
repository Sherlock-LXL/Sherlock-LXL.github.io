import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {releaseMouse} from './input-helpers.mjs';
const service=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(service.url+'/?inspect=1');await page.locator('#world canvas').waitFor();await page.locator('#sound').click();
 const centered=async selector=>{const b=await page.locator(selector).boundingBox(),s=await page.locator(selector+' svg').boundingBox();assert.ok(Math.abs(b.x+b.width/2-s.x-s.width/2)<1);assert.ok(Math.abs(b.y+b.height/2-s.y-s.height/2)<1);};await centered('#sound');
 const slash=await page.locator('.muted-slash').boundingBox(),button=await page.locator('#sound').boundingBox();assert.ok(Math.abs(slash.x+slash.width/2-button.x-button.width/2)<1);assert.ok(Math.abs(slash.y+slash.height/2-button.y-button.height/2)<1);
 await page.locator('#memory-open').click();await page.locator('#atlas-visit').click();await releaseMouse(page);
 const initial=await page.evaluate(()=>window.__xiangmetaInspect().weather.motionTime);await page.waitForTimeout(500);assert.ok(await page.evaluate(t=>window.__xiangmetaInspect().weather.motionTime>t,initial));
 for(const kind of ['cloudy','overcast','rain','snow']){
  await page.locator('#sky-settings').click();await centered('#close-panel');assert.equal(await page.locator('#weather-select option').count(),6);await page.locator('#weather-select').selectOption(kind);await page.keyboard.press('Escape');await releaseMouse(page);
  await page.waitForFunction(kind=>{const w=window.__xiangmetaInspect().weather;return w.kind===kind&&!w.transitioning;},kind,{timeout:45000});
  await page.screenshot({path:`artifacts/v13-weather-${kind}.png`});
 }
 await page.keyboard.press('p');await page.locator('#photo-toolbar').waitFor();const frozen=await page.evaluate(()=>window.__xiangmetaInspect().weather);await page.waitForTimeout(800);assert.deepEqual(await page.evaluate(()=>window.__xiangmetaInspect().weather),frozen);await page.locator('#photo-exit').click();
 assert.deepEqual(errors,[]);console.log('PASS: centered close/music icons, moving clouds, four completed smooth weather transitions, photo weather freeze');
}finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
