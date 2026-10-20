import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { idSchema, moduleSchema } from '../shared/schema.mjs';
import {loadCatalog} from '../backend/catalog.mjs';
const args=process.argv.slice(2),[id,region='ai-mountain']=args.filter(a=>!a.startsWith('--'));idSchema.parse(id);idSchema.parse(region);
const {public:world}=await loadCatalog(process.cwd());if(!world.regions.some(r=>r.id===region))throw new Error('Create the region in data/world.json or a module region.json first');
const folder=path.join('modules',id);await mkdir(folder); // Never overwrite an existing module.
const manifest=moduleSchema.parse({schemaVersion:1,id,title:id,subtitle:'一个新的探索起点',region,owner:region==='weiming-studio'?'team':'personal',category:'NEW PROJECT',description:'编辑此清单以展示项目。选择没有被占用的位置。',tags:['新项目'],position:[0,8],visual:'gallery',facts:[],story:[{title:'从这里开始',body:'记录问题、探索过程和成果。'}],media:[],world:{version:1,capabilities:['gallery'],fragments:[],connections:[]}});
await writeFile(path.join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await mkdir(path.join(folder,'assets'));await writeFile(path.join(folder,'assets','.gitkeep'),'');
await writeFile(path.join(folder,'README.md'),`# ${id}\n\nFollow docs/world-module-contract.md. Files in assets/ are served as /assets/modules/${id}/filename. Add only verified project memories.\n`);
if(args.includes('--scene')){
  await writeFile(path.join(folder,'scene.ts'),`import * as T from 'three';\nimport type {SceneFactory} from '../../src/world/module-contract';\nexport default {version:1,create({region}){\n  const root=new T.Group(),orb=new T.Mesh(new T.IcosahedronGeometry(.55,1),new T.MeshStandardMaterial({color:region.color,roughness:.6}));orb.position.y=1.6;root.add(orb);\n  return {root,colliders:[{x:0,z:0,radius:.6,height:2.2}],update(dt){orb.rotation.y+=dt*.2;}};\n}} satisfies SceneFactory;\n`);
  await writeFile(path.join(folder,'interactions.ts'),`import type {InteractionFactory} from '../../src/world/module-contract';\nexport default {version:1,create(){return {onVisit(){/* Optional local effect. F product UI is registered by the core. */}};}} satisfies InteractionFactory;\n`);
}
console.log(`Created ${folder}/manifest.json. Edit content and position, then restart the app. Core changes are unnecessary.`);
