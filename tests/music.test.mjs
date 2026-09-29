import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicProgramme} from '../shared/music-programme.mjs';
const track=id=>({id,title:id,src:`/assets/${id}.mp3`});
const manifest={playlist:[track('a'),track('b'),track('c')],seasonal:{summer:track('summer-v1'),winter:track('winter-v1')}};
test('season premieres persist only after successful start and never rewind on region re-entry',()=>{
  const p=new MusicProgramme(manifest),s=p.choose('summer');assert.equal(p.choose('summer'),s);assert.equal(p.heard.size,0);
  p.started(s);assert.equal(p.choose('spring'),s);assert.equal(p.choose('summer'),s);
  const winter=p.choose('winter');assert.notEqual(winter,s);p.started(winter);assert.equal(p.choose('summer'),winter);
  p.end(winter);assert.equal(p.choose('summer').kind,'playlist');
  const restored=new MusicProgramme(manifest,[...p.heard]);assert.equal(restored.choose('summer').kind,'playlist');assert.equal(restored.choose('winter').kind,'playlist');
});
test('playlist finishes its shuffle bag before repeating and never immediately repeats across bags',()=>{
  const p=new MusicProgramme(manifest,[],()=>.4),ids=[];for(let i=0;i<9;i++){const s=p.choose('spring');ids.push(s.track.id);p.started(s);p.end(s);}
  for(let i=0;i<9;i+=3)assert.equal(new Set(ids.slice(i,i+3)).size,3);
  for(let i=1;i<ids.length;i++)assert.notEqual(ids[i],ids[i-1]);
});
test('failed tracks do not burn premiere history or create an endless retry loop',()=>{
  const p=new MusicProgramme(manifest);p.fail(p.choose('summer'));assert.equal(p.heard.size,0);assert.equal(p.choose('summer').kind,'playlist');
  for(let i=0;i<3;i++)p.fail(p.choose('spring'));assert.equal(p.choose('spring'),null);
  const nextSession=new MusicProgramme(manifest,[...p.heard]);assert.equal(nextSession.choose('summer').kind,'seasonal');
});
