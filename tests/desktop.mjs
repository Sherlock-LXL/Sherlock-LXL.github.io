import { _electron as electron } from 'playwright';
import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
const root=process.cwd();await mkdir('artifacts',{recursive:true});
const launch=()=>electron.launch({executablePath:path.join(root,'build/staging/win-unpacked/XiangMeta.exe'),args:['--enable-unsafe-swiftshader'],env:{...process.env,XIANGMETA_TEST:'1',PORTABLE_EXECUTABLE_DIR:path.join(root,'data')},timeout:30000});
let app=await launch();
try{
  let page=await app.firstWindow();await page.locator('#world canvas').waitFor();
  const prefs=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
  assert.equal(prefs.nodeIntegration,false);assert.equal(prefs.sandbox,true);assert.equal(prefs.contextIsolation,true);
  assert.equal(new URL(page.url()).port,'4319');
  await page.locator('#collections').click();await page.locator('[data-exhibit=recommendation]').click();await page.locator('#module-form button[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('#model-result')?.className==='success',{},{timeout:20000});
  await page.screenshot({path:'artifacts/desktop-live-model.png'});
  await page.evaluate(()=>localStorage.setItem('xiangmeta:test-persistence','kept'));await app.close();app=await launch();
  page=await app.firstWindow();await page.locator('#world canvas').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('xiangmeta:test-persistence')),'kept');
  await page.evaluate(()=>localStorage.removeItem('xiangmeta:test-persistence'));
  console.log('PASS: packaged desktop boots, sandbox/context isolation, stable origin, real model, persistence across relaunch');
}finally{await app.close();}
