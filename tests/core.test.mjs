import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,mkdir,writeFile,cp,rm,readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { loadCatalog } from '../backend/catalog.mjs';
import { moduleSchema,validateInput } from '../shared/schema.mjs';
import { walkable } from '../shared/navigation.mjs';
import { sampleSimulation } from '../shared/simulation.mjs';
import { createServer } from '../backend/server.mjs';
import { runWorker } from '../backend/runtime.mjs';
const root=process.cwd();
const base=JSON.parse(await readFile('modules/recommendation/manifest.json','utf8'));
test('all shipped manifests validate and personal/team ownership remains separate',async()=>{
  const c=await loadCatalog(root);assert.equal(c.public.modules.length,10);assert.deepEqual(c.public.warnings,[]);
  assert.equal(c.public.modules.find(m=>m.id==='personal-music').owner,'personal');assert.equal(c.public.modules.find(m=>m.id==='weiming').owner,'team');
  assert.ok(c.public.modules.every(m=>!('source' in m)&&!('python' in m)&&!('runtime' in m)));
});
test('input rejects unknown fields, invalid ranges, disguised uploads and wrong categories',()=>{
  const input=Object.fromEntries(base.interface.fields.map(f=>[f.key,f.default]));assert.deepEqual(validateInput(base,input),input);
  assert.throws(()=>validateInput(base,{...input,'feature-0':-1}));assert.throws(()=>validateInput(base,{...input,category:'unknown'}));assert.throws(()=>validateInput(base,{...input,path:'D:/private'}));
  const m={interface:{fields:[{key:'image',type:'image'}]}};
  assert.throws(()=>validateInput(m,{image:'data:text/html;base64,PHNjcmlwdD4='}));assert.throws(()=>validateInput(m,{image:'file:///photo.jpg'}));
});
test('new modules are discovered without changing core; invalid modules are isolated',async()=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'xiangmeta-catalog-'));
  try{
    await cp(path.join(root,'data'),path.join(temp,'data'),{recursive:true,filter:src=>!src.endsWith('local.json')});await mkdir(path.join(temp,'modules','new-project'),{recursive:true});
    await writeFile(path.join(temp,'modules','new-project','manifest.json'),JSON.stringify({...base,id:'new-project'}));
    await mkdir(path.join(temp,'modules','broken'));await writeFile(path.join(temp,'modules','broken','manifest.json'),'{}');
    const c=await loadCatalog(temp);assert.equal(c.public.modules[0].id,'new-project');assert.equal(c.public.warnings.length,1);
    await mkdir(path.join(temp,'modules','duplicate'));await writeFile(path.join(temp,'modules','duplicate','manifest.json'),JSON.stringify({...base,id:'new-project'}));
    assert.equal((await loadCatalog(temp)).public.warnings.length,2);
  }finally{await rm(temp,{recursive:true,force:true,maxRetries:8,retryDelay:50});}
});
test('manifest rejects unsafe worker and media paths',()=>{
  assert.throws(()=>moduleSchema.parse({...base,runtime:{...base.runtime,entry:'../../x.py'}}));
  assert.throws(()=>moduleSchema.parse({...base,media:[{kind:'image',title:'bad',src:'/assets/../data/private.png'}]}));
});
test('navigation connects islands via bridges and blocks water and solid exhibits',()=>{
  const regions=[{position:[24,24],radius:17}];
  assert.equal(walkable(0,0,regions),true);assert.equal(walkable(12,12,regions),true);assert.equal(walkable(24,24,regions),true);
  assert.equal(walkable(15,-15,regions),false);assert.equal(walkable(24,24,regions,[{x:24,z:24,radius:3}]),false);
});
test('normalized illustrative curves remain finite across control limits',()=>{
  for(const kind of ['bubble','sonoluminescence'])for(const p of [0,.5,1])assert.ok(sampleSimulation(kind,p).every(v=>Number.isFinite(v)&&v>=0&&v<=1));
});
test('HTTP gateway validates origins, restricts API and releases cancelled work',async()=>{
  let started;const begun=new Promise(r=>started=r);
  const runner=(_m,_i,{signal})=>new Promise((_resolve,reject)=>{started();signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true});});
  const service=await createServer({root,port:0,runner});
  try{
    assert.equal((await fetch(service.url+'/api/health')).status,200);
    assert.equal((await fetch(service.url+'/api/catalog',{headers:{Origin:'https://evil.example'}})).status,403);
    assert.equal((await fetch(service.url+'/data/local.json')).status,404);
    assert.equal((await fetch(service.url+'/api/modules/missing/invoke',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,404);
    const mod=service.catalog.privateModules.get('recommendation');mod.status={state:'configured',detail:'test'};
    const input=Object.fromEntries(base.interface.fields.map(f=>[f.key,f.default]));
    const options={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)};
    assert.equal((await fetch(service.url+'/api/modules/recommendation/invoke',{...options,body:'{}'})).status,400);
    const controller=new AbortController();const request=fetch(service.url+'/api/modules/recommendation/invoke',{...options,signal:controller.signal}).catch(e=>e);
    await begun;
    assert.equal((await fetch(service.url+'/api/modules/recommendation/invoke',options)).status,429);
    controller.abort();await request;
    for(let i=0;i<20;i++){const status=await (await fetch(service.url+'/api/health')).json();if(!status.busy)break;await new Promise(r=>setTimeout(r,20));}
    assert.equal((await (await fetch(service.url+'/api/health')).json()).busy,false);
  }finally{service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
});
test('worker exits on cancellation, times out and preserves UTF-8',async()=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'xiangmeta-worker-'));
  try {
    await writeFile(path.join(temp,'worker.py'),`import time,json
time.sleep(.1)
print('XIANGMETA_RESULT:'+json.dumps({'text':'世界你好'},ensure_ascii=False),flush=True)`);
    const module={python:path.join(root,'runtime/python/python.exe'),folder:temp,source:temp,runtime:{entry:'worker.py'}};
    assert.equal((await runWorker(module,{})).text,'世界你好');
    await assert.rejects(runWorker(module,{},{timeout:1}),/超时/);
    const controller=new AbortController();controller.abort();await assert.rejects(runWorker(module,{},{signal:controller.signal}),/取消/);
    const running=new AbortController();const pending=runWorker(module,{},{signal:running.signal});setTimeout(()=>running.abort(),20);await assert.rejects(pending,/取消/);
  }finally{await rm(temp,{recursive:true,force:true,maxRetries:8,retryDelay:50});}
});
