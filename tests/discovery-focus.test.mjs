import test from 'node:test';
import assert from 'node:assert/strict';
import {discoveryScore} from '../shared/discovery-focus.mjs';
test('R focus follows the viewed object even when another kind is closer',()=>{
  const north={x:0,z:-1},east={x:1,z:0};
  const wonder=h=>discoveryScore(0,0,0,-2.3,2.8,h);
  const memory=h=>discoveryScore(0,0,1.5,-1,2.05,h);
  assert.ok(wonder(north)>memory(north));
  assert.ok(memory(east)>wonder(east));
});
test('R focus excludes distant and behind-camera objects',()=>{
  assert.equal(discoveryScore(0,0,0,-2.8,2.8,{x:0,z:-1}),-Infinity);
  assert.equal(discoveryScore(0,0,0,1,2.8,{x:0,z:-1}),-Infinity);
  assert.ok(Number.isFinite(discoveryScore(0,0,0,-1,2.8,{x:0,z:-1})));
});
