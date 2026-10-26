import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const out=process.env.GAME_ARTIFACTS??'/private/tmp/arcade-polish';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=metal']}),page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const read=()=>page.evaluate(()=>window.__xiangmetaInspect().games.arcade);
const click=async sel=>{const el=page.locator(sel);await el.waitFor({state:'visible'});await el.scrollIntoViewIfNeeded();const b=await el.boundingBox();await page.mouse.click(b.x+b.width/2,b.y+b.height/2);};
try{
  await page.goto((process.env.GAME_ORIGIN??'http://127.0.0.1:4191')+'/world/?inspect');
  await page.waitForFunction(()=>window.__xiangmetaInspect&&!document.querySelector('#world-loading'),null,{timeout:90000});
  await click('#help');await click('#low-quality');await click('#close-panel');await click('#seasonal-games');await click('[data-arcade]');
  await click('[data-game="snake"]');await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade?.id==='snake');
  await page.waitForFunction(()=>{const s=window.__xiangmetaInspect().games.arcade;return s.time>1.8&&s.snake[0].x<5;});
  assert.equal((await read()).over,false);console.log('snake wrapped through the right wall');
  await click('[data-back]');await click('[data-game="merge"]');await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade?.id==='merge');
  for(const key of ['ArrowLeft','ArrowDown','ArrowRight','ArrowUp'])await page.keyboard.press(key);
  await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade.moves>1&&window.__xiangmetaInspect().games.arcade.mergeAge===.12);
  assert.equal((await read()).over,false);await page.screenshot({path:out+'/2048.png'});console.log('2048 rapid inputs settle with valid tiles');
  await click('[data-back]');await click('[data-game="pairs"]');await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade?.id==='pairs');
  const before=(await read()).score;await click('[data-card="0"]');assert.equal((await read()).score,before);
  await click('[data-card="0"]');assert.equal((await read()).score,before);
  await click('[data-back]');await click('[data-game="bricks"]');await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade?.id==='bricks');
  const canvas=await page.locator('.arcade-stage canvas').boundingBox();await page.mouse.click(canvas.x+canvas.width*.5,canvas.y+canvas.height*.9);
  await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade.mouseActive);
  assert.equal(await page.locator('.arcade-stage canvas').evaluate(c=>getComputedStyle(c).cursor),'none');
  const speed=(await read()).ballSpeed,deadline=performance.now()+35000;
  while(performance.now()<deadline){
    const s=await read();assert.equal(s.over,false);
    if(s.rows>4){assert.ok(s.ballSpeed>speed);break;}
    await page.mouse.move(canvas.x+Math.max(.1,Math.min(.9,s.ball.x))*canvas.width,canvas.y+canvas.height*.9);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  }
  assert.ok((await read()).rows>4);await page.keyboard.press('p');assert.equal((await read()).paused,true);
  await page.waitForFunction(()=>!document.pointerLockElement);await page.screenshot({path:out+'/endless-wave.png'});
  await click('[data-back]');await click('[data-game="falling"]');await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade?.id==='falling');
  const bowl=await page.locator('.arcade-stage canvas').boundingBox();
  const dropTime=(await read()).time;
  await page.mouse.click(bowl.x+bowl.width*.5,bowl.y+bowl.height*.1);
  await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade.falling.balls.some(b=>b.pulse>.04&&b.vy<-.3));
  const impact=await read();assert.ok(impact.time-dropTime<.85,'a real drop lands promptly and rebounds');
  await page.screenshot({path:out+'/falling-impact.png'});
  for(let i=1;i<14;i++){
    await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade.falling.cooldown===0);
    const state=await read(),x=.24+state.falling.next[0]*.26;
    await page.mouse.click(bowl.x+bowl.width*x,bowl.y+bowl.height*.1);
    await page.waitForFunction(count=>window.__xiangmetaInspect().games.arcade.falling.drops>count,state.falling.drops);
  }
  await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade.score>0);
  const falling=await read();assert.equal(falling.over,false);assert.ok(falling.falling.highest>0);
  await click('.seasonal-dialog [data-pause]');const frozen=JSON.stringify((await read()).falling.balls);
  await page.evaluate(()=>new Promise(resolve=>{const start=performance.now();const tick=()=>performance.now()-start>.3*1000?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick);}));
  assert.equal(JSON.stringify((await read()).falling.balls),frozen);
  await page.screenshot({path:out+'/falling-merge.png'});
  await click('.seasonal-dialog [data-restart]');assert.equal((await read()).falling.drops,0);assert.equal((await read()).score,0);
  assert.deepEqual(errors,[]);console.log('PASS arcade rules, descending rows, falling-ball merges, pause and restart');
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await browser.close();}
