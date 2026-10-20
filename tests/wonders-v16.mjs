import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {findTrail} from '../shared/trail.mjs';
import {overlaps,walkable} from '../shared/navigation.mjs';
import {releaseMouse} from './input-helpers.mjs';
import {aimAt} from './aim-helpers.mjs';
const service=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/.test(m.text()))errors.push(m.text());});
const state=()=>page.evaluate(()=>window.__xiangmetaInspect());
try{
 await page.goto(service.url+'/?inspect=1');await page.waitForFunction(()=>window.__xiangmetaInspect);
 const initial=await state(),catalog=service.catalog.public;assert.equal(initial.discoveries.length,8);assert.equal(new Set(initial.discoveries.map(d=>d.id)).size,8);
 assert.ok(initial.rails.length);assert.ok(initial.rails.every(r=>r.length>=3));
 for(const d of initial.discoveries){
  if(d.id!==d.regionId)assert.ok(!initial.obstacles.some(o=>Math.hypot(o.x-d.x,o.z-d.z)>.001&&overlaps(d.x,d.z,o,1.15)),d.title+' clear of furniture');
  await releaseMouse(page);await page.locator(`[data-region="${d.regionId}"]`).click();await releaseMouse(page);
  const before=await state(),paths=[];
  for(let i=0;i<24;i++){const target={x:d.x+Math.cos(i*Math.PI/12)*2.3,z:d.z+Math.sin(i*Math.PI/12)*2.3};if(!walkable(target.x,target.z,catalog.regions,before.obstacles)||initial.memories.some(m=>Math.hypot(m.x-target.x,m.z-target.z)<1.8))continue;
   const path=findTrail(before.player,target,catalog.regions,before.obstacles,.35);if(path.length)paths.push([...path,target]);}
  paths.sort((a,b)=>a.length-b.length);assert.ok(paths.length,d.title+' reachable from the entrance');
  console.log('Walking to',d.title);
  await page.locator('#world canvas').focus();
  await page.evaluate(async path=>{
   let keys=[];const set=next=>{for(const key of keys)if(!next.includes(key))window.dispatchEvent(new KeyboardEvent('keyup',{code:key,bubbles:true}));for(const key of next)if(!keys.includes(key))window.dispatchEvent(new KeyboardEvent('keydown',{code:key,bubbles:true}));keys=next;};
   try{for(const p of path){const start=performance.now();while(true){const s=window.__xiangmetaInspect(),dx=p.x-s.player.x,dz=p.z-s.player.z;if(Math.hypot(dx,dz)<.14)break;if(performance.now()-start>12000)throw new Error('Walking stalled '+JSON.stringify({p,player:s.player}));const f=-Math.sin(s.yaw)*dx-Math.cos(s.yaw)*dz,r=Math.cos(s.yaw)*dx-Math.sin(s.yaw)*dz;set(Math.abs(f)>Math.abs(r)?[f>0?'KeyW':'KeyS']:[r>0?'KeyD':'KeyA']);await new Promise(requestAnimationFrame);}}}finally{set([]);}
  },paths[0]);
  await aimAt(page,{x:d.x,y:(d.y??0)+1.5,z:d.z});
  await page.locator('#discovery-prompt').waitFor();assert.equal(await page.locator('#discovery-name').textContent(),d.title);await page.keyboard.press('r');
  await page.waitForFunction(id=>JSON.parse(localStorage.getItem('xiangmeta:visitor:v1')).discoveries.includes(id),d.id);
  await page.waitForTimeout(750);await page.screenshot({path:`artifacts/v16-${d.kind}.png`});
 }
 await releaseMouse(page);await page.locator('#overview').click();assert.equal(await page.locator('#discovery-prompt').isVisible(),false);
 for(const width of [1500,760]){await page.setViewportSize({width,height:960});const icons=await page.locator('.sidebar .nav-art').evaluateAll(els=>els.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height,getComputedStyle(e).display];}));assert.equal(icons.length,10);assert.ok(icons.every(([w,h,d])=>w===32&&h===32&&d!=='none'));await page.screenshot({path:`artifacts/v16-sidebar-${width}.png`});}
 await page.setViewportSize({width:1500,height:960});await page.locator('#journal').click();assert.equal(await page.locator('.stamp-card.found').count(),8);await page.locator('[data-wonder-region="science-valley"]').last().click();await releaseMouse(page);assert.equal((await state()).mode,'first-person');
 await page.reload();await page.waitForFunction(()=>window.__xiangmetaInspect);assert.equal(await page.locator('#stamp-count').textContent(),'8/8');
 assert.deepEqual(errors,[]);console.log('PASS: 8 reachable R discoveries, separated new furniture, persistence, connected rails, 10 consistent responsive SVG icons');
}catch(e){await page.screenshot({path:'artifacts/v16-wonders-failure.png'});throw e;}finally{await browser.close();service.server.closeAllConnections();service.server.close();}
