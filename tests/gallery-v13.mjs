import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {findTrail} from '../shared/trail.mjs';
import {createWalker,advanceWalker} from '../shared/locomotion.mjs';
import {releaseMouse} from './input-helpers.mjs';
import {aimAt} from './aim-helpers.mjs';
const service=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1500,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.testAudio=[];const Real=window.Audio;window.Audio=class extends Real{constructor(...a){super(...a);window.testAudio.push(this);}};});
const state=()=>page.evaluate(()=>window.__xiangmetaInspect());
try{
 await page.goto(service.url+'/?inspect=1');await page.locator('#world canvas').waitFor();assert.ok(await page.locator('#sound').evaluate(b=>b.classList.contains('enabled')));await page.waitForFunction(()=>window.testAudio.some(a=>!a.paused&&a.currentTime>.1));
 const catalog=service.catalog.public,snapshot=await state();assert.equal(snapshot.artworks.length,19);
 for(const id of ['personal-music','photography']){
  await releaseMouse(page);await page.locator('#collections').click();await page.locator(`[data-exhibit="${id}"]`).click();await page.locator('#visit').click();await releaseMouse(page);
  const works=snapshot.artworks.filter(a=>a.moduleId===id);
  for(const work of works){
   const walking=await state();await aimAt(page,{x:walking.player.x,y:walking.camera[1],z:walking.player.z-10});
   console.log('Walking to',work.id);const before=await state();
   const path=findTrail(before.player,work.approach,catalog.regions,before.obstacles,.35);assert.ok(path.length,work.id+' has a viewing route');
   const walker=createWalker(before.player.x,before.player.z,catalog.regions);
   for(const p of [...path,work.approach]){let n=0;while(Math.hypot(p.x-walker.x,p.z-walker.z)>.1){const dx=p.x-walker.x,dz=p.z-walker.z,d=Math.hypot(dx,dz);advanceWalker(walker,{x:dx/d*Math.min(5.2,d*60),z:dz/d*Math.min(5.2,d*60),jump:false},1/60,catalog.regions,before.obstacles);assert.ok(++n<500,work.id+' viewing approach blocked');}}
   await page.locator('#world canvas').focus();
   await page.evaluate(async path=>{
    let keys=[];const set=next=>{for(const key of keys)if(!next.includes(key))window.dispatchEvent(new KeyboardEvent('keyup',{code:key,bubbles:true}));for(const key of next)if(!keys.includes(key))window.dispatchEvent(new KeyboardEvent('keydown',{code:key,bubbles:true}));keys=next;};
    // Turn toward the waypoint through the real pointer handler, then walk.
    // Alternating cardinal keys cut a staircase across diagonal furniture corners.
    const canvas=document.querySelector('#world canvas');
    try{for(const p of path){set([]);const start=performance.now();while(true){
     const s=window.__xiangmetaInspect(),dx=p.x-s.player.x,dz=p.z-s.player.z;if(Math.hypot(dx,dz)<.1)break;
     if(performance.now()-start>12000)throw new Error('Walking stalled '+JSON.stringify({target:p,player:s.player,yaw:s.yaw,keys}));
     const target=Math.atan2(-dx,-dz),delta=Math.atan2(Math.sin(target-s.yaw),Math.cos(target-s.yaw));
     if(Math.abs(delta)>.002){const turn=Math.max(-200,Math.min(200,-delta/.0023));canvas.dispatchEvent(new PointerEvent('pointerdown',{button:0,clientX:0,clientY:0,bubbles:true}));window.dispatchEvent(new PointerEvent('pointermove',{clientX:turn,clientY:0,bubbles:true}));window.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));}
     set(Math.abs(delta)<.04?['KeyW']:[]);await new Promise(requestAnimationFrame);
    }}}finally{set([]);}

   },[...path,work.approach]);
   await aimAt(page,work);await page.waitForFunction(id=>window.__xiangmetaInspect().nearArtwork===id,work.id);
   if(work===works[0]){const s=await state();await aimAt(page,{x:s.player.x,y:s.camera[1]+8,z:s.player.z+.1});await page.waitForFunction(()=>window.__xiangmetaInspect().nearArtwork===null);await aimAt(page,work);await page.waitForFunction(id=>window.__xiangmetaInspect().nearArtwork===id,work.id);}
   await page.keyboard.press('f');
   if(work.action.kind==='album'){assert.equal(await page.locator('.album-cover.active').getAttribute('data-album'),work.action.id);await page.locator('#inspector.product-mode').waitFor();}
   else{const media=catalog.modules.find(m=>m.id===id).media[work.action.index];await page.locator('#inspector.immersive-mode').waitFor();assert.equal(await page.locator('#panel-title').textContent(),media.title);assert.equal(await page.locator('figcaption').textContent(),'拍摄于 '+media.location);}
   if(work===works[0])await page.screenshot({path:`artifacts/v13-work-${id}.png`});await page.keyboard.press('Escape');await releaseMouse(page);
  }
 }
 await page.locator('#memory-open').click();assert.equal(await page.locator('.memory-atlas line').count(),8);await page.screenshot({path:'artifacts/v13-memory-atlas.png'});await page.locator('.memory-index [data-memory]').first().click();assert.ok(await page.locator('#inspector').evaluate(el=>parseFloat(getComputedStyle(el.querySelector('#panel-content')).paddingBottom)>=32));await page.screenshot({path:'artifacts/v13-memory-detail.png'});
 assert.deepEqual(errors,[]);console.log('PASS: default music, all 19 works reachable on foot and F opens the exact album/photo, separate photo locations, 8 sequential memory links, padded memory detail');
}catch(e){await page.screenshot({path:'artifacts/gallery-v13-failure.png'});throw e;}finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
