import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createServer } from '../backend/server.mjs';
const service=await createServer({port:0});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:960}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const snapshot=()=>page.evaluate(()=>window.__xiangmetaInspect());
const unlock=async()=>{await page.evaluate(()=>{if(document.pointerLockElement)document.exitPointerLock();});await page.waitForFunction(()=>!document.pointerLockElement);};
try{
  await page.goto(service.url+'/?inspect=1');await page.locator('#world canvas').waitFor();await page.waitForTimeout(1200);
  await page.screenshot({path:'artifacts/refined-arrival.png'});
  await page.locator('#collections').click();await page.locator('[data-exhibit=xianglm]').click();await page.locator('#visit').click();
  await page.waitForFunction(()=>document.pointerLockElement===document.querySelector('#world canvas'),null,{timeout:5000});
  await page.keyboard.press('f');await page.locator('#inspector.product-mode').waitFor();assert.equal(await page.evaluate(()=>!!document.pointerLockElement),false);
  await page.keyboard.press('Escape');await page.locator('#inspector').waitFor({state:'hidden'});
  await page.waitForFunction(()=>document.pointerLockElement===document.querySelector('#world canvas'),null,{timeout:5000});
  const before=await snapshot();await page.mouse.move(620,460);await page.mouse.move(680,475,{steps:8});const after=await snapshot();assert.notEqual(after.yaw,before.yaw);
  assert.deepEqual(after.player,before.player,'mouse look must not teleport the player');
  await page.keyboard.press('f');await page.locator('#inspector').waitFor();await page.locator('#close-panel').click();await page.waitForFunction(()=>!!document.pointerLockElement);
  await unlock();
  // Generate orbit inertia, then restore the first-person camera and walk continuously.
  await page.locator('#overview').click();await page.mouse.move(840,420);await page.mouse.down();await page.mouse.move(1030,465,{steps:8});await page.mouse.up();await page.locator('[data-region=ai-mountain]').click();
  const trajectory=await page.evaluate(async()=>{
    const frames=[],canvas=document.querySelector('#world canvas');
    canvas.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));
    const start=performance.now();while(performance.now()-start<1300){await new Promise(requestAnimationFrame);frames.push(window.__xiangmetaInspect());}
    canvas.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));return frames;
  });
  for(let i=1;i<trajectory.length;i++){
    const a=trajectory[i-1],b=trajectory[i];assert.ok(b.player.z<=a.player.z+.00001,'forward motion never rewinds');assert.ok(Math.hypot(b.player.x-a.player.x,b.player.z-a.player.z)<=.521,'no impossible position jumps');assert.ok(Math.abs(b.camera[0]-b.player.x)<.00001&&Math.abs(b.camera[2]-b.player.z)<.00001,'camera has one owner');assert.equal(a.yaw,b.yaw);
  }
  for(const [hour,name] of [[6.2,'dawn'],[10,'day'],[17.8,'sunset'],[22,'night']]){
    await unlock();await page.locator('#sky-settings').click();await page.locator('#cycle-time').uncheck();await page.locator(`[data-hour="${hour}"]`).click();await page.waitForTimeout(2800);await page.keyboard.press('Escape');await unlock();
    await page.locator('#overview').click();await page.waitForTimeout(400);await page.screenshot({path:`artifacts/sky-${name}.png`});
    assert.ok(Math.abs((await snapshot()).hour-hour)<.03);
  }
  await page.locator('[data-region=ai-mountain]').click();await page.screenshot({path:'artifacts/night-walk.png'});
  // Map mode closes a panel without capturing the first-person mouse.
  await page.locator('#overview').click();await page.locator('#help').click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.pointerLockElement),null);
  assert.deepEqual(errors,[]);await writeFile('artifacts/refinement-report.json',JSON.stringify({frames:trajectory.length,errors,checks:['browser Esc relock','close button relock','continuous camera and walk','four sky phases','map modal close']},null,2));
  console.log('PASS: browser Esc and close-button pointer lock, stable movement after orbit inertia, dawn/day/sunset/night and map-mode gating');
}catch(error){await page.screenshot({path:'artifacts/refinement-failure.png'});console.error(errors);throw error;}
finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
