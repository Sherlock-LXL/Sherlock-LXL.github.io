import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {loadCatalog} from '../backend/catalog.mjs';
import {createServer} from '../backend/server.mjs';
import {worldModuleSchema} from '../shared/schema.mjs';
import {memoryEntries,starPosition,growthEntries} from '../shared/memories.mjs';
import {findTrail} from '../shared/trail.mjs';
import {walkable} from '../shared/navigation.mjs';
test('world contract rejects duplicate memory keys, unknown capabilities and unsafe audio',()=>{
  const fragment={id:'start',title:'start',body:'story',position:[1,1]};
  assert.throws(()=>worldModuleSchema.parse({version:1,fragments:[fragment,fragment]}));assert.throws(()=>worldModuleSchema.parse({version:1,audio:'/assets/../data/local.json'}));assert.throws(()=>worldModuleSchema.parse({version:1,capabilities:['unknown']}));
});
test('memories have stable namespaced IDs and coordinates; growth is independent of file order',async()=>{
  const {public:c}=await loadCatalog(process.cwd());const entries=memoryEntries(c);assert.equal(entries.length,9);assert.equal(new Set(entries.map(e=>e.id)).size,9);assert.equal(growthEntries(entries).length,5);
  const backwards=memoryEntries({...c,modules:[...c.modules].reverse()});assert.deepEqual(growthEntries(entries).map(e=>e.id),growthEntries(backwards).map(e=>e.id));for(const e of entries)assert.deepEqual(starPosition(e.id),starPosition(backwards.find(f=>f.id===e.id).id));
});
test('new module region, memories, links and assets register without core changes',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'xiangmeta-contract-'));let service;
  try{
    await mkdir(path.join(root,'data'));await mkdir(path.join(root,'modules','new-project','assets'),{recursive:true});
    await writeFile(path.join(root,'data','world.json'),JSON.stringify({schemaVersion:1,regions:[]}));
    await writeFile(path.join(root,'modules','new-project','region.json'),JSON.stringify({id:'new-island',title:'新岛',english:'NEW ISLAND',description:'未来',color:'#abcabc',position:[70,70],radius:17}));
    const base=JSON.parse(await readFile('modules/photography/manifest.json','utf8'));
    await writeFile(path.join(root,'modules','new-project','manifest.json'),JSON.stringify({...base,id:'new-project',region:'new-island',world:{version:1,capabilities:['gallery'],fragments:[{id:'start',title:'起点',body:'独立接入',position:[1,7]}],connections:[{target:'missing',title:'缺失项目',body:'应隔离'}]}}));
    await writeFile(path.join(root,'modules','new-project','assets','poster.svg'),'<svg xmlns="http://www.w3.org/2000/svg"/>');
    await writeFile(path.join(root,'modules','new-project','assets','private.js'),'secret');
    service=await createServer({root,port:0});const c=service.catalog.public;assert.equal(c.regions[0].id,'new-island');assert.equal(memoryEntries(c)[0].id,'new-project--start');assert.equal(c.modules[0].world.connections.length,0);assert.equal(c.warnings.length,1);
    assert.equal((await fetch(service.url+'/assets/modules/new-project/poster.svg')).status,200);assert.equal((await fetch(service.url+'/assets/modules/new-project/private.js')).status,404);assert.equal((await fetch(service.url+'/assets/modules/new-project/%2e%2e/manifest.json')).status,404);
  }finally{if(service){service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}await rm(root,{recursive:true,force:true,maxRetries:8,retryDelay:50});}
});
test('growth path searches around a wall and does not cut its corners',()=>{
  const regions=[{position:[0,0],radius:17}],obstacles=[{x:0,z:0,radius:0,halfX:1,halfZ:4,height:5}];
  const path=findTrail({x:-4,z:0},{x:4,z:0},regions,obstacles);assert.ok(path.length>15);
  for(let i=1;i<path.length;i++)for(let t=0;t<=1;t+=.1){const a=path[i-1],b=path[i];assert.ok(walkable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,regions,obstacles));}
});
