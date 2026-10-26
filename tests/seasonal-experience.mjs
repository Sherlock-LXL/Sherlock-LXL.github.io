import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {angleDiff} from '../shared/seasonal-games.mjs';

// Checks complete play/exit/retry flows with real keyboard and pointer input.
const out=process.env.GAME_ARTIFACTS??'/private/tmp/seasonal-experience';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=metal']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.setDefaultTimeout(20000);
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const state=()=>page.evaluate(()=>window.__xiangmetaInspect().games);
const click=async selector=>{
  const el=page.locator(selector);await el.waitFor({state:'visible'});
  await el.scrollIntoViewIfNeeded();
  const b=await el.boundingBox();assert.ok(b);await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
};
const frames=seconds=>page.evaluate(seconds=>new Promise(resolve=>{
  const start=performance.now();const tick=()=>performance.now()-start>=seconds*1000?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick);
}),seconds);
const keys=new Set();
const hold=async next=>{
  for(const k of keys)if(!next.includes(k)){await page.keyboard.up(k);keys.delete(k);}
  for(const k of next)if(!keys.has(k)){await page.keyboard.down(k);keys.add(k);}
};
try{
  await page.goto((process.env.GAME_ORIGIN??'http://127.0.0.1:4191')+'/world/?inspect');
  await page.waitForFunction(()=>window.__xiangmetaInspect&&!document.querySelector('#world-loading'),null,{timeout:90000});
  await click('#help');await click('#low-quality');await click('#close-panel');
  await click('#seasonal-games');await click('[data-start="summer"]');
  await page.waitForFunction(()=>window.__xiangmetaInspect().games.race.countdown===0);
  const course=(await state()).race.course;let target=2,finished=false;
  const deadline=performance.now()+240000;
  while(performance.now()<deadline){
    const game=await state();if(game.race.finished){finished=true;break;}
    const s=game.vehicle;let p=course.path[target];
    while(Math.hypot(p.x-s.x,p.z-s.z)<1.4){target=(target+1)%course.path.length;p=course.path[target];}
    const a=angleDiff(s.yaw,Math.atan2(p.x-s.x,p.z-s.z));
    const desired=Math.abs(a)>.15?3:10,input=[];if(s.speed<desired)input.push('w');if(a>.035)input.push('a');if(a<-.035)input.push('d');if(s.speed>desired+.2)input.push('Space');
    await hold(input);await frames(.035);
  }
  await hold([]);assert.equal(finished,true,'two complete laps with real boat controls');
  await page.waitForFunction(()=>!!document.querySelector('[data-grade]'));
  const race=(await state()).race,grade=await page.locator('[data-grade]').getAttribute('data-grade');
  assert.equal(race.passed,course.gates.length*2);assert.ok(['gold','silver','bronze'].includes(grade));
  const time=race.elapsed+race.penalty,best=await page.evaluate(()=>JSON.parse(localStorage.getItem('xiangmeta.games.v1.race.summer.2')));
  assert.equal(best,time);await page.screenshot({path:out+'/race-finish.png'});console.log('real race finish',time,grade);
  await click('[data-again]');assert.equal((await state()).race.passed,0);assert.equal((await state()).race.penalty,0);
  await page.keyboard.press('p');assert.equal((await state()).paused,true);
  assert.equal(await page.evaluate(()=>window.__xiangmetaInspect().photo),false,'P pauses racing instead of entering photo mode');
  await page.keyboard.press('Escape');assert.equal((await state()).paused,false);
  await page.keyboard.press('Escape');assert.equal((await state()).paused,true);await click('[data-exit]');
  assert.equal((await state()).vehicle,null);
  // The camera and world controls return after racing; a held throttle must not leak into walking.
  const foot=await page.evaluate(()=>window.__xiangmetaInspect().player);await frames(.3);
  const still=await page.evaluate(()=>window.__xiangmetaInspect().player);assert.ok(Math.hypot(still.x-foot.x,still.z-foot.z)<.001);
  await click('#seasonal-games');assert.ok((await page.locator('.seasonal-card').nth(1).textContent()).includes('最佳'));
  await click('[data-free="summer"]');await page.waitForFunction(()=>window.__xiangmetaInspect().games.race.countdown===0);
  await hold(['w']);await frames(.3);await click('#help');await hold([]);
  const frozen=(await state()).race.elapsed;await frames(.25);
  assert.equal((await state()).race.elapsed,frozen);assert.equal(await page.locator('dialog[open]').count(),1,'world panel does not get a second pause dialog');
  await click('#close-panel');await frames(.25);assert.ok((await state()).race.elapsed>frozen);
  await click('.game-hud [data-pause]');await click('[data-exit]');console.log('retry, clean exit, world-panel pause');
  await click('#seasonal-games');await click('[data-start="autumn"]');
  await page.waitForFunction(()=>window.__xiangmetaInspect().games.race.countdown===0);
  const sky=(await state()).race.course;target=2;finished=false;const skyDeadline=performance.now()+120000;
  while(performance.now()<skyDeadline){
    const game=await state();if(game.race.finished){finished=true;break;}
    const s=game.vehicle;let p=sky.path[target];
    while(Math.hypot(p.x-s.x,p.z-s.z)<3.8){target=(target+1)%sky.path.length;p=sky.path[target];}
    const a=angleDiff(s.yaw,Math.atan2(p.x-s.x,p.z-s.z)),input=[];
    if(s.y>p.y+.15)input.push('w');if(s.y<p.y-.15)input.push('s');
    if(a>.045)input.push('a');if(a<-.045)input.push('d');
    if(Math.abs(a)>.25)input.push('Space');await hold(input);await frames(.035);
  }
  await hold([]);assert.equal(finished,true,'two complete laps through the three-dimensional flight gates');
  assert.equal((await state()).race.penalty,0,'no terrain or building collision on the air course');
  const skyGrade=await page.locator('[data-grade]').getAttribute('data-grade');
  await page.screenshot({path:out+'/flight-finish.png'});console.log('real flight finish',(await state()).race.elapsed,skyGrade);
  await click('[data-exit]');
  await click('#seasonal-games');await click('[data-arcade]');await click('[data-game="blocks"]');
  await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade?.id==='blocks');
  await click('.seasonal-dialog [data-pause]');const pausedPiece=(await state()).arcade.piece;
  await click('[data-key="left"]');await frames(.2);assert.deepEqual((await state()).arcade.piece,pausedPiece);
  await click('.seasonal-dialog [data-pause]');await page.keyboard.press('Space');
  assert.equal((await state()).arcade.paused,true,'Space activates the focused pause button');
  await click('.seasonal-dialog [data-restart]');assert.equal((await state()).arcade.paused,false);
  await click('[data-back]');await click('[data-game="pairs"]');
  await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade?.id==='pairs');
  await page.keyboard.press('p');assert.equal((await state()).arcade.paused,true);
  assert.equal(await page.evaluate(()=>window.__xiangmetaInspect().photo),false,'P pauses arcade instead of entering photo mode');
  await page.keyboard.press('p');assert.equal((await state()).arcade.paused,false);
  const revealed=new Map();
  for(let i=0;i<16;i+=2){
    await click(`[data-card="${i}"]`);await click(`[data-card="${i+1}"]`);
    await frames(.03);
    for(const n of [i,i+1])revealed.set(n,await page.locator(`[data-card="${n}"]`).textContent());
    await page.waitForFunction(([a,b])=>{
      const x=document.querySelector(`[data-card="${a}"]`),y=document.querySelector(`[data-card="${b}"]`);
      return x.disabled&&y.disabled||x.textContent===String(a+1)&&y.textContent===String(b+1);
    },[i,i+1]);
  }
  const pairs=new Map();for(const [n,symbol] of revealed){const ids=pairs.get(symbol)??[];ids.push(n);pairs.set(symbol,ids);}
  for(const ids of pairs.values()){
    assert.equal(ids.length,2);
    if(await page.locator(`[data-card="${ids[0]}"]`).isDisabled())continue;
    await click(`[data-card="${ids[0]}"]`);await click(`[data-card="${ids[1]}"]`);await frames(.03);
  }
  await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade.boards===1);
  assert.equal((await state()).arcade.over,false);assert.equal((await state()).arcade.score,1000);
  await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade.boardDelay===0);
  assert.equal(await page.locator('[data-card]:disabled').count(),0,'a complete board gives a fresh set of questions');
  await page.screenshot({path:out+'/pairs-next-board.png'});
  let wrong;
  for(let i=0;i<16&&!wrong;i+=2){
    const health=(await state()).arcade.health;await click(`[data-card="${i}"]`);await click(`[data-card="${i+1}"]`);
    if((await state()).arcade.health<health)wrong=[i,i+1];
    await frames(.9);
  }
  assert.ok(wrong);
  const earned=(await state()).arcade.score;
  while(!(await state()).arcade.over){await click(`[data-card="${wrong[0]}"]`);await click(`[data-card="${wrong[1]}"]`);await frames(.9);}
  assert.equal((await state()).arcade.health,0);assert.equal((await state()).arcade.score,earned);
  assert.ok((await page.locator('.arcade-result').textContent()).includes('本局结束'));
  await page.screenshot({path:out+'/pairs-finish.png'});console.log('paused input, restart, pairs renewed board and health ending');
  await click('[data-back]');await click('[data-close]');await page.reload();
  await page.waitForFunction(()=>window.__xiangmetaInspect&&!document.querySelector('#world-loading'),null,{timeout:90000});
  await click('#seasonal-games');assert.ok((await page.locator('.seasonal-card').nth(1).textContent()).includes('最佳'));
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('xiangmeta.games.v1.race.summer.2'))),best);
  assert.deepEqual(errors,[]);console.log('PASS complete game experience and persisted record after reload');
}catch(e){await page.screenshot({path:out+'/failure.png'});console.error(errors);throw e;}
finally{await browser.close();}
