import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';

const mobile=process.env.GAME_TOUCH==='1',engine=process.env.GAME_ENGINE==='webkit'?webkit:chromium;
const out=process.env.GAME_ARTIFACTS??'/private/tmp/xiangmeta-detail-refinement';
await mkdir(out,{recursive:true});
const browser=await engine.launch({headless:true,args:engine===chromium?['--use-angle=metal']:[]});
const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:mobile,isMobile:mobile,acceptDownloads:true});
const errors=[],report={mobile,engine:engine===chromium?'chromium':'webkit'};
page.setDefaultTimeout(20000);
page.on('pageerror',e=>errors.push(e.message));
page.on('console',e=>{if(e.type()==='error'||/GL_INVALID|INVALID_OPERATION|WebGL.*warning/i.test(e.text()))errors.push(e.text());});
page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));
page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
const frames=seconds=>page.evaluate(seconds=>new Promise(resolve=>{
  const start=performance.now(),tick=()=>performance.now()-start>=seconds*1000?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick);
}),seconds);
const state=()=>page.evaluate(()=>window.__xiangmetaInspect());
const click=async selector=>{
  const el=page.locator(selector);await el.waitFor({state:'visible'});await el.scrollIntoViewIfNeeded();
  const b=await el.boundingBox();assert.ok(b,selector);
  if(mobile)await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);
  else await page.mouse.click(b.x+b.width/2,b.y+b.height/2);
};
const menu=async()=>{
  if(!mobile)return;
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('.mobile-nav-dismiss')).visibility==='hidden');
  await click('#mobile-menu');await page.waitForFunction(()=>Math.abs(document.querySelector('.sidebar').getBoundingClientRect().x)<1);
};
const closedMenu=async()=>{if(mobile)await page.waitForFunction(()=>getComputedStyle(document.querySelector('.mobile-nav-dismiss')).visibility==='hidden');};
try{
  const origin=process.env.GAME_ORIGIN??'http://127.0.0.1:4191';
  await page.goto(origin+'/');
  const paper=await page.locator('body').evaluate(el=>({color:getComputedStyle(el).backgroundColor,image:getComputedStyle(el).backgroundImage}));
  let releaseProgram;
  const programReady=new Promise(resolve=>{releaseProgram=resolve;});
  await page.route('**/assets/main-*.js',async route=>{await programReady;await route.continue();});
  await page.goto(origin+'/world/?inspect',{waitUntil:'domcontentloaded'});
  const entry=await page.locator('.web-loading').evaluate(el=>({color:getComputedStyle(el).backgroundColor,image:getComputedStyle(el).backgroundImage}));
  assert.deepEqual(entry,paper,'home and world entry share the same paper colour and fibre');
  report.paper=entry;await page.screenshot({path:out+'/entry.png'});
  releaseProgram();
  await page.waitForFunction(()=>window.__xiangmetaInspect&&!document.querySelector('#world-loading'),null,{timeout:90000});
  await click('#help');await click('#low-quality');await click('#close-panel');
  const initial=await state(),surfaces=initial.obstacles.filter(o=>o.surface);
  assert.equal(surfaces.length,3);assert.ok(surfaces.every(o=>o.ellipse&&o.base<o.height));
  assert.equal(initial.games.stalls.length,4);report.colliders=initial.obstacles.length;
  if(mobile){
    await menu();await click('[data-region="science-valley"]');await closedMenu();
    const b=await page.locator('#touch-joystick').boundingBox(),centre={x:b.x+b.width/2,y:b.y+b.height/2};
    assert.equal(await page.locator('.touch-joystick-ring').count(),1);
    if(engine===chromium){
      const cdp=await page.context().newCDPSession(page);
      const move=async distance=>{
        const start=(await state()).player,point={x:centre.x,y:centre.y-distance,id:1};
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});
        await frames(.4);const end=(await state()).player;
        const sprinting=await page.locator('#touch-joystick').evaluate(el=>el.classList.contains('sprinting'));
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        return {distance:Math.hypot(end.x-start.x,end.z-start.z),sprinting};
      };
      const walk=await move(38);await menu();await click('[data-region="science-valley"]');await closedMenu();
      const run=await move(59);assert.equal(walk.sprinting,false);assert.equal(run.sprinting,true);
      assert.ok(run.distance>walk.distance*1.45);report.joystick={walk,run};
      await menu();await click('[data-region="science-valley"]');await closedMenu();
      const jump=await page.locator('#touch-jump').boundingBox();
      const points=[{x:centre.x,y:centre.y-59,id:1},{x:jump.x+jump.width/2,y:jump.y+jump.height/2,id:2}];
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
      await page.waitForFunction(()=>!window.__xiangmetaInspect().player.grounded);
      await page.screenshot({path:out+'/sprint-jump.png'});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await cdp.detach();
      await frames(.6);const stopped=(await state()).player;await frames(.2);const still=(await state()).player;
      assert.ok(Math.hypot(still.x-stopped.x,still.z-stopped.z)<.001);
      assert.equal(await page.locator('#touch-joystick').evaluate(el=>el.classList.contains('sprinting')),false);
    }else await page.screenshot({path:out+'/joystick.png'});
  }else{
    await click('#seasonal-games');await click('[data-free="autumn"]');
    await page.waitForFunction(()=>window.__xiangmetaInspect().games.race.countdown===0);
    await page.keyboard.down('w');
    await page.waitForFunction(()=>window.__xiangmetaInspect().games.vehicle.y<=-5.529,null,{timeout:18000});
    await page.keyboard.up('w');const grounded=(await state()).games;
    assert.equal(grounded.race.countdown,0);assert.equal(grounded.race.penalty,0);
    await page.screenshot({path:out+'/flight-contact.png'});
    await page.keyboard.down('s');await frames(1.4);await page.keyboard.up('s');
    const lifted=(await state()).games;assert.ok(lifted.vehicle.y>grounded.vehicle.y+3);assert.equal(lifted.race.countdown,0);
    report.flight={ground:grounded.vehicle.y,lifted:lifted.vehicle.y};
    await page.keyboard.press('p');await click('[data-exit]');
    await click('#seasonal-games');await click('[data-free="summer"]');
    await page.waitForFunction(()=>window.__xiangmetaInspect().games.race.countdown===0);
    await page.keyboard.down('w');await page.keyboard.down('Shift');await frames(3);
    await page.keyboard.up('Shift');await page.keyboard.up('w');
    const boat=(await state()).games.vehicle;assert.ok(boat.speed>18);assert.ok(boat.pitch<.1);
    report.boat={speed:boat.speed,pitch:boat.pitch};await page.screenshot({path:out+'/boat-boost.png'});
    await page.keyboard.press('p');await click('[data-exit]');
    await click('#seasonal-games');await click('[data-arcade]');await click('[data-game="bricks"]');
    const b=await page.locator('.arcade-stage canvas').boundingBox();
    await page.mouse.click(b.x+b.width/2,b.y+b.height*.9);
    await page.waitForFunction(()=>window.__xiangmetaInspect().games.arcade.mouseActive);
    const before=(await state()).games.arcade.paddle;await page.mouse.move(b.x+b.width*.7,b.y+b.height*.9);
    await page.waitForFunction(p=>window.__xiangmetaInspect().games.arcade.paddle>p+.1,before);
    assert.equal(await page.locator('.arcade-stage canvas').evaluate(el=>getComputedStyle(el).cursor),'none');
    const following=(await state()).games.arcade.paddle;await page.mouse.click(b.x+b.width*.7,b.y+b.height*.9);
    assert.ok(Math.abs((await state()).games.arcade.paddle-following)<.001,'another click does not snap the locked paddle back');
    await page.keyboard.press('p');await page.waitForFunction(()=>!document.pointerLockElement);
    assert.notEqual(await page.locator('.arcade-stage canvas').evaluate(el=>getComputedStyle(el).cursor),'none');
    await click('[data-back]');await click('[data-close]');report.mouseFollow=true;
  }
  for(const id of ['quant-exchange','robot-island','ai-institute']){
    await menu();await click('#horizons-open');await click(`[data-horizon="${id}"]`);await click('#horizon-view');await closedMenu();
    await page.locator('body.photo-mode').waitFor();await page.screenshot({path:out+'/'+id+'.png'});
    const exported=page.waitForEvent('download');await click('#photo-save');await (await exported).saveAs(out+'/'+id+'-photo.png');
    await click('#photo-exit');
    if(!mobile&&await page.evaluate(()=>!!document.pointerLockElement)){await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.pointerLockElement);}
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log('PASS detail refinement',report);
}catch(e){await page.screenshot({path:out+'/failure.png'});console.error(errors);throw e;}
finally{await browser.close();}
