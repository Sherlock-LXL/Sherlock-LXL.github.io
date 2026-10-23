import test from 'node:test';
import assert from 'node:assert/strict';
import {loadCatalog} from '../backend/catalog.mjs';
import {flightOpacity,birdDaylight,chooseFishRoute,fishRouteClear} from '../shared/ambient-routes.mjs';

test('flight enters and leaves continuously, including twilight',()=>{
  assert.equal(flightOpacity(0),0);assert.equal(flightOpacity(1),0);
  assert.equal(flightOpacity(.5),1);
  assert.ok(flightOpacity(.97)<.06&&flightOpacity(.97)>0);
  for(let i=0;i<1000;i++)assert.ok(Math.abs(flightOpacity(i/1000)-flightOpacity((i+1)/1000))<.012);
  assert.equal(birdDaylight(22),0);assert.equal(birdDaylight(10),1);
  assert.ok(birdDaylight(19.5)>0&&birdDaylight(19.5)<.5);
});

test('random jumps vary around the islands and their entire arc stays clear of land and boats',async()=>{
  const {public:{regions}}=await loadCatalog(process.cwd());
  let seed=48151623;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296),sectors=new Set(),positions=new Set();
  for(let n=0;n<1000;n++){
    const route=chooseFishRoute(random,regions);assert.ok(route);
    positions.add(`${route.x.toFixed(1)},${route.z.toFixed(1)}`);
    sectors.add(Math.floor((Math.atan2(route.z,route.x)+Math.PI)/(Math.PI/4)));
    // Independently sample the path plus a metre of body clearance.
    for(let i=0;i<=20;i++){
      const d=(i/10-1)*route.travel,x=route.x+Math.cos(route.angle)*d,z=route.z+Math.sin(route.angle)*d;
      assert.ok(Math.hypot(x,z)+1<76);
      assert.ok(Math.hypot(x,z-27)>18);
      for(const r of regions)assert.ok(Math.hypot(x-r.position[0],z-r.position[1])>r.radius*1.12+3);
    }
  }
  assert.equal(sectors.size,8);assert.ok(positions.size>990);
});

test('unsafe segments are rejected even if their endpoints are off an island',()=>{
  assert.equal(fishRouteClear({x:55,z:0,travel:10,angle:0},[{position:[55,0],radius:3}]),false);
  assert.equal(fishRouteClear({x:0,z:34,travel:2,angle:0},[]),false);
  assert.equal(fishRouteClear({x:75,z:0,travel:3,angle:0},[]),false);
  assert.equal(chooseFishRoute(()=>.5,[{position:[0,0],radius:200}]),null);
});
