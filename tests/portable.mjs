import { releaseMouse } from './input-helpers.mjs';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import path from 'node:path';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const {version}=JSON.parse(await readFile('package.json','utf8'));
const visible=process.argv.includes('--visible');
const executable=path.resolve(`build/XiangMeta-${version}/XiangMeta-${version}-x64.exe`);
const child=spawn(executable,['--remote-debugging-port=9223','--enable-unsafe-swiftshader'],{windowsHide:true,env:{...process.env,XIANGMETA_TEST:visible?'0':'1',XIANGMETA_TEST_PORT:'4320',XIANGMETA_TEST_PROFILE:path.resolve('artifacts/portable-test-profile')}});
let browser;let page;
let originalSave;
let originalMusicSave;
async function restoreProgress(){
  if(originalSave!==undefined&&page&&!page.isClosed()){
    await page.evaluate(value=>{const key='xiangmeta:visitor:v1';if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);},originalSave);
    originalSave=undefined;
  }
  if(originalMusicSave!==undefined&&page&&!page.isClosed()){await page.evaluate(value=>{const key='xiangmeta:seasonal-music:v1';if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);},originalMusicSave);originalMusicSave=undefined;}
}
try{
  const deadline=Date.now()+60000;let ready=false;
  while(Date.now()<deadline){try{const health=await fetch('http://127.0.0.1:4320/api/health');if(health.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
  assert.ok(ready,'Portable executable did not start its local server');
  browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
  page=browser.contexts()[0].pages()[0];await page.addInitScript(()=>{window.testAudio=[];const Real=window.Audio;window.Audio=class extends Real{constructor(...args){super(...args);window.testAudio.push(this);}};});await page.reload();await page.locator('#world canvas').waitFor();await page.evaluate(()=>{window.lockErrors=[];const canvas=document.querySelector('#world canvas'),request=canvas.requestPointerLock.bind(canvas);canvas.requestPointerLock=(...args)=>{const result=request(...args);result?.catch(e=>window.lockErrors.push({message:e.message,focus:document.hasFocus(),active:document.activeElement?.tagName}));return result;};});
  const focusSession=await page.context().newCDPSession(page);await focusSession.send('Emulation.setFocusEmulationEnabled',{enabled:true});
  originalSave=await page.evaluate(()=>localStorage.getItem('xiangmeta:visitor:v1'));
  originalMusicSave=await page.evaluate(()=>localStorage.getItem('xiangmeta:seasonal-music:v1'));await page.evaluate(()=>{localStorage.removeItem('xiangmeta:seasonal-music:v1');sessionStorage.removeItem('xiangmeta:seasonal-journey:v2');});
  assert.equal(await page.locator('#world').getAttribute('data-view'),'first-person');await page.waitForFunction(()=>window.testAudio.some(a=>!a.paused&&a.currentTime>.1),null,{timeout:20000});
  assert.equal(await page.locator('#sky-settings').isVisible(),true);
  const catalog=await page.evaluate(async()=>fetch('/api/catalog').then(r=>r.json()));assert.equal(catalog.modules.length,10);
  assert.equal(catalog.modules.find(m=>m.id==='xianglm').status.state,'configured');
  assert.equal(catalog.regions.filter(r=>r.discovery).length,4);
  assert.deepEqual(catalog.regions.find(r=>r.terrain).terrain.terraces.map(t=>t.height),[1,4,7,10,13]);
  assert.equal(catalog.modules.flatMap(m=>m.world?.fragments??[]).length,9);assert.equal(catalog.tools.length,5);
  assert.equal(catalog.modules.find(m=>m.id==='photography').media.length,14);assert.equal(catalog.modules.find(m=>m.id==='personal-music').albums.length,5);assert.equal(catalog.modules.find(m=>m.id==='personal-music').albums.flatMap(a=>a.tracks).length,12);
  assert.ok(await page.locator('#sound').evaluate(b=>b.classList.contains('enabled')));await page.locator('[data-region="weiming-studio"]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('xiangmeta:seasonal-music:v1')??'[]').includes('season-summer-v1'),null,{timeout:15000});await releaseMouse(page);await page.locator('#sound').click();
  await page.locator('#collections').click();await page.locator('[data-exhibit="personal-music"]').click();await page.locator('[data-album="album-02"]').click();await page.locator('.album-detail audio').evaluate(a=>a.play());await page.waitForFunction(()=>document.querySelector('.album-detail audio').currentTime>.2,null,{timeout:15000});assert.ok((await page.locator('.album-lyrics').textContent()).length>20);await page.screenshot({path:`artifacts/portable-albums-${version}.png`});await page.keyboard.press('Escape');await releaseMouse(page);
  await page.locator('#memory-open').click();assert.equal(await page.locator('.memory-star').count(),9);await page.keyboard.press('Escape');await releaseMouse(page);
  const photoPosition=await page.locator('#coordinate').textContent();await page.keyboard.press('p');await page.locator('#photo-toolbar').waitFor();await page.locator('#photo-hour').selectOption('22');await page.locator('#photo-fov').focus();await page.keyboard.press('Escape');await page.locator('#photo-toolbar').waitFor({state:'hidden'});await releaseMouse(page);assert.equal(await page.locator('#coordinate').textContent(),photoPosition);
  await page.locator('#horizons-open').click();assert.equal(await page.locator('[data-horizon]').count(),2);await page.locator('[data-horizon="robot-island"]').click();await page.locator('#horizon-view').click();await page.locator('#photo-toolbar').waitFor();await page.locator('#photo-exit').click();await releaseMouse(page);assert.equal(await page.locator('#coordinate').textContent(),photoPosition);
  await page.locator('#journal').click();assert.equal(await page.locator('.stamp-card').count(),4);await page.keyboard.press('Escape');await releaseMouse(page);
  await page.locator('[data-region="science-valley"]').click();await page.waitForTimeout(600);
  await page.keyboard.press('Space');await page.waitForFunction(()=>Number(document.querySelector('#world').dataset.feetHeight)>.5,null,{timeout:15000});
  await page.waitForFunction(()=>document.querySelector('#world').dataset.grounded==='true',null,{timeout:15000});
  assert.equal(Number(await page.locator('#world').getAttribute('data-feet-height')),0);
  for(const [key,axis,target] of [['s',1,-9],['d',0,26.5]]){
    await page.keyboard.down(key);
    // Hidden Electron windows throttle animation frames; measure speed in movement.mjs.
    try{await page.waitForFunction(({axis,target})=>Number(document.querySelector('#coordinate').textContent.match(/-?\d+\.\d+/g)[axis])>=target,{axis,target},{timeout:15000});}
    finally{await page.keyboard.up(key);}
  }
  await page.locator('#discovery-prompt').waitFor();await page.keyboard.press('r');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('xiangmeta:visitor:v1')).discoveries.includes('science-valley'));
  await page.locator('#collections').click();await page.locator('[data-exhibit=recommendation]').click();await page.locator('#visit').click();await releaseMouse(page);await page.locator('#interaction-prompt').waitFor();await page.keyboard.press('f');await page.locator('#inspector.product-mode').waitFor();
  await page.locator('#module-form button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#model-result')?.className==='success',{},{timeout:20000});await page.locator('#model-result').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/portable-product-${version}.png`});await page.keyboard.press('Escape');await releaseMouse(page);
  await page.keyboard.press('f');await page.locator('#inspector.product-mode').waitFor();await page.keyboard.press('Escape');
  // Native pointer capture needs a visible OS window, even with emulated page focus.
  if(visible){await page.waitForFunction(()=>document.pointerLockElement===document.querySelector('#world canvas'),null,{timeout:10000});await releaseMouse(page);for(const selector of ['#help','#memory-open','#collections']){await page.locator(selector).click();await page.waitForTimeout(6500);await page.keyboard.press('Escape');await page.waitForFunction(()=>document.pointerLockElement===document.querySelector('#world canvas'),null,{timeout:10000});await releaseMouse(page);}}
  await releaseMouse(page);await page.locator('#sky-settings').click();assert.equal(await page.locator('[data-hour]').count(),4);await page.keyboard.press('Escape');await releaseMouse(page);
  for(const id of ['poetry','xianglm']){
    await page.locator('#collections').click();await page.locator(`[data-exhibit="${id}"]`).click();await page.locator('#use-product').click();
    if(id==='xianglm')await page.locator('#field-prompt').fill('你好，请介绍一下你自己。');
    await page.locator('#module-form button[type=submit]').click();await page.locator('#model-result.streaming').waitFor({timeout:90000});
    assert.ok(!(await page.locator('#model-result').textContent()).includes('�'));
    await page.locator('#model-result.success').waitFor({timeout:90000});await page.screenshot({path:`artifacts/portable-${id}-${version}.png`});
    await page.keyboard.press('Escape');await releaseMouse(page);
  }
  await page.screenshot({path:'artifacts/portable-world.png'});
  await restoreProgress();const client=await browser.newBrowserCDPSession();await Promise.race([client.send('Browser.close').catch(()=>{}),new Promise(r=>setTimeout(r,2000))]);browser=undefined;
  console.log(`PASS: self-contained portable EXE extracts, nine memory stars, module tools, photo mode, native Space jump/landing, R discovery and journal, teleport/F product UI, real models, poetry/LLM streaming, ${visible?'native Esc pointer relock, ':''}sky controls and adjacent local.json`);
}catch(error){if(page&&!page.isClosed()){console.error(await page.evaluate(()=>({lockErrors:window.lockErrors,focus:document.hasFocus(),photo:document.body.classList.contains('photo-mode')})));console.error(await page.locator('#model-result').textContent({timeout:1000}).catch(()=>''));await page.screenshot({path:'artifacts/portable-failure.png'}).catch(()=>{});}throw error;}
finally{await restoreProgress().catch(()=>{});if(browser){const session=await browser.newBrowserCDPSession();await Promise.race([session.send('Browser.close').catch(()=>{}),new Promise(r=>setTimeout(r,2000))]);}child.kill();}
