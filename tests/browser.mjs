import { releaseMouse } from './input-helpers.mjs';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createServer } from '../backend/server.mjs';
await mkdir('artifacts',{recursive:true});
const service=process.env.XIANGMETA_URL?null:await createServer({port:0});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
const context=await browser.newContext({viewport:{width:1500,height:960}});
// Deterministic camera fixture: repeated real-device acquisition is platform-dependent in headless Edge.
await context.addInitScript(()=>{window.testTracks=[];navigator.mediaDevices.getUserMedia=async()=>{const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;const stream=canvas.captureStream(5);canvas.getContext('2d').fillRect(0,0,64,64);stream.getVideoTracks()[0].requestFrame?.();window.testTracks.push(...stream.getTracks());return stream;};});
const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(process.env.XIANGMETA_URL??service.url);
  await page.locator('#world canvas').waitFor();await page.waitForTimeout(2200);
  assert.equal(await page.locator('#world').getAttribute('data-view'),'first-person');assert.equal(await page.locator('#world').getAttribute('data-eye-height'),'1.7');
  await page.screenshot({path:'artifacts/first-person-arrival.png'});
  await page.keyboard.press('f');assert.equal(await page.locator('#inspector').isVisible(),false);
  await page.locator('#overview').click();assert.equal(await page.locator('#world').getAttribute('data-view'),'map');await page.waitForTimeout(300);await page.screenshot({path:'artifacts/world-overview.png'});
  await page.locator('#camera-reset').click();assert.equal(await page.locator('#world').getAttribute('data-view'),'first-person');
  assert.equal(await page.locator('.exhibit-label').count(),10);
  await page.locator('#collections').click();await page.locator('[data-exhibit=xianglm]').click();
  await page.locator('[data-tab=story]').click();await page.getByText('02 / 从随机初始化开始').waitFor();
  await page.screenshot({path:'artifacts/xianglm-story.png'});
  await page.locator('#favorite').click();assert.match(await page.locator('#favorite').innerText(),/已收藏/);
  await page.locator('#visit').click();await releaseMouse(page);await page.waitForTimeout(1000);
  await page.screenshot({path:'artifacts/xianglm-tower.png'});
  await page.locator('#interaction-prompt').waitFor();assert.match(await page.locator('#station-name').innerText(),/XiangLM/);
  await page.locator('#capture-look').click();await page.waitForFunction(()=>document.pointerLockElement===document.querySelector('#world canvas'));
  await page.keyboard.press('f');await page.locator('#inspector.product-mode').waitFor();assert.equal(await page.locator('#panel-title').innerText(),'XiangLM Tower');
  assert.equal(await page.evaluate(()=>document.pointerLockElement===null),true);
  await page.screenshot({path:'artifacts/first-person-product.png'});
  const pausedAt=await page.locator('#coordinate').innerText();await page.keyboard.down('w');await page.waitForTimeout(200);await page.keyboard.up('w');assert.equal(await page.locator('#coordinate').innerText(),pausedAt);
  await page.keyboard.press('Escape');await releaseMouse(page);
  await page.locator('#inspector').waitFor({state:'hidden'});await page.waitForTimeout(150);const before=await page.locator('#coordinate').innerText();await page.keyboard.down('s');await page.waitForFunction(value=>document.querySelector('#coordinate')?.textContent!==value,before,{timeout:5000});await page.keyboard.up('s');assert.notEqual(await page.locator('#coordinate').innerText(),before);
  await page.locator('#collections').click();await page.locator('[data-exhibit=bubble-lab]').click();
  await page.waitForFunction(()=>document.querySelector('#research-radius')?.getAttribute('d')?.length>50);const curve=await page.locator('#research-radius').getAttribute('d');await page.locator('#research-input-saturation').fill('1.5');await page.locator('#research-input-saturation').dispatchEvent('input');await page.waitForFunction(curve=>document.querySelector('#research-radius').getAttribute('d')!==curve,curve);
  await page.screenshot({path:'artifacts/science-lab.png'});await page.keyboard.press('Escape');await releaseMouse(page);
  await page.locator('#guide').click();await page.locator('#guide-query').fill('猫咪');await page.locator('#guide-form button').click();await page.locator('#guide-results [data-exhibit=cat-recognition]').waitFor();await page.keyboard.press('Escape');await releaseMouse(page);
  await page.locator('#collections').click();await page.locator('[data-exhibit=emotion-recognition]').click();await page.locator('#camera').click();
  await page.waitForFunction(()=>document.querySelector('#camera-preview')?.videoWidth>0);await page.locator('#capture').click();await page.locator('#image-preview').waitFor();
  await page.waitForFunction(()=>window.testTracks.every(t=>t.readyState==='ended'));
  assert.equal(await page.evaluate(()=>window.testTracks.every(t=>t.readyState==='ended')),true);
  await page.waitForTimeout(700);await page.locator('#camera').click();await page.waitForFunction(()=>window.testTracks.some(t=>t.readyState==='live'),{},{timeout:10000});await page.keyboard.press('Escape');await releaseMouse(page);
  await page.waitForFunction(()=>window.testTracks.every(t=>t.readyState==='ended'));
  assert.equal(await page.evaluate(()=>window.testTracks.every(t=>t.readyState==='ended')),true);
  await page.locator('#collections').click();await page.locator('[data-exhibit=recommendation]').click();await page.locator('#module-form button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#model-result')?.className!=='pending',{},{timeout:20000});
  assert.match(await page.locator('#model-result').innerText(),/真实推理/);
  await page.screenshot({path:'artifacts/live-recommendation.png'});await page.keyboard.press('Escape');await releaseMouse(page);
  await page.reload();await page.locator('#world canvas').waitFor();await page.locator('#favorites').click();await page.locator('[data-exhibit=xianglm]').waitFor();await page.keyboard.press('Escape');await releaseMouse(page);
  await page.setViewportSize({width:760,height:780});await page.waitForTimeout(500);await page.screenshot({path:'artifacts/compact-world.png'});
  for(const id of ['science-valley','personal-museum','weiming-studio']){await page.setViewportSize({width:1500,height:960});await page.locator(`.region-nav[data-region="${id}"]`).click();assert.equal(await page.locator('#world').getAttribute('data-view'),'first-person');await page.waitForTimeout(300);await page.screenshot({path:`artifacts/first-person-${id}.png`});}
  const exhibits=await page.evaluate(async()=>fetch('/api/catalog').then(r=>r.json()).then(c=>c.modules));
  for(const m of exhibits){await page.locator('#collections').click();await page.locator(`[data-exhibit="${m.id}"]`).click();await page.locator('#visit').click();await releaseMouse(page);await page.locator('#interaction-prompt').waitFor();assert.equal(await page.locator('#station-name').innerText(),m.title);await page.keyboard.press('f');await page.locator('#inspector.product-mode').waitFor();assert.equal(await page.locator('#panel-title').innerText(),m.title);if(m.id==='recommendation'){await page.locator('#module-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#model-result')?.className==='success',{},{timeout:20000});}await page.keyboard.press('Escape');await releaseMouse(page);}
  assert.deepEqual(errors,[]);console.log('PASS: eye-level first person, map/teleport, proximity F product UI, movement, modal pause, favorites, guide, simulation, camera cleanup, real model, all regions');
}catch(error){await page.screenshot({path:'artifacts/browser-failure.png'});console.error(await page.evaluate(()=>({focus:document.activeElement?.tagName,toast:document.querySelector('.toast')?.textContent,tracks:window.testTracks?.map(t=>t.readyState)})));throw error;}
finally{await browser.close();if(service){service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}}
