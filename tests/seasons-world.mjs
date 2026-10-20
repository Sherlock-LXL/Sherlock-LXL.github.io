import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {releaseMouse} from './input-helpers.mjs';
const s=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:960},acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
const move=async(key,ms)=>{await page.locator('#world canvas').focus();await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);};
try{
  await page.goto(s.url+'/?inspect=1');await page.locator('#world canvas').waitFor();await page.locator('#overview').click();await page.waitForTimeout(1000);await page.screenshot({path:'artifacts/four-seasons-overview.png'});
  for(const r of s.catalog.public.regions){
    await page.locator(`[data-region="${r.id}"]`).click();await releaseMouse(page);await page.keyboard.press('p');await page.locator('#photo-toolbar').waitFor();
    await move('e',r.terrain?2300:1700);await move('s',r.terrain?1700:1300);await move('d',600);
    await page.mouse.move(750,400);await page.mouse.down();await page.mouse.move(685,680,{steps:12});await page.mouse.up();await page.locator('#photo-hour').selectOption('10');await page.waitForTimeout(1800);
    const download=page.waitForEvent('download');await page.locator('#photo-save').click();await(await download).saveAs(`artifacts/season-${r.season}.png`);await page.locator('#photo-exit').click();await releaseMouse(page);
  }
  await page.locator('#collections').click();await page.locator('[data-exhibit="photography"]').click();await page.locator('#visit').click();await releaseMouse(page);await page.locator('#interaction-prompt').waitFor();await move('a',240);await move('w',370);await page.screenshot({path:'artifacts/photography-world-originals.png'});
  assert.deepEqual(errors,[]);console.log('PASS: four seasonal scene exports, gallery originals, no shader/runtime errors');
}finally{await browser.close();s.server.closeAllConnections();await new Promise(r=>s.server.close(r));}
