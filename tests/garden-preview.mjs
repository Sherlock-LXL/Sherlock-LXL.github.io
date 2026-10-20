import {chromium} from 'playwright';
import {createServer} from '../backend/server.mjs';
import {releaseMouse} from './input-helpers.mjs';
import assert from 'node:assert/strict';
const service=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:960},acceptDownloads:true}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
const move=async(key,ms)=>{await page.locator('#world canvas').focus();await page.keyboard.down(key);await page.waitForTimeout(ms);await page.keyboard.up(key);};
const save=async(name)=>{const download=page.waitForEvent('download');await page.locator('#photo-save').click();await (await download).saveAs(`artifacts/${name}.png`);};
try{
  await page.goto(service.url+'/?inspect=1');await page.locator('#world canvas').waitFor();
  await page.locator('[data-region="ai-mountain"]').click();await releaseMouse(page);await page.keyboard.press('p');await page.locator('#photo-toolbar').waitFor();
  await move('e',2350);await move('s',1800);await move('d',950);
  await page.mouse.move(750,400);await page.mouse.down();await page.mouse.move(640,640,{steps:12});await page.mouse.up();
  await page.locator('#photo-hour').selectOption('10');await page.waitForTimeout(2200);await save('garden-mountain-day');
  await page.locator('#photo-hour').selectOption('22');await page.waitForTimeout(2200);await save('garden-mountain-night');
  await page.locator('#photo-exit').click();await releaseMouse(page);
  await page.locator('#collections').click();await page.locator('[data-exhibit="recommendation"]').click();await page.locator('#visit').click();await releaseMouse(page);await page.keyboard.press('p');await page.locator('#photo-toolbar').waitFor();
  await move('e',450);await move('s',330);
  await page.mouse.move(900,430);await page.mouse.down();await page.mouse.move(430,500,{steps:12});await page.mouse.up();
  await page.locator('#photo-hour').selectOption('10');await page.waitForTimeout(2200);await save('garden-path-detail');
  assert.deepEqual(errors,[]);console.log('PASS: daylight/night garden views and close-up exported without shader errors');
}finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
