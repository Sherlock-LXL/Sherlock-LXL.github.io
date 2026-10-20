import { releaseMouse } from './input-helpers.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { createServer } from '../backend/server.mjs';
const service=await createServer({port:0});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:960}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const height=()=>page.locator('#world').getAttribute('data-feet-height').then(Number);
try{
  await page.goto(service.url);await page.locator('#world canvas').waitFor();await page.locator('[data-region="science-valley"]').click();await page.waitForTimeout(800);
  await page.keyboard.down('Space');await page.waitForFunction(()=>Number(document.querySelector('#world').dataset.feetHeight)>1);
  await page.screenshot({path:'artifacts/jump-airborne.png'});
  await page.keyboard.down('Space');await page.waitForFunction(()=>document.querySelector('#world').dataset.grounded==='true');assert.equal(await height(),0);
  await page.waitForTimeout(250);assert.equal(await height(),0);await page.keyboard.up('Space');
  // Walk to the high stepping stone behind the arrival gate, then jump onto it.
  await page.keyboard.down('s');
  try{await page.waitForFunction(()=>Number(document.querySelector('#coordinate').textContent.match(/-?\d+\.\d+/g)[1])>=-6.7,null,{timeout:4000});}finally{await page.keyboard.up('s');}
  await page.keyboard.press('Space');await page.keyboard.down('s');await page.waitForTimeout(330);await page.keyboard.up('s');
  await page.waitForFunction(()=>document.querySelector('#world').dataset.grounded==='true'&&Number(document.querySelector('#world').dataset.feetHeight)>.7,null,{timeout:3000});
  assert.ok(Math.abs(await height()-.795)<.005);await page.screenshot({path:'artifacts/jump-stone-landing.png'});
  await page.keyboard.press('Space');await page.waitForFunction(()=>Number(document.querySelector('#world').dataset.feetHeight)>1.1);
  await page.locator('[data-region="science-valley"]').click();await page.waitForTimeout(200);assert.equal(await height(),0);
  await page.locator('#overview').click();await page.keyboard.press('Space');await page.locator('#camera-reset').click();await page.waitForTimeout(200);assert.equal(await height(),0);
  await page.locator('#collections').click();await page.keyboard.press('Space');await page.keyboard.press('Escape');await releaseMouse(page);await page.waitForTimeout(200);assert.equal(await height(),0);
  await page.locator('[data-region="ai-mountain"]').click();await page.waitForTimeout(500);
  for(let i=0;i<2;i++){await page.mouse.move(600,400);await page.mouse.down();await page.mouse.move(1280,460,{steps:8});await page.mouse.up();}
  await page.waitForTimeout(250);await page.screenshot({path:'artifacts/stepping-garden.png'});
  assert.deepEqual(errors,[]);console.log('PASS: native Space jump, no held-key bounce, raised-stone landing, teleport reset, modal and map gating');
}catch(error){await page.screenshot({path:'artifacts/jump-failure.png'});console.error(await page.locator('#coordinate').textContent(),await height());throw error;}
finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
