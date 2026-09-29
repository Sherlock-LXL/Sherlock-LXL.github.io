import {mkdir,cp,writeFile,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {webContent} from './web-content.mjs';

const root=process.cwd(),destination=path.join(root,'.runtime/pages-source');
// Never overwrite an existing publication checkout or user edits.
try{await stat(destination);throw new Error(`${destination} already exists. Move it aside before exporting again.`);}
catch(error){if(error.code!=='ENOENT')throw error;}
const {catalog,assets}=await webContent(root);
await mkdir(destination,{recursive:true});
const copy=async relative=>{await mkdir(path.dirname(path.join(destination,relative)),{recursive:true});await cp(path.join(root,relative),path.join(destination,relative),{recursive:true,filter:file=>file!==path.join(root,'src/audio/media-mixer.ts')});};
for(const file of ['src','shared','index.html','projects','world','vite.config.ts','tsconfig.json','README.md','LICENSE','CREDITS.md','.gitignore','.github','data/profile.json','data/world.json','data/audio.json','data/image-previews.json','data/media-sizes.json','backend/catalog.mjs','scripts/web-content.mjs','scripts/export-pages.mjs','docs/web-migration.md','docs/web-portfolio-audit.md','docs/images'])await copy(file);
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const tests=pkg.scripts.test.match(/tests\/[\w.-]+\.mjs/g);
for(const file of [...tests,'tests/web-smoke.mjs','tests/web-browser.mjs'])await copy(file);
for(const module of catalog.modules){
  const {status,...manifest}=module;
  const dir=path.join(destination,'modules',module.id);await mkdir(dir,{recursive:true});
  await writeFile(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  for(const file of ['scene.ts','interactions.ts','region.json']){
    try{await copy(`modules/${module.id}/${file}`);}catch(error){if(error.code!=='ENOENT')throw error;}
  }
}
for(const {file} of assets.values())await copy(path.relative(root,file));
const scripts={dev:'vite',typecheck:pkg.scripts.typecheck,build:pkg.scripts.build,preview:pkg.scripts.preview,test:pkg.scripts.test,'test:smoke':pkg.scripts['test:smoke'],'test:ui':pkg.scripts['test:ui'],'export:pages':'node scripts/export-pages.mjs'};
const {electron,'electron-builder':builder,...devDependencies}=pkg.devDependencies;
const webPackage={name:'xiangmeta-portfolio',version:pkg.version,private:true,type:'module',description:pkg.description,author:'李湘伦 / Sherlock-LXL',license:'MIT',engines:{node:'>=22.14.0'},scripts,dependencies:pkg.dependencies,devDependencies};
await writeFile(path.join(destination,'package.json'),JSON.stringify(webPackage,null,2)+'\n');
// Seed with pinned versions, then remove historical desktop-only dependencies.
const lock=JSON.parse(await readFile(path.join(root,'package-lock.json'),'utf8'));
lock.name=webPackage.name;lock.packages['']={name:webPackage.name,version:webPackage.version,dependencies:webPackage.dependencies,devDependencies};
await writeFile(path.join(destination,'package-lock.json'),JSON.stringify(lock,null,2)+'\n');
execFileSync(process.execPath,[process.env.npm_execpath,'install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund'],{cwd:destination,stdio:'inherit'});
console.log(`Ready to review and publish: ${destination}`);
