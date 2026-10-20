import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {regionRoutes} from '../shared/region-routes.mjs';
import {createWalker,advanceWalker} from '../shared/locomotion.mjs';
import {releaseMouse} from './input-helpers.mjs';
const service=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  let release;const barrier=new Promise(r=>release=r);await page.route('**/api/catalog',async route=>{await barrier;await route.continue();});
  await page.goto(service.url+'/?inspect=1',{waitUntil:'domcontentloaded'});await page.locator('.loading').waitFor();
  for(const width of [1500,900]){await page.setViewportSize({width,height:960});const box=await page.locator('.loading').boundingBox();assert.ok(Math.abs(box.x+box.width/2-width/2)<1);const p=await page.locator('.loading p').boundingBox();assert.ok(Math.abs(p.x+p.width/2-width/2)<1);}
  await page.screenshot({path:'artifacts/loading-centered.png'});release();await page.setViewportSize({width:1500,height:960});await page.locator('#world canvas').waitFor();await page.waitForTimeout(700);
  const state=await page.evaluate(()=>window.__xiangmetaInspect()),catalog=service.catalog.public;assert.equal(state.snowmen,2);
  for(const r of catalog.regions.filter(r=>!r.terrain)){
    const routes=regionRoutes(r,catalog.modules.filter(m=>m.region===r.id));
    for(const route of routes){const local=route.points.length===3&&route.width===2.8?route.points.slice(0,-1):route.points;const points=local.map(([x,z])=>({x:x+r.position[0],z:z+r.position[1]}));
      for(const reverse of [false,true]){const path=reverse?[...points].reverse():points,walker=createWalker(path[0].x,path[0].z,catalog.regions);
        for(const target of path.slice(1)){let steps=0;while(Math.hypot(target.x-walker.x,target.z-walker.z)>.04){const dx=target.x-walker.x,dz=target.z-walker.z,d=Math.hypot(dx,dz),speed=Math.min(5.2,d*60);advanceWalker(walker,{x:dx/d*speed,z:dz/d*speed,jump:false},1/60,catalog.regions,state.obstacles);assert.ok(++steps<600,`${r.id} road obstructed: ${JSON.stringify({target,walker})}`);}}
      }
    }
  }
  const first=state.memories.find(m=>m.id==='recommendation--first-network'),r=catalog.regions.find(r=>r.id==='ai-mountain');assert.ok(Math.hypot(first.x-r.position[0]-10.5,first.z-r.position[1]-19.5)>4);
  await page.locator('#collections').click();await page.locator('[data-exhibit="personal-music"]').click();await page.locator('#use-product').click();
  assert.equal(await page.locator('[data-album]').count(),5);assert.equal(await page.locator('.album-tracks button').count(),3);
  await page.locator('.album-detail audio').evaluate(a=>a.play());await page.waitForFunction(()=>document.querySelector('.album-detail audio').currentTime>.15);
  assert.match(await page.locator('.album-lyrics').textContent(),/作曲/);await page.screenshot({path:'artifacts/album-secret.png'});
  for(const a of catalog.modules.find(m=>m.id==='personal-music').albums){await page.locator(`[data-album="${a.id}"]`).click();assert.equal(await page.locator('.album-tracks button').count(),a.tracks.length);assert.equal(await page.locator('.album-lyrics').textContent(),a.tracks[0].lyrics);const response=await page.request.get(service.url+a.tracks[0].src,{headers:{Range:'bytes=0-127'}});assert.equal(response.status(),206);}
  await page.screenshot({path:'artifacts/album-team-credit.png'});await page.keyboard.press('Escape');await releaseMouse(page);
  for(const id of ['bubble-lab','sonoluminescence','photography','personal-music']){await page.locator('#collections').click();await page.locator(`[data-exhibit="${id}"]`).click();await page.locator('#visit').click();await releaseMouse(page);await page.waitForTimeout(700);await page.screenshot({path:`artifacts/v11-${id}.png`});}
  assert.deepEqual(errors,[]);console.log('PASS: centered loading at two widths, all flat island approach/branch routes walk both ways, butterfly separated, five albums/twelve lyrics and audio ranges, gallery and lab scenes');
}catch(e){await page.screenshot({path:'artifacts/refinement-v11-failure.png'});throw e;}finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
