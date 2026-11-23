/** Update the existing publication checkout without deleting unrelated pages. */
import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {webContent} from './web-content.mjs';
const root=process.cwd(),destination=path.resolve(process.argv[2]||'.runtime/pages-source');
const status=execFileSync('git',['status','--porcelain'],{cwd:destination,encoding:'utf8'});
if(status.trim())throw new Error('Publication checkout has uncommitted edits; merge them before syncing.');
const copy=async relative=>{
  await mkdir(path.dirname(path.join(destination,relative)),{recursive:true});
  await cp(path.join(root,relative),path.join(destination,relative),{recursive:true,filter:file=>file!==path.join(root,'src/audio/media-mixer.ts')});
};
for(const file of ['src','shared','ai-lab','index.html','projects','world','teaching-studio','jiahui','vite.config.ts','tsconfig.json','package.json','package-lock.json','.gitignore','README.md','scripts/web-content.mjs','scripts/build-ai-lab.mjs','scripts/export-pages.mjs','scripts/sync-pages.mjs','scripts/pages-workflow.yml','scripts/ai-lab-originals','scripts/export-ai-lab.py','scripts/export-gift-ui.py','scripts/verify-ai-lab-originals.py','data/ai-lab-models.json','docs/ai-lab-investigation.md','docs/ai-lab-delivery.md','docs/ai-lab-images','tests/ai-lab.test.mjs','tests/ai-lab-browser.mjs','tests/ai-lab-server.mjs','tests/ai-lab-webkit.mjs','tests/fixtures/ai-lab','tests/fixtures/model-inputs'])await copy(file);
const {assets}=await webContent(root);
for(const {file} of assets.values())if(!file.includes(`${path.sep}node_modules${path.sep}`))await copy(path.relative(root,file));
// Preserve the existing Pages workflow, adding the same reviewed inference
// check used by future exports. This script never commits or pushes.
const workflowFile=path.join(destination,'.github/workflows/pages.yml');
let workflow=await readFile(workflowFile,'utf8');
if(!workflow.includes('Original AI model browser inference')){
  const marker='      - uses: actions/upload-pages-artifact@v3';
  if(!workflow.includes(marker))throw new Error('Unexpected Pages workflow; review integration manually.');
  workflow=workflow.replace(marker,`      - name: Original AI model browser inference\n        run: npm run test:ai-lab\n        env:\n          BASE_PATH: \${{ steps.pages.outputs.base_path }}/\n          AI_LAB_ONLY_TEST: '1'\n${marker}`);
  await writeFile(workflowFile,workflow);
}
console.log(`Synced public AI Lab and world sources: ${destination}`);
