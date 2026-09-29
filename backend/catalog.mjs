import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { moduleSchema, regionSchema } from '../shared/schema.mjs';
export async function loadCatalog(root, configPath) {
  const world = JSON.parse(await readFile(path.join(root,'data/world.json'),'utf8'));
  if(world.schemaVersion!==1)throw new Error('Unsupported world schema version');
  const regions = world.regions.map(r=>regionSchema.parse(r));
  if (new Set(regions.map(r=>r.id)).size !== regions.length) throw new Error('Duplicate region id');
  const warnings=[],directories=(await readdir(path.join(root,'modules'),{withFileTypes:true})).filter(d=>d.isDirectory()&&!d.name.startsWith('_')).sort((a,b)=>a.name.localeCompare(b.name));
  for(const dir of directories){
    try{const region=regionSchema.parse(JSON.parse(await readFile(path.join(root,'modules',dir.name,'region.json'),'utf8')));if(regions.some(r=>r.id===region.id))throw new Error(`Duplicate region ${region.id}`);regions.push(region);}
    catch(e){if(e.code!=='ENOENT')warnings.push(`${dir.name}/region.json: ${e.message}`);}
  }
  let config={python:'python',sources:{}};
  try { config={...config,...JSON.parse(await readFile(configPath ?? path.join(root,'data/local.json'),'utf8'))}; } catch(e) { if(e.code!=='ENOENT') throw e; }
  const localRoot=config.root?path.resolve(path.dirname(configPath??path.join(root,'data/local.json')),config.root):root;
  const localPath=value=>value&&(path.isAbsolute(value)?value:path.resolve(localRoot,value));
  const interpreter=value=>value&&(/[\\/]/.test(value)?localPath(value):value);
  const modules=[], privateModules=new Map();
  for(const dir of directories) {
    if(!dir.isDirectory() || dir.name.startsWith('_')) continue;
    try {
      const folder=path.join(root,'modules',dir.name);
      const m=moduleSchema.parse(JSON.parse(await readFile(path.join(folder,'manifest.json'),'utf8')));
      if(privateModules.has(m.id)) throw new Error(`Duplicate module id ${m.id}`);
      if(!regions.some(r=>r.id===m.region)) throw new Error(`Unknown region ${m.region}`);
      let status={state:'exhibition',detail:'展览已开放'};
      const source=m.runtime ? localPath(config.sources[m.runtime.sourceKey]) : undefined;
      if(m.runtime) {
        status={state:'unavailable',detail:'待配置本地模型环境；展览可正常探索'};
        if(source) {
          const missing=[];
          try{await access(path.join(folder,m.runtime.entry));}catch{missing.push('模块适配器 '+m.runtime.entry);}
          for(const file of m.runtime.requires) { try { await access(path.join(source,file)); } catch { missing.push(file); } }
          status=missing.length?{state:'unavailable',detail:`缺少模型文件：${missing.join('、')}`}:{state:'configured',detail:'模型文件已配置 · 运行环境在调用时检查'};
        }
      }
      // Private filesystem paths and worker settings never go to the renderer.
      privateModules.set(m.id,{...m,folder,source,python:interpreter(config.pythonByModule?.[m.id] ?? config.python),status});
      const {runtime,...publicModule}=m;
      modules.push({...publicModule,status});
    } catch(e) { warnings.push(`${dir.name}: ${e.message}`); }
  }
  const agents=(world.agents??[]).filter(a=>typeof a.id==='string'&&typeof a.title==='string'&&privateModules.has(a.chatModule));
  for(const m of modules)if(m.world?.capabilities.includes('conversation')&&privateModules.get(m.id).runtime&&!agents.some(a=>a.chatModule===m.id))agents.push({id:`guide-${m.id}`,title:m.title,chatModule:m.id});
  for(const m of modules)if(m.world)m.world.connections=m.world.connections.filter(link=>{
    if(privateModules.has(link.target))return true;warnings.push(`${m.id}: unknown world connection ${link.target}`);return false;
  });
  const tools=modules.filter(m=>privateModules.get(m.id).runtime).map(m=>({id:m.id,title:m.title,endpoint:`/api/modules/${m.id}/invoke`,capabilities:m.world?.capabilities??[],fields:m.interface.fields}));
  return {public:{regions,modules,agents,tools,warnings},privateModules};
}
