import test from 'node:test';import assert from 'node:assert/strict';
import {loadCatalog} from '../backend/catalog.mjs';
import {bridgeLightSpan} from '../shared/bridge-joints.mjs';
import {hillsideRoute,roundRoute} from '../shared/mountain-route.mjs';
import {railRuns} from '../shared/rail-runs.mjs';
test('bridge edge lighting stops outside the circular rim at all four island entrances',async()=>{
 const {public:c}=await loadCatalog(process.cwd());
 for(const r of c.regions){const distance=Math.hypot(...r.position),s=bridgeLightSpan(distance,r.radius);assert.ok(s.length>0);assert.ok(Math.hypot(s.start,2.65)>7.9);assert.ok(Math.hypot(distance-s.end,2.65)>r.radius-.28);assert.ok(Math.hypot(distance-s.end,2.65)<r.radius);}
});
test('hairpin slope height stays continuous when the nearest road leg changes',()=>{
 const route={width:3.2,points:roundRoute([[-8,-2,0],[8,-2,0],[8,2,4],[-8,2,4]])};
 let previous=hillsideRoute(0,-.5,route).y;
 for(let z=-.49;z<=.5;z+=.01){const current=hillsideRoute(0,z,route).y;assert.ok(Math.abs(current-previous)<.1);previous=current;}
 assert.equal(hillsideRoute(0,-2,route).y,0);assert.equal(hillsideRoute(0,2,route).y,4);
});
test('a buried railing bay splits a run without leaving isolated posts',()=>{
 const samples=Array.from({length:8},(_,i)=>({x:i,y:0,z:0}));
 const runs=railRuns(samples,(a,b)=>!(a.x===3&&b.x===4));assert.deepEqual(runs.map(r=>r.map(p=>p.x)),[[0,1,2,3],[4,5,6,7]]);
});
