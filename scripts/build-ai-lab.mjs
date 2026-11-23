import {spawnSync} from 'node:child_process';
const result=spawnSync(process.execPath,['node_modules/vite/bin/vite.js','build'],{
  stdio:'inherit',env:{...process.env,AI_LAB_ONLY:'1'},
});
process.exit(result.status??1);
