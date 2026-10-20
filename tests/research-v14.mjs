import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {releaseMouse} from './input-helpers.mjs';
const s=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1500,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(s.url+'/?inspect=1');await page.locator('#world canvas').waitFor();
 for(const id of ['bubble-lab','sonoluminescence']){
  await page.locator('#collections').click();await page.locator(`[data-exhibit="${id}"]`).click();await page.locator('#use-product').click();
  await page.waitForFunction(()=>document.querySelector('#research-radius')?.getAttribute('d')?.length>50);
  assert.equal(await page.locator('.research-equation math').count(),4);if(id==='sonoluminescence'){assert.equal(await page.locator('.research-controls input').count(),5);assert.equal(await page.locator('#research-input-molality,#research-input-osmotic').count(),0);}
  const old=await page.locator('#research-radius').getAttribute('d');const input=page.locator('.research-controls input').first();await input.fill(id==='bubble-lab'?'1.5':'0.7');await input.dispatchEvent('input');
  await page.waitForFunction(old=>document.querySelector('#research-radius').getAttribute('d')!==old,old);assert.ok(!(await page.locator('#research-radius').getAttribute('d')).includes('NaN'));
  await page.locator('.research-layout').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/v14-${id}-curves.png`});
  await page.locator('.research-equations').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/v14-${id}-equations.png`});
  await page.keyboard.press('Escape');await releaseMouse(page);
 }
 await page.locator('#collections').click();await page.locator('[data-exhibit="weiming"]').click();await page.locator('#use-product').click();
 const video=page.locator('video');assert.ok((await video.getAttribute('poster')).endsWith('.webp'));await video.evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('video').currentTime>.3);assert.ok(await video.evaluate(v=>v.videoWidth===1920));assert.equal(await video.evaluate(v=>v.volume),.28);await video.scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/v14-mv.png'});
 assert.deepEqual(errors,[]);console.log('PASS: both manuscript equation panels, physical parameter curves, worker updates, finite plots, local 1080p MV decodes/plays and quiet volume');
}finally{await browser.close();s.server.closeAllConnections();await new Promise(r=>s.server.close(r));}
