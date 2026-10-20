import { loadCatalog } from '../backend/catalog.mjs';
import { spawnSync } from 'node:child_process';
const catalog=await loadCatalog(process.cwd());
console.log(`XiangMeta · ${catalog.public.regions.length} regions / ${catalog.public.modules.length} modules`);
for(const module of catalog.privateModules.values()) {
  console.log(`${module.id.padEnd(24)} ${module.status.state.padEnd(14)} ${module.status.detail}`);
}
for(const warning of catalog.public.warnings)console.error(`INVALID: ${warning}`);
const pythons=new Set([...catalog.privateModules.values()].filter(m=>m.runtime).map(m=>m.python));
for(const python of pythons) {
  const result=spawnSync(python,['-c',"import sys, importlib.util; print(sys.executable); print({n:bool(importlib.util.find_spec(n)) for n in ['numpy','torch','torchvision','tokenizers','PIL','ultralytics']})"],{encoding:'utf8',windowsHide:true});
  console.log(result.stdout||result.error?.message||result.stderr);
}
if(catalog.public.warnings.length)process.exitCode=1;
