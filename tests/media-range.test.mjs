import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {readFile} from 'node:fs/promises';
test('music streams support bounded/suffix ranges, seeking, HEAD and invalid ranges',async()=>{
  const s=await createServer({port:0});try{
    const manifest=JSON.parse(await readFile('public/assets/audio/manifest.json','utf8')),track=manifest.playlist[0],url=s.url+track.src;
    const head=await fetch(url,{method:'HEAD'}),size=Number(head.headers.get('content-length'));assert.ok(size>1000000);assert.equal(head.headers.get('accept-ranges'),'bytes');assert.equal((await head.arrayBuffer()).byteLength,0);
    const ranged=await fetch(url,{headers:{range:'bytes=100-399'}});assert.equal(ranged.status,206);assert.equal(ranged.headers.get('content-range'),`bytes 100-399/${size}`);assert.equal((await ranged.arrayBuffer()).byteLength,300);
    const tail=await fetch(url,{headers:{range:'bytes=-32'}});assert.equal(tail.status,206);assert.equal((await tail.arrayBuffer()).byteLength,32);
    for(const range of [`bytes=${size}-`,'bytes=100-10','bytes=0-1,5-8','bytes=-0']){const response=await fetch(url,{headers:{range}});assert.equal(response.status,416);}
    const photos=s.catalog.public.modules.find(m=>m.id==='photography').media;assert.equal(photos.length,14);
    for(const photo of photos){assert.ok(photo.src&&photo.thumbnail&&photo.width&&photo.height);assert.equal((await fetch(s.url+photo.thumbnail,{method:'HEAD'})).status,200);}
    const mv=s.catalog.public.modules.find(m=>m.id==='weiming').media.find(m=>m.kind==='video');assert.ok(mv.src&&mv.thumbnail);
    assert.equal((await fetch(s.url+mv.src,{headers:{range:'bytes=0-511'}})).status,206);assert.equal((await fetch(s.url+mv.thumbnail,{method:'HEAD'})).status,200);
    assert.equal(s.catalog.public.modules.find(m=>m.id==='personal-music').media.some(m=>m.src),false,'vocal exhibit remains reserved');
  }finally{s.server.closeAllConnections();await new Promise(r=>s.server.close(r));}
});
