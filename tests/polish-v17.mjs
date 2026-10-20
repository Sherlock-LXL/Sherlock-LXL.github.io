import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {releaseMouse} from './input-helpers.mjs';
const service=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:960}});
try{
 await page.goto(service.url);await page.locator('#world canvas').waitFor();
 for(const width of [1500,900,760]){
  await page.setViewportSize({width,height:960});
  for(const id of ['poetry','photography']){
   await releaseMouse(page);await page.locator('#collections').click();await page.locator(`[data-exhibit="${id}"]`).click();await page.locator('#use-product').click();
   if(id==='photography'){
    await page.locator('.photo-collection img').evaluateAll(async imgs=>{for(const img of imgs){img.loading='eager';await img.decode();}});
    const ratios=await page.locator('.photo-collection img').evaluateAll(imgs=>imgs.map(i=>({rendered:i.clientWidth/i.clientHeight,natural:i.naturalWidth/i.naturalHeight})));
    assert.equal(ratios.length,14);assert.ok(ratios.every(r=>Math.abs(r.rendered-r.natural)<.02),'original photo proportions');
    await page.locator('.photo-collection').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/v17-photos-${width}.png`});
   }
   await page.locator('.panel-footer').scrollIntoViewIfNeeded();
   const s=await page.evaluate(()=>{const d=document.querySelector('dialog'),f=d.querySelector('.panel-footer'),dr=d.getBoundingClientRect(),fr=f.getBoundingClientRect();return {left:fr.left-dr.left,right:dr.right-fr.right,background:getComputedStyle(d).backgroundColor,footer:getComputedStyle(f).backgroundColor,overflow:d.scrollWidth-d.clientWidth,buttons:[...f.querySelectorAll('button')].map(b=>b.scrollWidth-b.clientWidth),scroll:getComputedStyle(document.querySelector('.sidebar')).scrollbarColor};});
   assert.ok(s.left<=2&&s.right<=12,JSON.stringify(s));assert.equal(s.background,s.footer);assert.ok(s.overflow<=1&&s.buttons.every(n=>n<=1),JSON.stringify(s));assert.ok(!s.scroll.includes('255, 255, 255'));
   await page.screenshot({path:`artifacts/v17-${id}-footer-${width}.png`});await page.locator('#close-panel').click();
  }
 }
 for(const m of service.catalog.public.modules){await releaseMouse(page);await page.locator('#collections').click();await page.locator(`[data-exhibit="${m.id}"]`).click();await page.locator('[data-tab="story"]').click();const text=await page.locator('#story').innerText();assert.ok(text.length>40);assert.ok(!/README|AI安全|安全提示|免责声明|不代表|授权|推理源码|默认参数|界面并非/.test(text),m.id+': '+text);await page.locator('#close-panel').click();}
 console.log('PASS: continuous footer, dark scrollbar, 14 natural-ratio photos, single-line footer buttons at 3 widths, clean 10 growth stories');
}finally{await browser.close();service.server.closeAllConnections();service.server.close();}
