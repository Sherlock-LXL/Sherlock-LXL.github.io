import { releaseMouse } from './input-helpers.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createServer } from '../backend/server.mjs';
await mkdir('artifacts',{recursive:true});
const service=await createServer({port:0});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:960}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
  window.notes=[];const start=OscillatorNode.prototype.start;
  OscillatorNode.prototype.start=function(...args){window.notes.push(this.frequency.value);return start.apply(this,args);};
});
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('xiangmeta:visitor:v1')??'{}'));
async function openProduct(id){await page.locator('#collections').click();await page.locator(`[data-exhibit="${id}"]`).click();await page.locator('#visit').click();await releaseMouse(page);await page.locator('#interaction-prompt').waitFor();await page.keyboard.press('f');await page.locator('#inspector.product-mode').waitFor();}
async function step(key,axis,target){
  await page.keyboard.down(key);
  try{await page.waitForFunction(({axis,target,decreasing})=>{const p=Number(document.querySelector('#coordinate').textContent.match(/-?\d+\.\d+/g)[axis]);return decreasing?p<=target:p>=target;},{axis,target,decreasing:key==='a'||key==='w'},{timeout:5000});}
  finally{await page.keyboard.up(key);}
}
try{
  await page.goto(service.url);await page.locator('#world canvas').waitFor();await page.waitForTimeout(800);
  assert.equal(await page.locator('#stamp-count').innerText(),'0/4');await page.keyboard.press('r');assert.equal((await saved()).discoveries?.length??0,0);
  await openProduct('xianglm');
  const font=await page.locator('#model-result').evaluate(e=>{const s=getComputedStyle(e);return [s.fontFamily,s.fontSize,s.lineHeight];});await page.keyboard.press('Escape');await releaseMouse(page);
  await openProduct('poetry');assert.deepEqual(await page.locator('#model-result').evaluate(e=>{const s=getComputedStyle(e);return [s.fontFamily,s.fontSize,s.lineHeight];}),font);
  await page.locator('#module-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#model-result')?.className==='success',null,{timeout:30000});
  await page.screenshot({path:'artifacts/poetry-unified-font.png'});await page.keyboard.press('Escape');await releaseMouse(page);
  const {regions}=await page.evaluate(()=>fetch('/api/catalog').then(r=>r.json()));
  let count=0;
  for(const region of regions){
    await releaseMouse(page);
    await page.locator(`[data-region="${region.id}"]`).click();await page.waitForTimeout(550);
    // Go around the entrance lamp, then approach the little installation on the right.
    if(region.terrain){await step('w',1,region.position[1]+20);}else{await step('s',1,region.position[1]+11);await step('d',0,region.position[0]+2.5);}
    await page.locator('#discovery-prompt').waitFor();assert.equal(await page.locator('#discovery-name').innerText(),region.discovery.title);
    await page.locator('#help').click();const snapshot=await saved();await page.keyboard.press('r');assert.deepEqual(await saved(),snapshot);await page.keyboard.press('Escape');await releaseMouse(page);
    await page.keyboard.press('r');await page.waitForFunction(n=>document.querySelector('#stamp-count').textContent===`${n}/4`,++count);
    await page.mouse.move(550,400);await page.mouse.down();await page.mouse.move(1190,420,{steps:8});await page.mouse.up();await page.waitForTimeout(500);
    await page.screenshot({path:`artifacts/wonder-${region.discovery.kind}.png`});
    await page.keyboard.press('r');assert.equal((await saved()).discoveries.length,count);
  }
  assert.deepEqual(await page.evaluate(()=>window.notes),[],'muted installations must not create audio voices');
  await releaseMouse(page);await page.locator('#sound').click();await page.waitForTimeout(1800);await page.keyboard.press('r');
  await page.waitForFunction(()=>window.notes.includes(880));const notes=await page.evaluate(()=>window.notes);
  for(const frequency of [523.25,587.33,659.25,783.99,880])assert.ok(notes.some(n=>Math.abs(n-frequency)<.02));
  await page.locator('#sound').click();const mutedCount=notes.length;await page.waitForTimeout(1800);await page.keyboard.press('r');assert.equal(await page.evaluate(()=>window.notes.length),mutedCount);
  await page.locator('#overview').click();await page.waitForTimeout(200);assert.equal(await page.locator('#discovery-prompt').isVisible(),false);const mapSave=await saved();await page.keyboard.press('r');assert.deepEqual(await saved(),mapSave);
  await page.reload();await page.locator('#world canvas').waitFor();assert.equal(await page.locator('#stamp-count').innerText(),'4/4');await page.locator('#journal').click();assert.equal(await page.locator('.stamp-card.found').count(),4);
  await page.screenshot({path:'artifacts/travel-stamps.png'});
  await page.locator('[data-wonder-region="ai-mountain"]').click();assert.equal(await page.locator('#world').getAttribute('data-view'),'first-person');
  // Reduced-motion users retain the discovery interaction and persistence.
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.locator('#world canvas').waitFor();await page.waitForTimeout(600);
  const mountain=regions.find(r=>r.terrain);await step('w',1,mountain.position[1]+20);await page.locator('#discovery-prompt').waitFor();await page.keyboard.press('r');assert.equal((await saved()).discoveries.length,4);
  assert.deepEqual(errors,[]);console.log('PASS: consistent poetry typography + real generation; four reachable R discoveries; modal/map gating; deduplication and persistence; muted/enabled chimes; reduced motion');
}catch(error){await page.screenshot({path:'artifacts/discoveries-failure.png'});console.error(errors);throw error;}
finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
