import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {risingBubble,confinedBubble} from '../shared/science-cycles.mjs';
import {moduleSchema} from '../shared/schema.mjs';
test('bubble cycles nucleate, rise to surface, burst; confined bubble stays small after fast collapse',()=>{
  assert.ok(risingBubble(1).radius>risingBubble(0).radius);
  for(let t=1.8;t<7.4;t+=.1)assert.ok(risingBubble(t+.01).y>risingBubble(t).y);
  assert.equal(risingBubble(8).visible,false);assert.ok(risingBubble(8.5).ripple>risingBubble(8).ripple);
  for(let t=0;t<4.8;t+=.1)assert.ok(confinedBubble(t+.01).radius>confinedBubble(t).radius);
  assert.ok(confinedBubble(5.16).radius<confinedBubble(4.9).radius/10);
  assert.ok(confinedBubble(5.23).flash>.99);assert.equal(confinedBubble(5.4).flash,0);
  for(let t=0;t<18;t+=.013){const b=confinedBubble(t);assert.ok(Number.isFinite(b.radius)&&b.radius>0&&b.flash>=0&&b.flash<=1);}
});
test('five ordered albums retain all twelve original vocal recordings and lyric credits',async()=>{
  const m=moduleSchema.parse(JSON.parse(await readFile('modules/personal-music/manifest.json','utf8')));
  assert.deepEqual(m.albums.map(a=>a.order),[1,2,3,4,5]);assert.equal(m.albums[0].title,'Secret');
  assert.equal(m.albums.flatMap(a=>a.tracks).length,12);assert.match(m.albums[4].credit,/团队/);
  assert.ok(m.albums.every(a=>a.tracks.every(t=>t.lyrics.length>20&&!/backing-|summer|winter|autumn/.test(t.src))));
  for(const p of JSON.parse(await readFile('asset-sources/metadata/album-assets.json','utf8'))){const bytes=await readFile('modules/personal-music/assets/'+p.delivered);assert.equal(createHash('sha256').update(bytes).digest('hex'),p.sha256,p.delivered);}
  const invalid=structuredClone(m);invalid.albums[0].tracks[0].src='/assets/../secret';assert.equal(moduleSchema.safeParse(invalid).success,false);
});
