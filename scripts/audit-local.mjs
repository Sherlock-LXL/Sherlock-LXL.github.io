import {loadCatalog} from '../backend/catalog.mjs';
import {readFile,realpath,stat,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root=await realpath(process.cwd()),{version}=JSON.parse(await readFile('package.json','utf8'));
const report={version,models:[],assets:[],manuscripts:[],maintenanceTools:[],externalDependencies:[]};
async function inside(file,base=root){const p=await realpath(file);assert.ok(p.startsWith(base+path.sep),'External file dependency: '+p);assert.ok((await stat(p)).isFile(),p);return p;}
for(const [kind,config] of [['development',path.join(root,'data/local.json')],['portable',path.join(root,`build/XiangMeta-${version}/local.json`)]]){
 const catalog=await loadCatalog(root,config);assert.deepEqual(catalog.public.warnings,[]);
 const runtimeRoot=kind==='portable'?await realpath(path.dirname(config)):root;
 for(const m of catalog.privateModules.values())if(m.runtime){assert.equal(m.status.state,'configured',kind+' '+m.id);await inside(m.python,runtimeRoot);await inside(path.join(m.folder,m.runtime.entry));for(const required of m.runtime.requires)await inside(path.join(m.source,required),runtimeRoot);report.models.push({kind,id:m.id,python:path.relative(root,m.python),source:path.relative(root,m.source),requiredFiles:m.runtime.requires.length});}
 const collect=async value=>{if(typeof value==='string'&&value.startsWith('/assets/')){
   const match=value.match(/^\/assets\/modules\/([^/]+)\/(.+)$/),file=match?path.join(root,'modules',match[1],'assets',match[2]):path.join(root,'public',value);
   const resolved=await inside(file);if(!report.assets.some(a=>a.url===value))report.assets.push({url:value,file:path.relative(root,resolved),bytes:(await stat(resolved)).size});
 }else if(Array.isArray(value))for(const v of value)await collect(v);else if(value&&typeof value==='object')for(const v of Object.values(value))await collect(v);};
 await collect(catalog.public.modules);await collect(JSON.parse(await readFile('public/assets/audio/manifest.json','utf8')));
}
for(const file of ['wall-attached-bubble-growth.docx','salt-single-bubble-sonoluminescence.docx']){await inside(path.join(root,'asset-sources/research',file));report.manuscripts.push(file);}
for(const row of JSON.parse(await readFile('runtime/model-inventory.json','utf8'))){const file=await inside(path.join(root,row.file)),bytes=await readFile(file);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,row.file);}
await inside(path.join(root,'runtime/tools/ffmpeg/ffmpeg.exe'));
for(const file of ['runtime/tools/ffmpeg/ffmpeg.exe','runtime/python/Lib/site-packages/lxml/__init__.py']){await inside(path.join(root,file));report.maintenanceTools.push(file);}
await mkdir('docs/maintenance',{recursive:true});await writeFile('docs/maintenance/local-dependencies.json',JSON.stringify(report,null,2)+'\n');
console.log(`PASS: ${report.models.length} model configurations (development + portable), ${report.assets.length} local media URLs, 2 local manuscripts, model inventory hashes, local FFmpeg; no external runtime file dependency.`);
