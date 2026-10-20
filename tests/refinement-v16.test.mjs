import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalog} from '../backend/catalog.mjs';
import {regionHeight} from '../shared/terrain-height.mjs';
import {railRuns} from '../shared/rail-runs.mjs';
import {solveOscillation} from '../shared/research-physics.mjs';

test('mountain arrival climbs gently with no landing step across the entrance width',async()=>{
 const {public:c}=await loadCatalog(process.cwd()),r=c.regions.find(r=>r.terrain);
 for(const x of [7,8,9]){let previous=regionHeight(x,23.5,r);
  for(let z=23.49;z>=18.6;z-=.01){const y=regionHeight(x,z,r);assert.ok(y>=previous-.001);assert.ok(y-previous<.005,'no abrupt raised landing lip');previous=y;}
  assert.ok(previous>.98);
 }
});
test('rail openings never leave lone posts or one-bay fragments',()=>{
 const p=x=>({x,y:0,z:0});assert.deepEqual(railRuns([p(0),null,p(3),p(4),null]),[]);
 assert.deepEqual(railRuns([p(0),p(1),p(2),null,p(7),p(8),p(9)]).map(r=>r.length),[3,3]);
 assert.deepEqual(railRuns([p(0),p(1),p(2),p(20)]).map(r=>r.length),[3]);
});
test('all retained acoustic controls affect the physical radius curve',()=>{
 const p={drive:1.15,frequency:26.5,radius:4.5,kappa:1.4,tension:72,molality:0,osmotic:1};
 const signature=p=>{const r=solveOscillation(p);return [Math.max(...r.samples.map(s=>s.r)),Math.min(...r.samples.map(s=>s.r)),r.samples.at(-1).t];};
 const baseline=signature(p);
 for(const [key,value] of Object.entries({drive:.7,frequency:38,radius:7,kappa:1.05,tension:52})){const s=signature({...p,[key]:value});assert.ok(s.some((v,i)=>Math.abs(v-baseline[i])>.1),key);}
});
