import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { daylight,advanceFlight } from '../shared/atmosphere.mjs';
import { shoreLayout } from '../shared/shore-layout.mjs';
test('solar and lunar orbits oppose one another and both horizons blend continuously',()=>{
  for(const hour of [0,6,12,18,24]){
    const a=daylight(hour-.0001),b=daylight(hour+.0001);assert.ok(Math.abs(a.day-b.day)<.001);assert.ok(Math.abs(a.sun-b.sun)<.001);assert.ok(Math.abs(a.moon-b.moon)<.001);
  }
  assert.equal(daylight(12).day,1);assert.equal(daylight(0).day,0);
  assert.equal(daylight(12).moon,0);assert.equal(daylight(0).sun,0);
  for(let hour=0;hour<24;hour+=.05){const s=daylight(hour);assert.ok(Math.abs(Math.sin(s.angle)+Math.sin(s.angle+Math.PI))<1e-12);assert.ok(s.day>=0&&s.day<=1);}
});
test('paper flight activation and retriggering preserve continuous phase and lift',()=>{
  const state={energy:0,phase:123.45};let age=100;
  for(let i=0;i<1000;i++){
    if(i===0||i===150)age=0;
    const before={...state};advanceFlight(state,age,1/120);age+=1/120;
    assert.ok(Math.abs(state.energy-before.energy)<.021);assert.ok(state.phase>=before.phase);assert.ok(state.phase-before.phase<=10/120+.0001);
  }
  for(let i=0;i<1200;i++){advanceFlight(state,age,1/120);age+=1/120;}assert.ok(state.energy<.00001);
});
test('shore furnishing bands clear rails and preserve bridge entrances',async()=>{
  const {regions}=JSON.parse(await readFile(new URL('../data/world.json',import.meta.url),'utf8'));
  for(const region of regions){
    const entries=shoreLayout(region);for(const e of entries){
      const [rx,rz]=region.position;assert.ok((e.fence.x*-rx+e.fence.z*-rz)/Math.hypot(rx,rz)/Math.hypot(e.fence.x,e.fence.z)<=.88);
      if(!e.plant)continue;
      for(const rail of entries){
        const dx=e.plant.x-rail.fence.x,dz=e.plant.z-rail.fence.z;
        const normal=dx*Math.cos(rail.angle)+dz*Math.sin(rail.angle),along=-dx*Math.sin(rail.angle)+dz*Math.cos(rail.angle);
        assert.ok(Math.hypot(normal,Math.max(0,Math.abs(along)-.75))>.9,'trunks and lamps clear every rail segment');
      }
    }
  }
});
