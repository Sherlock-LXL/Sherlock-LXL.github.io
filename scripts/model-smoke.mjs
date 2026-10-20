import { loadCatalog } from '../backend/catalog.mjs';
import { runWorker } from '../backend/runtime.mjs';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
const fixtures={'emotion-recognition':'tests/fixtures/model-inputs/expression.jpg','cat-recognition':'tests/fixtures/model-inputs/cat.jpg'};
const configArg=process.argv.slice(2).find(a=>a.startsWith('--config='));
const catalog=await loadCatalog(process.cwd(),configArg?.slice('--config='.length));const results=[];
const requested=process.argv.slice(2).filter(a=>!a.startsWith('--config='));
for(const module of catalog.privateModules.values()){
  if(!module.runtime || requested.length&&!requested.includes(module.id))continue;
  const input={};
  for(const field of module.interface.fields){
    if(field.type==='image'){
      const file=process.env[`XIANGMETA_TEST_${module.id.toUpperCase().replaceAll('-','_')}`]??fixtures[module.id];
      if(!file)continue;
      input[field.key]=`data:image/${file.toLowerCase().endsWith('.png')?'png':file.toLowerCase().endsWith('.webp')?'webp':'jpeg'};base64,${(await readFile(file)).toString('base64')}`;
    }else input[field.key]=field.default??(field.type==='text'?'你好，请介绍一下你自己。':undefined);
  }
  if(module.interface.fields.some(f=>f.type==='image'&&!input[f.key])){console.log(`SKIP ${module.id}: set XIANGMETA_TEST_${module.id.toUpperCase().replaceAll('-','_')}`);continue;}
  const start=performance.now();
  try{const output=await runWorker(module,input);const record={id:module.id,status:'pass',seconds:Number(((performance.now()-start)/1000).toFixed(2)),output};results.push(record);console.log(JSON.stringify(record));}
  catch(error){const record={id:module.id,status:'fail',error:error.message};results.push(record);console.log(JSON.stringify(record));process.exitCode=1;}
}
await mkdir('artifacts/current',{recursive:true});await writeFile(configArg?'artifacts/current/bundle-model-smoke.json':'artifacts/current/model-smoke.json',JSON.stringify(results,null,2));
