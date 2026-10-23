import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {loadCatalog} from '../backend/catalog.mjs';
import {LivingNavigation} from '../shared/living-navigation.mjs';
import {updateAnimal} from '../shared/animal-behavior.mjs';
import {seededRandom} from '../shared/living-catalog.mjs';

// Run after npm run build, with a local preview. Arrival helpers only set up a case;
// every measured walk, reverse, jump, pet, mount and dismount uses real input.
const origin=process.env.ANIMAL_ORIGIN??'http://127.0.0.1:4191';
const out=process.env.ANIMAL_ARTIFACTS??'/private/tmp/animal-experience';
await mkdir(out,{recursive:true});
const engine=process.env.ANIMAL_ENGINE==='webkit'?webkit:chromium;
const browser=await engine.launch({headless:true});
const touch=process.env.ANIMAL_TOUCH==='1';
const page=await browser.newPage({viewport:touch?{width:390,height:844}:{width:1280,height:900},hasTouch:touch,isMobile:touch});
page.setDefaultTimeout(18000);
const errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
const catalog=(await loadCatalog(process.cwd())).public;
const inspect=()=>page.evaluate(()=>window.__xiangmetaInspect());
const frames=async(n=40)=>page.evaluate(n=>new Promise(resolve=>{
  const samples=[],start=window.__xiangmetaInspect().living.animals[0].expression;
  const tick=()=>{const s=window.__xiangmetaInspect();samples.push({player:s.player,mounted:s.living.mounted,animals:s.living.animals});
    if(s.living.animals[0].expression-start>=n/60)resolve(samples);else requestAnimationFrame(tick);};requestAnimationFrame(tick);
}),n);
const walk=async(x,z,tx,tz)=>{await page.evaluate(p=>window.__xiangmetaWalk(...p),[x,z,tx,tz]);};
const move=async(key,down=true)=>{
  if(!touch){await page.keyboard[down?'down':'up'](key);return;}
  if(!down){await page.mouse.up();return;}
  const b=await page.locator('#touch-joystick').boundingBox();assert.ok(b);
  const x=b.x+b.width/2,z=b.y+b.height/2;
  await page.mouse.move(x,z);await page.mouse.down();
  const delta={w:[0,-37],s:[0,37],a:[-37,0],d:[37,0]}[key];await page.mouse.move(x+delta[0],z+delta[1],{steps:3});
};
try{
  await page.goto(origin+'/world/?inspect');await page.waitForFunction(()=>window.__xiangmetaInspect?.().calls>0,null,{timeout:90000});
  const initial=await inspect(),nav=new LivingNavigation(catalog.regions,initial.obstacles);
  console.log('world ready');
  // Use real rendered obstacle data to catch animals stranded in tiny clearings.
  const population=structuredClone(initial.living.animals),random=seededRandom(27),distance=new Map(population.map(a=>[a.kind,0]));
  for(let i=0;i<1800;i++)for(const a of population){
    const before={x:a.x,z:a.z};
    updateAnimal(a,.1,{x:0,y:0,z:0},nav,[...initial.living.items,...population.filter(b=>b!==a)],random);
    distance.set(a.kind,distance.get(a.kind)+Math.hypot(a.x-before.x,a.z-before.z));
    assert.notEqual(nav.travel(a.x,a.z,a.radius,a.regionId),null,`world clearance ${a.kind}`);
  }
  assert.ok([...distance.values()].every(d=>d>2),'all ten inhabitants can roam in their actual habitat');
  console.log('three-minute real-map simulation',Object.fromEntries([...distance].map(([k,v])=>[k,Math.round(v)])));
  for(const original of initial.living.animals.filter(a=>!process.env.ANIMAL_KINDS||process.env.ANIMAL_KINDS.split(',').includes(a.kind))){
    const s=await inspect(),a=s.living.animals.find(a=>a.kind===original.kind),dynamic=[...s.living.items,...s.living.animals];
    let p=null;
    for(let i=0;i<32;i++){
      const angle=i*Math.PI/16,r=a.radius+.82,x=a.x+Math.sin(angle)*r,z=a.z+Math.cos(angle)*r;
      const y=nav.travel(x,z,.35,a.regionId,dynamic);
      if(y!==null&&Math.abs(y-a.y)<.3&&nav.sight({x,y:y+.6,z},{...a,y:a.y+.6})){p={x,z};break;}
    }
    assert.ok(p,`approach ${a.kind}`);await walk(p.x,p.z,a.x,a.z);
    await page.waitForFunction(name=>document.querySelector('#interaction-prompt b')?.textContent===name,a.name);
    await page.waitForFunction(()=>document.querySelector('#memory-prompt')?.hidden&&document.querySelector('#discovery-prompt')?.hidden);
    const petButton=await page.locator('[data-living-key="Q"]').elementHandle();
    if(process.env.ANIMAL_TOUCH==='1')await page.locator('[data-living-key="Q"]').click();else await page.keyboard.press('q');
    await page.waitForFunction(()=>window.__xiangmetaInspect().living.hearts>0);
    assert.ok(await petButton.evaluate(el=>el.isConnected),'behaviour changes preserve the pressed button');
    if(a.ride){
      if(process.env.ANIMAL_TOUCH==='1')await page.locator('[data-living-key="T"]').click();else await page.keyboard.press('t');
      await page.waitForFunction(kind=>window.__xiangmetaInspect().living.mounted===kind,a.kind);
      const start=await inspect(),mount=start.living.animals.find(b=>b.kind===a.kind);
      const paths=[['w',1,0],['s',-1,0],['d',0,1],['a',0,-1]].map(([key,f,side])=>({
        key,x:mount.x+(-Math.sin(start.yaw)*f+Math.cos(start.yaw)*side)*2.2,
        z:mount.z+(-Math.cos(start.yaw)*f-Math.sin(start.yaw)*side)*2.2,
      }));
      const path=paths.find(p=>nav.route(mount,p,mount.radius,mount.regionId,s.living.items));assert.ok(path,`riding route ${a.kind}`);
      await move(path.key);
      await page.waitForFunction(p=>{const s=window.__xiangmetaInspect().player;return Math.hypot(s.x-p.x,s.z-p.z)>.8;},start.player);
      await move(path.key,false);const forward=await inspect();
      const reverse={w:'s',s:'w',a:'d',d:'a'}[path.key];await move(reverse);
      await page.waitForFunction(p=>{const s=window.__xiangmetaInspect().player;return Math.hypot(s.x-p.x,s.z-p.z)>.5;},forward.player,{timeout:3000});
      await move(reverse,false);
      const reversed=await inspect(),dx=path.x-start.player.x,dz=path.z-start.player.z;
      assert.ok((reversed.player.x-forward.player.x)*dx+(reversed.player.z-forward.player.z)*dz<-.4*Math.hypot(dx,dz),'reverse input moves back along the arrival direction');
      if(touch)await page.locator('#touch-jump').tap();else await page.keyboard.press('Space');await page.waitForFunction(()=>!window.__xiangmetaInspect().player.grounded);
      const arc=await frames(80);assert.ok(Math.max(...arc.map(s=>s.player.y))-mount.y>1.8);
      await page.waitForFunction(()=>window.__xiangmetaInspect().player.grounded);
      if(touch)await page.locator('[data-living-key="T"]').tap();else await page.keyboard.press('t');await page.waitForFunction(()=>window.__xiangmetaInspect().living.mounted===null);
      const landed=await inspect(),exitPaths=[['w',1,0],['s',-1,0],['d',0,1],['a',0,-1]].map(([key,f,side])=>({
        key,x:landed.player.x+(-Math.sin(landed.yaw)*f+Math.cos(landed.yaw)*side)*1.2,
        z:landed.player.z+(-Math.cos(landed.yaw)*f-Math.sin(landed.yaw)*side)*1.2,
      }));
      const exitPath=exitPaths.find(p=>nav.route(landed.player,p,.35,mount.regionId,[...landed.living.items,...landed.living.animals]));
      assert.ok(exitPath,'dismount offers a walkable exit, away from real walls');
      await move(exitPath.key);const exit=await frames(25);await move(exitPath.key,false);
      assert.ok(Math.hypot(exit.at(-1).player.x-landed.player.x,exit.at(-1).player.z-landed.player.z)>.2,`walk after dismount ${a.kind}`);
    }else{
      // Walk into contact, then reverse and strafe out continuously.
      await move('w');const contact=await frames(22);await move('w',false);
      await move('s');const retreat=await frames(22);await move('s',false);
      assert.ok(Math.hypot(retreat.at(-1).player.x-contact.at(-1).player.x,retreat.at(-1).player.z-contact.at(-1).player.z)>.3,`contact escape ${a.kind}`);
      assert.ok(retreat.every(s=>Number.isFinite(s.player.y)&&s.player.grounded));
    }
    const final=await inspect(),b=final.living.animals.find(b=>b.kind===a.kind),d=b.ride?3.2:1.65,angle=b.yaw+.7;
    await page.evaluate(({b,d,angle})=>window.__xiangmetaFrame(
      [b.x+Math.sin(angle)*d,b.y+b.height*.68+.20,b.z+Math.cos(angle)*d],
      [b.x,b.y+b.height*.46,b.z],10),{b,d,angle});
    await page.screenshot({path:`${out}/${b.kind}.png`});await page.keyboard.press('p');
    results.push({kind:a.kind,pet:true,mount:!!a.ride,contactEscape:true});console.log('verified',a.kind);
  }
  assert.equal(initial.living.items.length,16);assert.equal(initial.foundations,5);assert.deepEqual(errors,[]);
  await writeFile(`${out}/results.json`,JSON.stringify({results,errors},null,2));
}catch(e){
  await page.screenshot({path:`${out}/failure.png`});await writeFile(`${out}/failure.json`,JSON.stringify({message:String(e),state:await inspect(),errors},null,2));throw e;
}finally{await browser.close();}
