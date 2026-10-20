import test from 'node:test';
import assert from 'node:assert/strict';
import {WeatherCycle,weatherKinds} from '../shared/weather.mjs';
import {starPosition,memoryEntries} from '../shared/memories.mjs';
import {loadCatalog} from '../backend/catalog.mjs';
import {regionHeight} from '../shared/terrain-height.mjs';

test('weather fades continuously, retargets without a jump, freezes, and randomly changes without immediate repeats',()=>{
 const sky=new WeatherCycle(()=>.3);sky.select('rain');const start={...sky.value};sky.update(.016);assert.ok(sky.value.rain<.00001);sky.update(12);const midway={...sky.value};sky.select('snow');assert.deepEqual(sky.value,midway);const frozen={...sky.value};sky.update(60,true);assert.deepEqual(sky.value,frozen);sky.update(24);assert.equal(sky.value.snow,1);assert.equal(sky.value.rain,0);const previous=sky.target;sky.update(300);assert.notEqual(sky.target,previous);
 for(const kind of weatherKinds){sky.select(kind);for(let i=0;i<240;i++){sky.update(.1);for(const value of Object.values(sky.value))assert.ok(Number.isFinite(value)&&value>=0&&value<=1);}}assert.equal(start.rain,0);
});
test('all numbered memories have separated sequential star positions and photo names keep locations separately',async()=>{
 const {public:catalog}=await loadCatalog(process.cwd()),entries=memoryEntries(catalog),positions=entries.map(e=>starPosition(e.id,entries));assert.equal(new Set(positions.map(p=>`${p.x},${p.y}`)).size,entries.length);
 for(let i=1;i<positions.length;i++)assert.ok(Math.hypot(positions[i].x-positions[i-1].x,positions[i].y-positions[i-1].y)<=70);
 for(const media of catalog.modules.find(m=>m.id==='photography').media){assert.ok(!media.title.includes('-'));assert.ok(media.location);}
 const mountain=catalog.regions.find(r=>r.terrain),[x,z]=mountain.discovery.position,y=regionHeight(x,z,mountain);
 for(let i=0;i<12;i++)assert.ok(Math.abs(regionHeight(x+Math.cos(i*Math.PI/6)*1.2,z+Math.sin(i*Math.PI/6)*1.2,mountain)-y)<.06,'butterfly plinth must sit on a level patch');
});
