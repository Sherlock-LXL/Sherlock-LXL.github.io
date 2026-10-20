import {build} from 'vite';import {chromium} from 'playwright';import assert from 'node:assert/strict';import {createServer} from '../backend/server.mjs';import {mkdir,writeFile} from 'node:fs/promises';
import {walkable} from '../shared/navigation.mjs';import {releaseMouse} from './input-helpers.mjs';
const code=await build({configFile:false,logLevel:'error',build:{write:false,lib:{entry:'tests/refinement-v20.ts',name:'V20Audit',formats:['iife']}}}),service=await createServer({port:0});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[],report={};
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/.test(m.text()))errors.push(m.text());});
await mkdir('artifacts/current',{recursive:true});
try{
 await page.route('**/__v20?inspect=1',r=>r.fulfill({contentType:'text/html',body:'<body style="margin:0">'}));await page.goto(service.url+'/__v20?inspect=1');await page.addScriptTag({content:code[0].output.find(o=>o.type==='chunk').code});
 const {state,postTop,plateBottom}=await page.evaluate(c=>window.initV20(c),service.catalog.public);
 assert.ok(postTop<plateBottom,'terminal support ends below its tilted sign');assert.ok(walkable(state.player.x,state.player.z,service.catalog.public.regions,state.obstacles));assert.ok(Math.hypot(state.player.x,state.player.z)<8);report.spawn=state.player;
 for(const side of [-2,0,2]){const result=await page.evaluate(s=>window.mirrorV20(s),side);assert.ok(Math.abs(result.virtual[0]-side)<.001&&Math.abs(result.virtual[2]+7)<.001,'virtual camera mirrors real view across the glass');await page.screenshot({path:`artifacts/current/v20-mirror-${side}.png`});}
 const far=await page.evaluate(()=>window.mirrorV20(0,60));assert.equal(far.strength,0);
 for(const [name,p,t] of [['spawn',[4.5,1.7,5],[0,1.8,0]],['gate',[-11,3,-19],[-14.8,2.35,-25]]]){await page.evaluate(([p,t])=>window.viewV20(p,t),[p,t]);await page.screenshot({path:`artifacts/current/v20-${name}.png`});}
 await page.goto(service.url+'/?inspect=1');await page.locator('#world canvas').waitFor();
 report.centers=[];
 for(const width of [1500,760]){
  await page.setViewportSize({width,height:960});await releaseMouse(page);await page.locator('#memory-open').click();
  const offsets=await page.evaluate(()=>{const svg=document.querySelector('.memory-links'),matrix=svg.getScreenCTM(),stars=[...document.querySelectorAll('.memory-star>.action-icon')];return [...svg.querySelectorAll('line')].flatMap((l,i)=>[[l.x1.baseVal.value,l.y1.baseVal.value,i],[l.x2.baseVal.value,l.y2.baseVal.value,i+1]]).map(([x,y,i])=>{const p=new DOMPoint(x,y).matrixTransform(matrix),r=stars[i].getBoundingClientRect();return Math.hypot(p.x-r.x-r.width/2,p.y-r.y-r.height/2);});});
  assert.ok(offsets.every(n=>n<1.1),JSON.stringify(offsets));report.centers.push({width,maxOffset:Math.max(...offsets)});await page.screenshot({path:`artifacts/current/v20-stars-${width}.png`});await page.locator('#close-panel').click();
  await releaseMouse(page);await page.locator('#collections').click();await page.locator('[data-exhibit="emotion-recognition"]').click();
  const fav=page.locator('#favorite'),before=await fav.getAttribute('aria-pressed');await fav.click();assert.notEqual(await fav.getAttribute('aria-pressed'),before);assert.equal(await fav.locator('svg').count(),1);await fav.click();assert.equal(await fav.getAttribute('aria-pressed'),before);
  await page.locator('.panel-footer').scrollIntoViewIfNeeded();assert.ok(await page.locator('.panel-footer button').evaluateAll(bs=>bs.every(b=>b.scrollWidth<=b.clientWidth+1)));await page.screenshot({path:`artifacts/current/v20-actions-${width}.png`});await page.locator('#close-panel').click();
 }
 assert.deepEqual(errors,[]);report.errors=errors;await writeFile('artifacts/current/refinement-v20.json',JSON.stringify(report,null,2));console.log('PASS: central safe spawn, sign clearance, three mirror angles, distant reflection budget, star endpoints at two widths, favorite toggle and action layout');
}finally{await browser.close();service.server.closeAllConnections();service.server.close();}
