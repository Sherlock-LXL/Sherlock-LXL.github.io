import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {webContent} from '../scripts/web-content.mjs';
import {moduleSchema} from '../shared/schema.mjs';

test('static export preserves all world placements and publishes only supported resources',async()=>{
  const {catalog,portfolio,assets}=await webContent(process.cwd());
  assert.equal(catalog.regions.length,4);assert.equal(catalog.modules.length,10);
  assert.equal(portfolio.projects.length,catalog.modules.length);
  for(const m of catalog.modules){
    const original=JSON.parse(await readFile(`modules/${m.id}/manifest.json`,'utf8'));
    assert.deepEqual(m.position,original.position);assert.equal(m.rotation,original.rotation);
    assert.equal(m.region,original.region);
    assert.equal(m.runtime,undefined);assert.equal(m.interface,undefined);assert.equal(m.world?.audio,undefined);
    assert.equal(portfolio.projects.find(p=>p.id===m.id).name,m.portfolio.name);
  }
  const {audio,...visualCatalog}=catalog;
  const payload=JSON.stringify({catalog:visualCatalog,portfolio});
  assert.doesNotMatch(payload,/\.(mp3|wav|mp4|pth|pt)(["?])|\/api\/|local\.json/);
  const music=[...audio.playlist,...Object.values(audio.seasonal)];
  assert.equal(audio.playlist.length,7);assert.equal(Object.keys(audio.seasonal).length,4);
  assert.equal(assets.size>music.length,true);
  for(const track of music){assert.match(track.src,/^\/assets\/music\/[\w-]+\.mp3$/);assert.ok(assets.has(track.src));}
  assert.equal(catalog.imagePreviews.length,20);
  for(const entry of catalog.imagePreviews){assert.ok(assets.has(entry.src));assert.ok(assets.has(entry.preview));assert.ok(assets.get(entry.preview).size<65000);}
  assert.ok(assets.size>20);assert.ok([...assets.values()].every(a=>a.size>0));
  assert.equal(catalog.modules.filter(m=>m.simulation).length,2);
});
test('all supplied music destinations and verified GitHub repositories survive export',async()=>{
  const {catalog}=await webContent(process.cwd());
  const music=catalog.modules.find(m=>m.id==='personal-music');
  assert.equal(music.portfolio.demo,'https://music.163.com/#/artist?id=46962347');
  assert.deepEqual(music.albums.slice(0,4).map(a=>a.link),[
    '172971428','181322022','249590756','286933696'
  ].map(id=>`https://music.163.com/#/album?id=${id}`));
  assert.equal(music.albums[4].link,'https://www.bilibili.com/video/BV1kCTX6uEf7/');
  assert.ok(music.albums.every(a=>a.tracks.every(t=>!t.src)));
  assert.equal(catalog.modules.filter(m=>m.portfolio.github).length,5);
  const original=JSON.parse(await readFile('modules/xianglm/manifest.json','utf8'));
  assert.equal(moduleSchema.safeParse({...original,portfolio:{...original.portfolio,github:'javascript:alert(1)'}}).success,false);
  assert.equal(moduleSchema.safeParse({...original,portfolio:{...original.portfolio,screenshots:['/assets/../private.png']}}).success,false);
});
test('production contains direct-loadable pages and only the allowed compressed background audio',async()=>{
  const walk=async dir=>(await readdir(dir,{withFileTypes:true})).reduce(async(p,item)=>{
    const files=await p;return files.concat(item.isDirectory()?await walk(`${dir}/${item.name}`):`${dir}/${item.name}`);
  },Promise.resolve([]));
  const files=await walk('dist');
  assert.ok(files.includes('dist/world/index.html'));assert.ok(files.includes('dist/projects/index.html'));
  assert.ok(files.includes('dist/.nojekyll'));
  assert.ok(!files.some(f=>/\.(wav|mp4|pth|py|pt|exe)$/.test(f)));
  const audio=files.filter(f=>f.endsWith('.mp3'));
  const contentData=JSON.parse(await readFile('dist/content/world.json','utf8'));
  assert.deepEqual(audio.sort(),[...contentData.audio.playlist,...Object.values(contentData.audio.seasonal)].map(t=>'dist'+t.src).sort());
  const html=await readFile('dist/index.html','utf8');
  assert.doesNotMatch(html,/three-|main-[a-zA-Z0-9_-]+\.js/);
  const content=await readFile('dist/content/world.json','utf8');
  assert.doesNotMatch(content,/localhost|127\.0\.0\.1|\/api\/|sourceKey/);
});
