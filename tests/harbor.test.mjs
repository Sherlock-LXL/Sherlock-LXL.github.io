import test from 'node:test';
import assert from 'node:assert/strict';
import {harbor,harborHeight,harborRoutes} from '../shared/harbor.mjs';
import {createWalker,advanceWalker} from '../shared/locomotion.mjs';
import {onGround} from '../shared/navigation.mjs';
import {readFile} from 'node:fs/promises';
const regions=JSON.parse(await readFile('data/world.json','utf8')).regions;
test('harbor is connected below zero, walkable uphill/downhill and jump lands on the pier',()=>{
 const p=createWalker(0,8,regions);
 for(let i=0;i<360;i++)advanceWalker(p,{x:0,z:3},1/60,regions,[]);
 assert.ok(Math.abs(p.z-26)<.02);assert.equal(p.y,harbor.level);
 advanceWalker(p,{x:0,z:0,jump:true},1/60,regions,[]);assert.ok(p.y>harbor.level);
 for(let i=0;i<100;i++)advanceWalker(p,{x:0,z:0},1/60,regions,[]);assert.equal(p.y,harbor.level);assert.equal(p.grounded,true);
 for(let i=0;i<360;i++)advanceWalker(p,{x:0,z:-3},1/60,regions,[]);assert.ok(Math.abs(p.z-8)<.02);assert.equal(p.y,0);
 assert.equal(onGround(0,30,regions),false);assert.equal(onGround(4,25,regions),false);
 assert.ok(Math.abs(harborHeight(0,9.2))<1e-10);assert.equal(harborHeight(0,22),harbor.level);
 assert.ok(harborRoutes.every(r=>r.status==='locked'));assert.equal(new Set(harborRoutes.map(r=>r.id)).size,3);
});
test('team timeline uses supplied dates and keeps the next release prospective',async()=>{
 const m=JSON.parse(await readFile('modules/weiming/manifest.json','utf8'));
 assert.match(m.story[0].title,/2026.06.16/);assert.match(m.story[1].title,/2026.07.06/);
 assert.match(m.story[1].body,/燕云十六声/);assert.match(m.story[2].body,/30 所 985/);assert.match(m.story[2].title,/中秋预告/);assert.match(m.story[2].body,/计划于中秋发布/);assert.match(m.story[2].body,/曲名尚未确定/);
});
