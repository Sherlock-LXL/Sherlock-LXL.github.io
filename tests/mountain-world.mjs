import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createServer} from '../backend/server.mjs';
import {createWalker,advanceWalker} from '../shared/locomotion.mjs';
import {groundHeight} from '../shared/terrain-height.mjs';
import {findTrail} from '../shared/trail.mjs';
import {memoryEntries,growthEntries} from '../shared/memories.mjs';
import {releaseMouse} from './input-helpers.mjs';
const service=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error'&&/THREE|shader|WebGL/i.test(m.text()))errors.push(m.text());});
const snapshot=()=>page.evaluate(()=>window.__xiangmetaInspect());
try{
  await page.goto(service.url+'/?inspect=1');await page.locator('#world canvas').waitFor();await page.waitForTimeout(600);
  const state=await snapshot(),catalog=service.catalog.public,region=catalog.regions.find(r=>r.terrain),entries=growthEntries(memoryEntries(catalog));
  assert.deepEqual(entries.map(e=>e.moduleId),['recommendation','emotion-recognition','poetry','cat-recognition','xianglm']);
  const elevations=entries.map(e=>groundHeight(e.x,e.z,catalog.regions));assert.deepEqual(elevations,[1,4,7,10,13]);
  const points=entries.map(e=>state.memories.find(m=>m.id===e.id)),paths=points.slice(1).map((p,i)=>findTrail(points[i],p,catalog.regions,state.obstacles));
  assert.ok(paths.every(p=>p.length>1));assert.ok(state.shortcuts[0].length>1,'CNN shortcut must have a clear route');
  function traverse(route,reverse=false){
    route=reverse?[...route].reverse():route;const walker=createWalker(route[0].x,route[0].z,catalog.regions);let frames=0;
    for(const point of route.slice(1)){
      let steps=0;
      while(Math.hypot(point.x-walker.x,point.z-walker.z)>.04){
        const dx=point.x-walker.x,dz=point.z-walker.z,d=Math.hypot(dx,dz),speed=Math.min(5.2,d*60);
        advanceWalker(walker,{x:dx/d*speed,z:dz/d*speed,jump:false},1/60,catalog.regions,state.obstacles);
        assert.ok(walker.y>=groundHeight(walker.x,walker.z,catalog.regions)-.003,'feet never enter terrain');
        assert.ok(++steps<240,`blocked route near ${JSON.stringify({walker,point})}`);frames++;
      }
    }
    assert.ok(Math.abs(walker.y-groundHeight(walker.x,walker.z,catalog.regions))<.03);return {frames,end:walker};
  }
  const ascent=traverse(paths.flat()),descent=traverse(paths.flat(),true),shortcut=traverse(state.shortcuts[0]),returnShortcut=traverse(state.shortcuts[0],true);
  assert.ok(state.flowerCount>0);for(const p of state.flowerRoots){assert.ok(p.y<11.54);assert.ok(Math.abs(p.y-groundHeight(p.x,p.z,catalog.regions)-.035)<.001);const heights=[[.2,0],[-.2,0],[0,.2],[0,-.2]].map(([dx,dz])=>groundHeight(p.x+dx,p.z+dz,catalog.regions));assert.ok(Math.max(...heights)-Math.min(...heights)<=.15);}for(const road of state.gardenRoads){traverse(road.points);traverse(road.points,true);}
  const length=route=>route.slice(1).reduce((sum,p,i)=>sum+Math.hypot(p.x-route[i].x,p.z-route[i].z),0);
  assert.ok(length(state.shortcuts[0])<length(paths[1])+length(paths[2]),'shortcut is shorter than visiting RNN in between');
  for(const [i,e] of entries.entries()){
    await page.locator('#collections').click();await page.locator(`[data-exhibit="${e.moduleId}"]`).click();await page.locator('#visit').click();await releaseMouse(page);await page.locator('#interaction-prompt').waitFor();
    const p=(await snapshot()).player;assert.ok(Math.abs(p.y-elevations[i])<.03);await page.keyboard.press('f');await page.locator('#inspector.product-mode').waitFor();await page.keyboard.press('Escape');await releaseMouse(page);
    await page.keyboard.press('Space');await page.waitForFunction(y=>Number(document.querySelector('#world').dataset.feetHeight)>y+.5,elevations[i]);await page.waitForFunction(()=>document.querySelector('#world').dataset.grounded==='true');assert.ok(Math.abs((await snapshot()).player.y-elevations[i])<.03);
    await page.screenshot({path:`artifacts/mountain-${e.moduleId}.png`});
  }
  await page.locator('#overview').click();await page.waitForTimeout(600);await page.screenshot({path:'artifacts/mountain-overview.png'});
  for(const id of ['quant-exchange','robot-island']){const before=await snapshot();await page.locator('#horizons-open').click();await page.locator(`[data-horizon="${id}"]`).click();await page.locator('#horizon-view').click();await page.locator('#photo-toolbar').waitFor();assert.equal((await snapshot()).photo,true);await page.locator('#photo-hour').selectOption(id==='robot-island'?'22':'17.8');await page.waitForTimeout(2200);await page.screenshot({path:`artifacts/future-${id}.png`});await page.locator('#photo-exit').click();assert.deepEqual((await snapshot()).player,before.player);}
  assert.deepEqual(errors,[]);await writeFile('artifacts/mountain-report.json',JSON.stringify({elevations,ascent,descent,shortcut,returnShortcut,mainLength:paths.reduce((s,p)=>s+length(p),0),shortcutLength:length(state.shortcuts[0]),errors},null,2));
  console.log('PASS: exact five-project ascent, shared surface, main trail and CNN shortcut walk both directions, elevated teleport/F/jump landing, no terrain penetration');
}catch(e){await page.screenshot({path:'artifacts/mountain-failure.png'});throw e;}finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
