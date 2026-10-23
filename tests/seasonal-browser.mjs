import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {loadCatalog} from '../backend/catalog.mjs';
import {verifyTours} from './tour-navigation.mjs';
import {walkable} from '../shared/navigation.mjs';
const out=process.env.GAME_ARTIFACTS??'/private/tmp/seasonal-review',touch=process.env.GAME_TOUCH==='1';
await mkdir(out,{recursive:true});
const engine=process.env.GAME_ENGINE==='webkit'?webkit:chromium,browser=await engine.launch({headless:true,args:engine===chromium?['--use-angle=metal']:[]});
const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1440,height:1000},hasTouch:touch,isMobile:touch});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
page.on('console',e=>{if(e.type()==='error'||/GL_INVALID|INVALID_OPERATION|WebGL.*warning/i.test(e.text()))errors.push(e.text());});
page.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`));
page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const inspect=()=>page.evaluate(()=>window.__xiangmetaInspect());
const frames=async(seconds)=>page.evaluate(seconds=>new Promise(resolve=>{const start=performance.now();const tick=()=>performance.now()-start>seconds*1000?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick);}),seconds);
// Real pointer input; avoid Playwright's RAF-based stability check on the heavy WebGL scene.
const click=async(selector)=>{
  const element=page.locator(selector);await element.waitFor({state:'visible'});
  await element.scrollIntoViewIfNeeded();
  const b=await element.boundingBox();assert.ok(b);
  await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
};
const menu=async()=>{if(touch){await click('#mobile-menu');await page.waitForFunction(()=>Math.abs(document.querySelector('.sidebar').getBoundingClientRect().x)<1);}await click('#seasonal-games');};
const startingCountdown=async id=>{
  await page.waitForFunction(()=>document.querySelector('[data-count]')?.textContent==='3');
  if(touch)await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=0);
  await page.screenshot({path:out+'/countdown-'+id+'.png'});
  const start=(await inspect()).games;
  let gas;
  if(touch){
    gas=await page.locator('[data-drive="forward"]').boundingBox();
    await page.mouse.move(gas.x+gas.width/2,gas.y+gas.height/2);await page.mouse.down();
  }else await page.keyboard.down('w');
  await frames(.35);
  const waiting=(await inspect()).games;
  assert.ok(waiting.race.countdown>0);
  assert.equal(waiting.race.elapsed,0,'the starting countdown does not count as race time');
  assert.equal(waiting.vehicle.x,start.vehicle.x);assert.equal(waiting.vehicle.y,start.vehicle.y);assert.equal(waiting.vehicle.z,start.vehicle.z);
  if(touch)await page.mouse.up();else await page.keyboard.up('w');
  await page.waitForFunction(()=>document.querySelector('[data-count]')?.textContent==='2');
  await page.waitForFunction(()=>document.querySelector('[data-count]')?.textContent==='1');
  await page.waitForFunction(()=>window.__xiangmetaInspect().games.race?.countdown===0);
  console.log('starting 3 → 2 → 1',id);
};
try{
  await page.goto((process.env.GAME_ORIGIN??'http://127.0.0.1:4191')+'/world/?inspect');
  await page.waitForFunction(()=>window.__xiangmetaInspect?.().calls>0,null,{timeout:90000});
  await page.waitForFunction(()=>!document.querySelector('#world-loading'));
  console.log('ready for input');
  await click('#help');await click('#low-quality');await click('#close-panel');
  const initial=await inspect();assert.equal(initial.games.stalls.length,4);assert.equal(initial.living.animals.length,10);
  assert.ok(initial.obstacles.every(o=>Number.isFinite(o.height)),'scene blockers have finite height for airborne travel');
  await writeFile(out+'/world.json',JSON.stringify(initial));
  console.log('boot',initial.games.stalls);
  const {regions}=(await loadCatalog(process.cwd())).public;
  for(const s of initial.games.stalls)assert.ok(walkable(s.approach.x,s.approach.z,regions,initial.obstacles),s.id+' approach');
  for(const stall of initial.games.stalls){
    await page.evaluate(s=>window.__xiangmetaWalk(s.approach.x,s.approach.z,s.x,s.z),stall);
    await page.waitForFunction(id=>window.__xiangmetaInspect().games.near===id,stall.id);
    await click('.game-near-prompt');
    await page.locator(`[data-stall-page="${stall.id}"]`).waitFor({state:'visible'});
    assert.equal(await page.locator('.seasonal-cards').count(),0,'arrival opens the specific stall');
    if(stall.id==='winter')assert.equal(await page.locator('[data-game]').count(),6);
    await page.screenshot({path:out+'/stall-'+stall.id+'.png'});
    await click('[data-all-games]');assert.equal(await page.locator('.seasonal-card').count(),4);await click('[data-close]');
  }
  assert.equal(await page.locator('#seasonal-games b').count(),0,'navigation does not show a fake numeric shortcut');
  if(!touch){
    const routes=verifyTours(regions,initial.obstacles);
    await writeFile(out+'/route-simulation.json',JSON.stringify(routes));
  }
  await menu();assert.equal(await page.locator('.seasonal-card').count(),4);await page.screenshot({path:out+'/menu.png'});console.log('menu');
  await click('[data-start="spring"]');await startingCountdown('spring');
  const before=(await inspect()).games.vehicle;
  if(touch){const b=await page.locator('[data-drive="forward"]').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await frames(1.5);await page.mouse.up();}
  else{await page.keyboard.down('w');await frames(1.5);await page.keyboard.up('w');}
  let s=(await inspect()).games;assert.ok(Math.hypot(s.vehicle.x-before.x,s.vehicle.z-before.z)>.5,'bike moves with real input');
  await page.screenshot({path:out+'/spring.png'});console.log('spring driven');
  if(touch){const b=await page.locator('[data-drive="forward"]').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();}
  else await page.keyboard.down('w');
  await page.waitForFunction(()=>window.__xiangmetaInspect().games.vehicle.hit===true);
  if(touch)await page.mouse.up();else await page.keyboard.up('w');
  const contact=(await inspect()).games.vehicle;
  if(touch){const b=await page.locator('[data-drive="back"]').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();}
  else await page.keyboard.down('s');
  await page.waitForFunction(p=>{const s=window.__xiangmetaInspect().games.vehicle;return s.speed<-.5&&Math.hypot(s.x-p.x,s.z-p.z)>.75;},contact,{timeout:6000});
  if(touch)await page.mouse.up();else await page.keyboard.up('s');
  const reversed=(await inspect()).games.vehicle;
  assert.ok(Math.hypot(reversed.x-contact.x,reversed.z-contact.z)>.75,'the motorcycle reverses away from the exhibit with real controls');
  console.log('motorcycle reverses out of contact',Math.hypot(reversed.x-contact.x,reversed.z-contact.z));await click('.game-hud [data-pause]');
  const time=(await inspect()).games.race.elapsed;await frames(.35);assert.equal((await inspect()).games.race.elapsed,time);
  assert.equal(await page.locator('.seasonal-dialog [data-reset]').count(),0);
  await click('[data-resume]');await click('.game-hud [data-reset]');assert.equal((await inspect()).games.race.penalty,5);
  const resetState=(await inspect()).games;await frames(.6);const waiting=(await inspect()).games;
  assert.equal(waiting.race.elapsed,resetState.race.elapsed);
  assert.equal(waiting.vehicle.x,resetState.vehicle.x);assert.equal(waiting.vehicle.z,resetState.vehicle.z);
  assert.ok(waiting.race.countdown>0);
  await page.waitForFunction(()=>window.__xiangmetaInspect().games.race.countdown===0);
  let guide=(await inspect()).games;
  assert.equal(guide.gates.length,3);assert.equal(guide.gates[0].index,guide.race.next);
  const phase=guide.guide.flow;await frames(.2);assert.ok((await inspect()).games.guide.flow>phase);
  if(!touch){
    await page.keyboard.down('w');await page.waitForFunction(()=>window.__xiangmetaInspect().games.vehicle.speed>3);
    await page.keyboard.down('Shift');await page.keyboard.down('a');await frames(.25);
    assert.ok((await inspect()).games.vehicle.drift>.7,'Shift turns the bike into a drift');
    await page.keyboard.up('Shift');await page.keyboard.up('a');await page.keyboard.up('w');
    await frames(.6);assert.ok((await inspect()).games.vehicle.drift<.01,'releasing Shift restores grip');
  }
  if(touch)await click('.game-hud [data-pause]');else await page.keyboard.press('Escape');
  await click('[data-restart]');s=(await inspect()).games;
  assert.equal(s.race.elapsed,0);assert.equal(s.race.penalty,0);assert.equal(s.race.leisure,false);assert.ok(s.race.countdown>0);
  await click('.game-hud [data-pause]');await click('[data-exit]');assert.equal((await inspect()).games.vehicle,null);
  for(const id of ['summer','autumn']){
    await menu();await click(`[data-start="${id}"]`);await startingCountdown(id);
    await click('.game-hud [data-pause]');await click('[data-exit]');
    await menu();await click(`[data-free="${id}"]`);await frames(.15);
    assert.ok((await page.locator('[data-speed]').textContent()).startsWith('0 km/h'),'countdown speedometer shows the stopped vehicle');
    await page.waitForFunction(()=>window.__xiangmetaInspect().games.race?.countdown===0);
    if(!touch){await page.keyboard.down('w');await page.keyboard.down('a');await frames(1);await page.keyboard.up('w');await page.keyboard.up('a');}
    else if(id==='summer'&&engine===chromium){
      const cdp=await page.context().newCDPSession(page),gas=await page.locator('[data-drive="forward"]').boundingBox(),left=await page.locator('[data-drive="left"]').boundingBox();
      const points=[{x:gas.x+gas.width/2,y:gas.y+gas.height/2,id:1},{x:left.x+left.width/2,y:left.y+left.height/2,id:2}];
      const yaw=(await inspect()).games.vehicle.yaw;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await frames(.9);
      assert.ok((await inspect()).games.vehicle.yaw-yaw>.05,'two fingers accelerate and turn together');
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[points[1]]});
      const straight=(await inspect()).games.vehicle.yaw;await frames(.3);
      assert.ok(Math.abs((await inspect()).games.vehicle.yaw-straight)<.001,'releasing steering keeps throttle and clears turn');
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[points[0]]});await cdp.detach();
    }else await frames(1);
    s=(await inspect()).games;assert.equal(s.race.leisure,true);assert.equal(s.race.passed,0);assert.ok(Number.isFinite(s.vehicle.y));await page.screenshot({path:out+'/'+id+'.png'});
    if(touch)await click('.game-hud [data-pause]');else await page.keyboard.press('Escape');
    await click('[data-restart]');s=(await inspect()).games;assert.equal(s.race.elapsed,0);assert.equal(s.race.penalty,0);assert.equal(s.race.leisure,true);assert.ok(s.race.countdown>0);
    await click('.game-hud [data-pause]');await click('[data-exit]');
    console.log('driven',id);
  }
  await menu();await click('[data-arcade]');
  for(const id of ['blocks','snake','bricks','merge','pairs','falling']){
    await click(`[data-game="${id}"]`);await page.waitForFunction(id=>window.__xiangmetaInspect().games.arcade?.id===id,id);
    if(id==='pairs'){await click('[data-card="0"]');await click('[data-card="1"]');}
    else{await click('.arcade-pad [data-key="left"]');if(['blocks','bricks','falling'].includes(id))await click('.arcade-pad [data-key="space"]');await frames(.3);}
    await click('.seasonal-dialog [data-pause]');assert.equal((await inspect()).games.arcade.paused,true);
    await click('.seasonal-dialog [data-pause]');await page.screenshot({path:out+'/'+id+'.png'});await click('[data-back]');
    console.log('arcade',id);
  }
  await click('[data-close]');assert.equal(await page.locator('.seasonal-dialog').evaluate(d=>d.open),false);
  const best=await page.evaluate(()=>localStorage.getItem('xiangmeta.games.v1.arcade.blocks.v2'));assert.ok(best!==null);
  const horizontal=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(horizontal,false);
  assert.deepEqual(errors,[]);console.log('PASS individual stalls, starting countdowns, ordered guidance, countdown reset, six arcade games, saved record',best);
}catch(e){await page.screenshot({path:out+'/failure.png'});console.error('page errors',errors);throw e;}
finally{await browser.close();}
