import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {releaseMouse} from './input-helpers.mjs';
const service=await createServer({port:0});const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1500,height:960},acceptDownloads:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
const close=async()=>{await page.keyboard.press('Escape');await releaseMouse(page);};
const inspect=()=>page.evaluate(()=>window.__xiangmetaInspect());
try{
  await page.goto(service.url+'/?inspect=1');await page.locator('#world canvas').waitFor();await page.waitForTimeout(500);
  console.log('trails',(await inspect()).trails);assert.ok((await inspect()).trails.every(n=>n>1),'every growth leg must have a walkable route');
  await page.locator('#growth-open').click();assert.equal(await page.locator('[data-track-memory]').count(),5);await page.screenshot({path:'artifacts/growth-path.png'});await close();
  const memories=(await inspect()).memories;
  for(const [i,m] of memories.entries()){
    console.log('memory',m.id);
    await page.locator('#memory-open').click();await page.locator(`.memory-index [data-memory="${m.id}"]`).click();await page.locator('#memory-visit').click();await releaseMouse(page);await page.locator('#memory-prompt').waitFor();await page.keyboard.press('r');await page.locator('#inspector').waitFor();
    assert.equal(await page.locator('#memory-count').textContent(),`${i+1}/${memories.length}`);await close();
  }
  await page.locator('#memory-open').click();await page.screenshot({path:'artifacts/memory-constellation.png'});await page.locator('#atlas-visit').click();await releaseMouse(page);await page.locator('#memory-prompt').waitFor();await page.keyboard.press('r');await page.locator('.memory-atlas').waitFor();await close();
  const before=await inspect();await page.keyboard.press('p');await page.waitForFunction(()=>document.body.classList.contains('photo-mode'));await page.evaluate(()=>document.querySelector('#inspector').dispatchEvent(new Event('close')));await page.waitForTimeout(300);
  await page.keyboard.down('w');await page.waitForTimeout(350);await page.keyboard.up('w');await page.keyboard.down('e');await page.waitForTimeout(300);await page.keyboard.up('e');
  assert.notDeepEqual((await inspect()).photoCamera,before.camera);assert.deepEqual((await inspect()).player,before.player);
  await page.locator('#photo-hour').selectOption('17.8');await page.locator('#photo-fov').fill('75');await page.waitForTimeout(2200);
  const download=page.waitForEvent('download');await page.locator('#postcard-save').click();const file=await download;await file.saveAs('artifacts/XiangMeta-Postcard.png');
  await page.screenshot({path:'artifacts/photo-mode.png'});await page.locator('#photo-fov').focus();await page.keyboard.press('Escape');await page.waitForTimeout(100);
  // Returning from photography blends lighting back instead of flashing instantly.
  await page.waitForFunction(h=>Math.abs((window.__xiangmetaInspect().hour-h+36)%24-12)<.03,before.hour,{timeout:15000});
  const restored=await inspect();assert.deepEqual(restored.player,before.player);assert.deepEqual(restored.camera,before.camera);assert.ok(Math.abs((restored.hour-before.hour+36)%24-12)<.05);assert.equal(restored.mode,before.mode);await releaseMouse(page);
  await page.locator('#collections').click();await page.locator('[data-exhibit=photography]').click();await page.locator('[data-immerse="0"]').click();await page.locator('.immersive-image img').waitFor();await page.screenshot({path:'artifacts/immersive-gallery.png'});await page.locator('#image-next').click();assert.equal(await page.locator('#panel-title').innerText(),service.catalog.public.modules.find(m=>m.id==='photography').media[1].title);await page.locator('#image-back').click();await page.locator('[data-connection=cat-recognition]').click();await releaseMouse(page);await page.locator('#interaction-prompt').waitFor();assert.match(await page.locator('#station-name').textContent(),/猫咪/);
  await page.reload();await page.locator('#world canvas').waitFor();assert.equal(await page.locator('#memory-count').textContent(),`${memories.length}/${memories.length}`);
  assert.deepEqual(errors,[]);console.log('PASS: walkable growth trail, all reachable memories, constellation persistence, photo camera isolation/time restore/PNG export, immersive gallery and cross-project teleport');
}catch(error){console.error(errors);await page.screenshot({path:'artifacts/living-world-failure.png'});throw error;}finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
