import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalog} from '../backend/catalog.mjs';
import {groundHeight} from '../shared/terrain-height.mjs';
import {createWalker,advanceWalker} from '../shared/locomotion.mjs';
test('mountain projects occupy ascending terraces and the arrival meets the sea-level bridge',async()=>{
  const {public:c}=await loadCatalog(process.cwd()),r=c.regions.find(r=>r.terrain);
  const heights=['recommendation','emotion-recognition','poetry','cat-recognition','xianglm'].map(id=>{const m=c.modules.find(m=>m.id===id);return groundHeight(r.position[0]+m.position[0],r.position[1]+m.position[1],c.regions);});
  assert.deepEqual(heights,[1,4,7,10,13]);assert.equal(groundHeight(r.position[0]+r.spawn[0],r.position[1]+r.spawn[1],c.regions),0);assert.equal(groundHeight(0,0,c.regions),0);
});
test('slopes retain fixed-step consistency and a forward jump cannot enter rising terrain',async()=>{
  const {public:c}=await loadCatalog(process.cwd()),r=c.regions.find(r=>r.terrain);
  function run(dt,jump=false){const p=createWalker(r.position[0],r.position[1]+12,c.regions);for(let t=0;t<1.2-1e-6;t+=dt){advanceWalker(p,{x:0,z:-5.2,jump:jump&&t===0},dt,c.regions,[]);assert.ok(p.y>=groundHeight(p.x,p.z,c.regions)-.002);}return p;}
  const slow=run(.1),fast=run(1/120);assert.ok(Math.abs(slow.z-fast.z)<1e-6);assert.ok(Math.abs(slow.y-fast.y)<1e-6);run(1/60,true);
});

test('neighbouring mountain roads and upper landings cannot rise through exhibit foundations',async()=>{
 const {public:c}=await loadCatalog(process.cwd()),r=c.regions.find(r=>r.terrain);
 for(const terrace of r.terrain.terraces)for(let x=-4.3;x<=4.3;x+=.17)for(let z=-4.3;z<=4.3;z+=.17){
  if(Math.hypot(x,z)>4.3)continue;
  assert.ok(Math.abs(groundHeight(r.position[0]+terrace.center[0]+x,r.position[1]+terrace.center[1]+z,c.regions)-terrace.height)<1e-6);
 }
});
