import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {createServer} from '../backend/server.mjs';
import {releaseMouse} from './input-helpers.mjs';
const service=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
await mkdir('artifacts/current/release-ui',{recursive:true});
async function inspect(name){
 const result=await page.locator('dialog').evaluate(d=>{
  const bounds=d.getBoundingClientRect(),bad=[];
  for(const e of d.querySelectorAll('button,input,select,textarea,pre,math')){
   if(!e.getClientRects().length)continue;
   const r=e.getBoundingClientRect();
   if(r.left<bounds.left-2||r.right>bounds.right+2)bad.push({tag:e.tagName,text:e.textContent.slice(0,60),issue:'outside dialog'});
   if(e.tagName==='BUTTON'&&e.scrollWidth>e.clientWidth+2)bad.push({tag:'BUTTON',text:e.textContent.slice(0,60),issue:'clipped text'});
  }
  return {overflow:d.scrollWidth-d.clientWidth,bad};
 });results.push({name,...result});
 await page.screenshot({path:`artifacts/current/release-ui/${name}.png`});
}
try{
 await page.goto(service.url);await page.locator('#world canvas').waitFor();
 for(const [width,height] of [[1500,960],[900,650]]){
  await page.setViewportSize({width,height});
  for(const module of service.catalog.public.modules){
   await releaseMouse(page);await page.locator('#collections').click();await page.locator(`[data-exhibit="${module.id}"]`).click();
   await inspect(`${width}-${module.id}-overview`);
   await page.locator('[data-tab="story"]').click();await inspect(`${width}-${module.id}-story`);
   await page.locator('#use-product').click();await inspect(`${width}-${module.id}-product`);
   await page.locator('.panel-footer').scrollIntoViewIfNeeded();await inspect(`${width}-${module.id}-footer`);
   await page.locator('#close-panel').click();
  }
  for(const id of ['collections','favorites','memory-open','growth-open','horizons-open','harbor-open','journal','guide','help','sky-settings']){
   if(!await page.locator('#'+id).count())throw new Error('Missing navigation '+id);
   await releaseMouse(page);await page.locator('#'+id).click();await inspect(`${width}-${id}`);await page.locator('#close-panel').click();
  }
 }
 await writeFile('artifacts/current/release-ui.json',JSON.stringify({results,errors},null,2));
 assert.deepEqual(errors,[]);assert.deepEqual(results.filter(r=>r.overflow>2||r.bad.length),[]);
 console.log(`PASS: ${results.length} complete panel/layout states at desktop and minimum desktop size; no horizontal overflow or clipped controls`);
}finally{await browser.close();service.server.closeAllConnections();service.server.close();}
