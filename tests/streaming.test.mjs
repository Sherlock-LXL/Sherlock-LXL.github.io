import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,unlink} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {runWorker} from '../backend/runtime.mjs';
import {createServer} from '../backend/server.mjs';
import {loadCatalog} from '../backend/catalog.mjs';
const python=path.resolve('runtime/python/python.exe');
test('isolated local Python streams UTF-8 before completion without reopening an extracted worker',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'xiangmeta-汉字 worker-'));
  try{const file=path.join(dir,'worker.py');await writeFile(file,"import json,time\nfor x in ['春','天','🌸']:\n print('XIANGMETA_TOKEN:'+json.dumps({'text':x},ensure_ascii=False),flush=True)\n time.sleep(.15)\nprint('XIANGMETA_RESULT:'+json.dumps({'text':'春天🌸'},ensure_ascii=False),flush=True)\n");
    const tokens=[];let finished=false;const result=await runWorker({python,folder:dir,source:dir,runtime:{entry:'worker.py'}},{},{onToken:t=>{assert.equal(finished,false);tokens.push(t.text);if(tokens.length===1)void unlink(file);}});finished=true;
    assert.deepEqual(tokens,['春','天','🌸']);assert.equal(result.text,tokens.join(''));
  }finally{await rm(dir,{recursive:true,force:true,maxRetries:8,retryDelay:50});}
});
test('streaming HTTP sends deltas before result; cancellation releases the active slot',async()=>{
  let aborted=false;
  const s=await createServer({port:0,runner:async(_m,_i,{signal,onToken})=>{
    onToken?.({text:'山'});await new Promise((resolve,reject)=>{const timer=setTimeout(resolve,400);signal.addEventListener('abort',()=>{aborted=true;clearTimeout(timer);reject(Error('cancelled'));},{once:true});});onToken?.({text:'海'});return {text:'山海',mode:'live'};
  }});
  try{const m=s.catalog.public.modules.find(m=>m.id==='recommendation'),body=JSON.stringify(Object.fromEntries(m.interface.fields.map(f=>[f.key,f.default]))),options={method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body};
    const response=await fetch(s.url+'/api/modules/recommendation/invoke',options),reader=response.body.getReader(),initial=new TextDecoder().decode((await reader.read()).value);assert.match(initial,/status/);assert.doesNotMatch(initial,/done/);
    assert.equal((await fetch(s.url+'/api/modules/recommendation/invoke',options)).status,429);
    let text=initial;while(true){const {done,value}=await reader.read();if(done)break;text+=new TextDecoder().decode(value);}const events=text.trim().split('\n').map(JSON.parse);assert.deepEqual(events.filter(e=>e.type==='token').map(e=>e.text),['山','海']);assert.equal(events.at(-1).result.text,'山海');
    const controller=new AbortController(),cancel=await fetch(s.url+'/api/modules/recommendation/invoke',{...options,signal:controller.signal});await cancel.body.getReader().read();controller.abort();
    for(let i=0;i<50&&!aborted;i++)await new Promise(r=>setTimeout(r,20));assert.equal(aborted,true);assert.equal((await(await fetch(s.url+'/api/health')).json()).busy,false);
  }finally{s.server.closeAllConnections();await new Promise(r=>s.server.close(r));}
});
test('all five models and the Python executable resolve inside XiangMeta',async()=>{
  const c=await loadCatalog(process.cwd());for(const m of c.privateModules.values())if(m.runtime){assert.equal(m.status.state,'configured');assert.ok(m.source.startsWith(path.resolve('runtime/models')+path.sep));assert.equal(m.python,python);}
});
