import { releaseMouse } from './input-helpers.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir,writeFile } from 'node:fs/promises';
import { createServer } from '../backend/server.mjs';

await mkdir('artifacts',{recursive:true});
const service=await createServer({port:0});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const position=()=>page.locator('#coordinate').textContent().then(s=>s.match(/-?\d+\.\d+/g).map(Number));
const arrival=async()=>{await page.locator('[data-region="ai-mountain"]').click();await page.waitForTimeout(600);};
async function walk(keys,duration){
  return page.evaluate(async({keys,duration})=>{
    const coords=()=>document.querySelector('#coordinate').textContent.match(/-?\d+\.\d+/g).map(Number);
    const start=coords(),begin=performance.now(),frames=[];let previous=begin;
    for(const code of keys)document.querySelector('#world canvas').dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));
    while(performance.now()-begin<duration){await new Promise(requestAnimationFrame);const now=performance.now();frames.push(now-previous);previous=now;}
    for(const code of keys)document.querySelector('#world canvas').dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));
    const elapsed=(performance.now()-begin)/1000,end=coords(),distance=Math.hypot(end[0]-start[0],end[1]-start[1]);
    return {distance,elapsed,speed:distance/elapsed,frames,start,end};
  },{keys,duration});
}
try{
  await page.goto(service.url);await page.locator('#world canvas').waitFor();await page.waitForTimeout(1500);
  const flatArrival=async()=>{await page.locator('[data-region="science-valley"]').click();await page.waitForTimeout(600);};
  await flatArrival();const normal=await walk(['KeyW'],650);
  await flatArrival();const sprint=await walk(['KeyW','ShiftLeft'],650);
  assert.ok(normal.speed>4.3&&normal.speed<6,`walk speed ${normal.speed}`);
  assert.ok(sprint.speed>7&&sprint.speed<9.6,`sprint speed ${sprint.speed}`);
  assert.ok(sprint.speed/normal.speed>1.4,'Shift should noticeably accelerate');
  // High-speed approach must stop at the terminal, without tunnelling through it.
  await arrival();await walk(['KeyW','ShiftLeft'],2400);const stopped=await position();
  const catalog=await page.evaluate(()=>fetch('/api/catalog').then(r=>r.json()));
  const region=catalog.regions.find(r=>r.id==='ai-mountain'),tower=catalog.modules.find(m=>m.id==='recommendation');
  const stationZ=region.position[1]+tower.position[1]+4.35;
  assert.ok(stopped[1]>=stationZ+.95&&stopped[1]<stationZ+1.3,`terminal stop at ${stopped[1]}`);
  await page.keyboard.press('f');await page.locator('#inspector.product-mode').waitFor();await page.keyboard.press('Escape');await releaseMouse(page);
  // Capture consecutive positions across the arrival/path junction while looking at the ground.
  await arrival();await page.mouse.move(780,350);await page.mouse.down();await page.mouse.move(780,550,{steps:8});await page.mouse.up();
  for(let i=0;i<4;i++){await walk(['KeyW'],160);await page.screenshot({path:`artifacts/walk-ground-${i}.png`});}
  assert.deepEqual(errors,[]);
  const report={normal,sprint,collisionStop:stopped,terminalZ:stationZ,errors};
  await writeFile('artifacts/movement-report.json',JSON.stringify(report,null,2));
  console.log(`PASS: walking ${normal.speed.toFixed(2)} m/s; sprint ${sprint.speed.toFixed(2)} m/s; terminal collision and F; 4 ground frames`);
}finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}

