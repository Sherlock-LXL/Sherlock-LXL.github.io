import test from 'node:test';
import assert from 'node:assert/strict';
import {proximityEnergy,resonantRegions,advanceAmbientPhase} from '../shared/ambient-response.mjs';
import {worldWhisper} from '../shared/world-whispers.mjs';

test('ambient response is bounded and falls smoothly with distance',()=>{
  assert.equal(proximityEnergy(2),1);
  assert.equal(proximityEnergy(14),0);
  assert.ok(proximityEnergy(7)>proximityEnergy(10));
});

test('walking near a particle field cannot jump its phase after a long session',()=>{
  let phase=7200;
  for(let i=0;i<600;i++){
    const before=phase;phase=advanceAmbientPhase(phase,1/60,proximityEnergy(8+Math.sin(i*.07)*6));
    assert.ok(phase-before>=1/60-1e-9&&phase-before<=1.45/60+1e-9);
  }
  assert.equal(advanceAmbientPhase(phase,.1,1,true),phase);
});

test('world resonance counts regions rather than repeated discoveries',()=>{
  const entries=[
    {id:'ai-a',regionId:'ai'},
    {id:'ai-b',regionId:'ai'},
    {id:'science-a',regionId:'science'},
  ];
  assert.deepEqual([...resonantRegions(entries,new Set(['ai-a','ai-b','science-a']))].sort(),['ai','science']);
});

test('world whispers vary with place, time and completed resonance',()=>{
  assert.match(worldWhisper('science-valley',10),/实验/);
  assert.match(worldWhisper('weiming-studio',22),/舞台/);
  assert.match(worldWhisper('nexus',10,true),/四座岛/);
});
