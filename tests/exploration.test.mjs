import test from 'node:test';
import assert from 'node:assert/strict';
import { EYE_HEIGHT,INTERACTION_RADIUS,nearestStation,lookAngles } from '../shared/interaction.mjs';
import { walkable } from '../shared/navigation.mjs';
import { regionSchema } from '../shared/schema.mjs';
test('nearby interaction chooses the closest terminal, independent of manifest order',()=>{
  const stations=[{id:'far',x:0,z:2.5},{id:'near',x:0,z:1.5}];
  assert.equal(nearestStation(0,0,stations).id,'near');assert.equal(nearestStation(0,0,[...stations].reverse()).id,'near');
  assert.equal(nearestStation(20,0,stations),null);assert.equal(nearestStation(0,0,[{id:'edge',x:0,z:INTERACTION_RADIUS}]),null);
});
test('first-person height and teleport heading are independent of map camera',()=>{
  assert.equal(EYE_HEIGHT,1.7);assert.equal(lookAngles(0,6,0,0).yaw,0);
  assert.equal(lookAngles(0,0,4,0).yaw,-Math.PI/2);assert.equal(lookAngles(0,0,-4,0).yaw,Math.PI/2);
});
test('gallery walls and consoles block movement while a two-metre approach stays usable',()=>{
  const regions=[{position:[0,0],radius:17}];
  const obstacles=[{x:0,z:4.35,radius:.65},{x:0,z:-2,halfX:3.5,halfZ:.25}];
  assert.equal(walkable(0,6.55,regions,obstacles),true);assert.equal(walkable(0,4.6,regions,obstacles),false);
  assert.equal(walkable(3,-2,regions,obstacles),false);assert.equal(walkable(4.5,-2,regions,obstacles),true);
});

test('optional discoveries preserve existing regions and reject unusable definitions',()=>{
  const base={id:'new-garden',title:'新花园',english:'GARDEN',description:'',position:[50,50],radius:17,color:'#bbddcc'};
  assert.equal(regionSchema.parse(base).discovery,undefined);
  const discovery={kind:'butterflies',title:'纸蝶',action:'唤起',description:'',position:[5,11]};
  assert.equal(regionSchema.parse({...base,discovery}).discovery.kind,'butterflies');
  assert.equal(regionSchema.safeParse({...base,discovery:{...discovery,kind:'missing-builder'}}).success,false);
  assert.equal(regionSchema.safeParse({...base,discovery:{...discovery,position:[50,11]}}).success,false);
});
