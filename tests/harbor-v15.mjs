import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {releaseMouse} from './input-helpers.mjs';
const service=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>window.__xiangmetaInspect());
try{
 await page.goto(service.url+'/?inspect=1');await page.locator('#world canvas').waitFor();
 await page.locator('#harbor-open').click();assert.equal(await page.locator('.harbor-route').count(),3);assert.equal(await page.locator('.harbor-route button:disabled').count(),3);
 await page.screenshot({path:'artifacts/v15-harbor-ticket.png'});await page.locator('#harbor-visit').click();await releaseMouse(page);
 await page.waitForFunction(()=>window.__xiangmetaInspect().harbor.near);assert.equal((await state()).player.y,-4.6);
 await page.screenshot({path:'artifacts/v15-harbor-pier.png'});await page.keyboard.press('f');await page.locator('[data-kind=harbor]').waitFor();await page.locator('#close-panel').click();await releaseMouse(page);
 // A complete return walk and re-entry, not just teleportation.
 await page.locator('#world canvas').focus();await page.keyboard.down('s');await page.waitForFunction(()=>window.__xiangmetaInspect().player.z<8.2);await page.keyboard.up('s');assert.ok(Math.abs((await state()).player.y)<.01);
 await page.keyboard.down('w');await page.waitForFunction(()=>window.__xiangmetaInspect().player.z>23.8);await page.keyboard.up('w');assert.ok((await state()).harbor.near);
 await page.keyboard.press('Space');await page.waitForFunction(()=>!window.__xiangmetaInspect().player.grounded);await page.waitForFunction(()=>window.__xiangmetaInspect().player.grounded);assert.equal((await state()).player.y,-4.6);
 await page.locator('#collections').click();await page.locator('[data-exhibit=weiming]').click();await page.locator('[data-tab=story]').click();
 const titles=await page.locator('.timeline h3').allTextContents();assert.match(titles[0],/2026.06.16/);assert.match(titles[1],/2026.07.06/);assert.match(await page.locator('.timeline').innerText(),/计划于中秋发布/);await page.screenshot({path:'artifacts/v15-team-timeline.png'});await page.locator('#close-panel').click();await releaseMouse(page);
 for(const width of [900,760]){await page.setViewportSize({width,height:760});await page.locator('#harbor-open').click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const overflow=await page.locator('#panel-content').evaluate(e=>e.scrollWidth-e.clientWidth);assert.ok(overflow<2);await page.locator('#harbor-visit').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/v15-harbor-${width}.png`});await page.locator('#close-panel').click();await releaseMouse(page);}
 await page.setViewportSize({width:1500,height:960});await page.locator('#overview').click();await page.waitForTimeout(400);await page.screenshot({path:'artifacts/v15-world-overview.png'});
 assert.deepEqual(errors,[]);console.log('PASS: locked harbor routes, real ramp walk both ways, below-zero jump landing, boarding F, chronological team archive, compact UI and shader compile');
}catch(e){await page.screenshot({path:'artifacts/v15-harbor-failure.png'});console.error(await state(),errors);throw e;}
finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
