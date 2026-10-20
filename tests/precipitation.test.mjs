import test from 'node:test';
import assert from 'node:assert/strict';
import {precipitationSamples} from '../shared/precipitation.mjs';
import {footprintsOverlap} from '../shared/decoration-clearance.mjs';
import {shoreLayout} from '../shared/shore-layout.mjs';

test('rain fills space without correlated planes or synchronized fall',()=>{
  const drops=precipitationSamples(7200);
  const correlation=(a,b)=>{const n=a.length,ma=a.reduce((s,v)=>s+v,0)/n,mb=b.reduce((s,v)=>s+v,0)/n;return a.reduce((s,v,i)=>s+(v-ma)*(b[i]-mb),0)/Math.sqrt(a.reduce((s,v)=>s+(v-ma)**2,0)*b.reduce((s,v)=>s+(v-mb)**2,0));};
  for(const key of ['x','y','z']){const values=drops.map(p=>p[key]);assert.ok(Math.abs(correlation(values.slice(0,-1),values.slice(1)))<.04,'no repeating interval on '+key);}
  for(const [a,b] of [['x','y'],['x','z'],['y','z']])assert.ok(Math.abs(correlation(drops.map(p=>p[a]),drops.map(p=>p[b])))<.04);
  // A horizontal slice should remain populated across the whole map from any heading.
  for(let angle=0;angle<Math.PI;angle+=Math.PI/12){const bins=Array(16).fill(0);for(const p of drops){const projected=((p.x+12)*Math.cos(angle)+(p.z+12)*Math.sin(angle));if(Math.abs(projected)<40&&p.y<28)bins[Math.floor((projected+40)/5)]++;}assert.ok(Math.min(...bins)>45);assert.ok(Math.max(...bins)/Math.min(...bins)<2);}
  assert.ok(new Set(drops.map(p=>p.speed.toFixed(2))).size>500);assert.ok(new Set(drops.map(p=>p.length.toFixed(3))).size>400);
});
test('decoration clearance includes complete footprints and diagonal rail spans',()=>{
  const seat={x:0,z:0,halfX:1,halfZ:.4};
  assert.equal(footprintsOverlap(seat,{x:1.3,z:0,radius:.1},.3),true);
  assert.equal(footprintsOverlap(seat,{segment:[-.4,-1,.4,1],radius:.05}),true);
  assert.equal(footprintsOverlap(seat,{x:2,z:2,radius:.2},.3),false);
  assert.equal(footprintsOverlap({x:0,z:0,halfX:1.7,halfZ:1.4},{x:1.5,z:0,radius:.15}),true);
});
test('rear science rails leave space around the equipment cabinets',()=>{
  const region={position:[24,-20],radius:17,scenery:'laboratory'};
  const entries=shoreLayout(region);assert.ok(entries.some(e=>!e.fenceClear));
  for(const e of entries.filter(e=>e.plant))for(const x of [-12,12])assert.ok(Math.hypot(e.plant.x-x,e.plant.z+9)>=3.2,'tree crown clears tall pipe supports');
  for(const e of entries.filter(e=>e.fenceClear)){const {angle:a,fence:f}=e,rail={segment:[f.x-Math.sin(a)*.75,f.z+Math.cos(a)*.75,f.x+Math.sin(a)*.75,f.z-Math.cos(a)*.75],radius:.04};for(let n=0;n<5;n++)assert.ok(!footprintsOverlap(rail,{x:-9+n*4.5,z:-12,halfX:1.1,halfZ:.65},.29));}
});
