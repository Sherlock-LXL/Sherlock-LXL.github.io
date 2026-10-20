import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { createServer } from '../backend/server.mjs';
import {releaseMouse} from './input-helpers.mjs';
const service=await createServer({port:0});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
try {
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  await page.addInitScript(()=>{
    window.draws=0;
    for(const name of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){
      const original=WebGL2RenderingContext.prototype[name];
      WebGL2RenderingContext.prototype[name]=function(...args){window.draws++;return original.apply(this,args);};
    }
  });
  await page.goto(service.url);await page.locator('#world canvas').waitFor();await page.waitForTimeout(2000);
  const sample=()=>page.evaluate(async()=>{
    const times=[],calls=[];let last=performance.now(),draws=window.draws;
    for(let i=0;i<120;i++){await new Promise(requestAnimationFrame);const now=performance.now();times.push(now-last);last=now;calls.push(window.draws-draws);draws=window.draws;}
    const sorted=[...times].sort((a,b)=>a-b);
    return {fps:1000/(times.reduce((a,b)=>a+b)/times.length),p95ms:sorted[Math.floor(sorted.length*.95)],drawCalls:calls.reduce((a,b)=>a+b)/calls.length};
  });
  const walk=await sample();await page.locator('#overview').click();await page.waitForTimeout(600);const map=await sample();
  const regions={};for(const r of service.catalog.public.regions){await releaseMouse(page);await page.locator(`[data-region="${r.id}"]`).click();await page.waitForTimeout(600);regions[r.id]=await sample();}
  const renderer=await page.evaluate(()=>{const gl=document.querySelector('#world canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');return {gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),devicePixelRatio,viewport:[innerWidth,innerHeight]};});
  const result={walk,map,regions,renderer};console.log(JSON.stringify(result));await writeFile(`artifacts/performance-${process.argv[2]??'current'}.json`,JSON.stringify(result,null,2));
} finally {await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
