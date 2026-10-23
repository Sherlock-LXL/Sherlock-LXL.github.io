import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {loadCatalog} from '../backend/catalog.mjs';
import {LivingNavigation} from '../shared/living-navigation.mjs';
import {findTrail} from '../shared/trail.mjs';

const out=process.env.GAME_ARTIFACTS??'/private/tmp/mounted-travel';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=metal']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const click=async selector=>{const el=page.locator(selector);await el.waitFor({state:'visible'});const b=await el.boundingBox();assert.ok(b);await page.mouse.click(b.x+b.width/2,b.y+b.height/2);};
const inspect=()=>page.evaluate(()=>window.__xiangmetaInspect());
const frames=seconds=>page.evaluate(seconds=>new Promise(resolve=>{const start=performance.now();const tick=()=>performance.now()-start>=seconds*1000?resolve():requestAnimationFrame(tick);requestAnimationFrame(tick);}),seconds);
const held=new Set();
const keys=async next=>{for(const k of held)if(!next.includes(k)){await page.keyboard.up(k);held.delete(k);}for(const k of next)if(!held.has(k)){await page.keyboard.down(k);held.add(k);}};
try{
  await page.goto((process.env.GAME_ORIGIN??'http://127.0.0.1:4191')+'/world/?inspect');
  await page.waitForFunction(()=>window.__xiangmetaInspect&&!document.querySelector('#world-loading'),null,{timeout:90000});
  await click('#help');await click('#low-quality');await click('#close-panel');
  const regions=(await loadCatalog(process.cwd())).public.regions,initial=await inspect(),nav=new LivingNavigation(regions,initial.obstacles);
  const animal=initial.living.animals.find(a=>a.kind==='polar-bear'),dynamic=[...initial.living.items,...initial.living.animals];
  let approach;
  for(let i=0;i<32&&!approach;i++){
    const angle=i*Math.PI/16,x=animal.x+Math.sin(angle)*(animal.radius+.82),z=animal.z+Math.cos(angle)*(animal.radius+.82);
    if(nav.travel(x,z,.35,animal.regionId,dynamic)!==null&&nav.sight({x,y:.6,z},{...animal,y:.6}))approach={x,z};
  }
  assert.ok(approach);
  // Only the initial arrival uses the inspector helper. All subsequent travel uses WASD.
  await page.evaluate(p=>window.__xiangmetaWalk(...p),[approach.x,approach.z,animal.x,animal.z]);
  await page.keyboard.press('q');await page.keyboard.press('t');
  await page.waitForFunction(()=>window.__xiangmetaInspect().living.mounted==='polar-bear');
  let start=(await inspect()).player;
  // The authored walker planner uses 0.35 m clearance; reserve extra room for the bear.
  const wide=initial.obstacles.map(o=>({...o,radius:o.radius+.25,...(o.halfX!==undefined?{halfX:o.halfX+.25,halfZ:o.halfZ+.25}:{})}));
  const approachPath=findTrail(start,{x:12.5,z:-10.4},regions,wide,.6);assert.ok(approachPath.length>0);
  const route=[...approachPath,{x:6,z:-4.8},{x:0,z:-6},{x:-5,z:-6},{x:-6,z:-7.5},{x:-16.2,z:-20.2},{x:-18,z:-21},{x:-21,z:-19.5},{x:-24,z:-18.5}];
  let target=1,previous=start,blocked=0;const deadline=performance.now()+90000;
  while(target<route.length&&performance.now()<deadline){
    const s=await inspect(),p=s.player;assert.equal(s.living.mounted,'polar-bear');assert.equal(p.grounded,true);
    const dx=route[target].x-p.x,dz=route[target].z-p.z,d=Math.hypot(dx,dz);
    if(d<.42){target++;continue;}
    const f=(-Math.sin(s.yaw)*dx-Math.cos(s.yaw)*dz)/d,side=(Math.cos(s.yaw)*dx-Math.sin(s.yaw)*dz)/d,next=[];
    if(f>.383)next.push('w');if(f<-.383)next.push('s');if(side>.383)next.push('d');if(side<-.383)next.push('a');
    await keys(next);await frames(.04);
    if(Math.hypot(p.x-previous.x,p.z-previous.z)<.01)blocked++;else blocked=0;
    assert.ok(blocked<35,`mount stuck approaching ${JSON.stringify(route[target])}`);previous=p;
  }
  await keys([]);assert.equal(target,route.length,'winter → bridge → hub → spring bridge');
  const arrived=await inspect();assert.ok(Math.hypot(arrived.player.x-start.x,arrived.player.z-start.z)>30);
  await page.keyboard.press('t');await page.waitForFunction(()=>window.__xiangmetaInspect().living.mounted===null);
  const end=await inspect(),bear=end.living.animals.find(a=>a.kind==='polar-bear');
  assert.equal(bear.regionId,'ai-mountain');assert.ok(Math.hypot(bear.home.x-arrived.player.x,bear.home.z-arrived.player.z)<.01);
  assert.ok(Math.hypot(end.player.x-bear.x,end.player.z-bear.z)>bear.radius);
  await page.screenshot({path:out+'/cross-island-dismount.png'});
  assert.deepEqual(errors,[]);await writeFile(out+'/result.json',JSON.stringify({start,end:end.player,bear,errors},null,2));
  console.log('PASS real mounted travel across winter bridge, hub, spring bridge and safe dismount',end.player,bear.regionId);
}catch(e){await page.screenshot({path:out+'/failure.png'});await writeFile(out+'/failure.json',JSON.stringify(await inspect()));throw e;}
finally{await browser.close();}
