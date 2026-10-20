import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {releaseMouse} from './input-helpers.mjs';
const service=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(service.url);await page.locator('#world canvas').waitFor();
 for(const id of ['photography','personal-music','weiming']){
  await page.locator('#collections').click();await page.locator(`[data-exhibit="${id}"]`).click();await page.locator('#visit').click();await releaseMouse(page);await page.waitForTimeout(700);
  await page.screenshot({path:`artifacts/v12-entrance-${id}.png`});
 }
 await page.locator('#memory-open').click();await page.locator('#atlas-visit').click();await releaseMouse(page);await page.waitForTimeout(700);await page.screenshot({path:'artifacts/v12-central-hub.png'});
 await page.keyboard.press('p');await page.locator('#photo-toolbar').waitFor();
 await page.locator('#world canvas').focus();await page.keyboard.down('e');await page.waitForTimeout(500);await page.keyboard.up('e');await page.keyboard.down('s');await page.waitForTimeout(600);await page.keyboard.up('s');
 await page.locator('#photo-hour').selectOption('10');await page.waitForTimeout(1600);await page.screenshot({path:'artifacts/v12-central-hub-day.png'});
 await page.locator('#photo-hour').selectOption('22');await page.waitForTimeout(1800);await page.screenshot({path:'artifacts/v12-central-hub-night.png'});
 assert.deepEqual(errors,[]);console.log('PASS: rotated gallery and studio entrances, open celestial hub day/night views without runtime errors');
}finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
