import {_electron} from 'playwright';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import path from 'node:path';
import assert from 'node:assert/strict';
const run=promisify(execFile);
const app=await _electron.launch({args:['.','--enable-unsafe-swiftshader'],env:{...process.env,XIANGMETA_TEST:'0',XIANGMETA_TEST_PORT:'4320',XIANGMETA_TEST_PROFILE:path.resolve('artifacts/native-escape-profile')}});
try{
 const page=await app.firstWindow();await page.waitForURL('http://127.0.0.1:4320/');await page.locator('#world canvas').waitFor();
 await page.evaluate(()=>{window.lockErrors=[];document.addEventListener('pointerlockerror',()=>window.lockErrors.push({at:performance.now(),focus:document.hasFocus()}));});
 await app.evaluate(({BrowserWindow,ipcMain})=>{globalThis.inputTrace=[];const record=v=>{globalThis.inputTrace.push(v);if(globalThis.inputTrace.length>40)globalThis.inputTrace.shift();};BrowserWindow.getAllWindows()[0].webContents.on('before-input-event',(_,input)=>{if(input.key==='Escape')record({kind:'input',type:input.type,time:Date.now()});});ipcMain.on('xiangmeta:modal-state',(_,value)=>record({kind:'modal',value,time:Date.now()}));});
 await page.evaluate(()=>{window.keyTrace=[];for(const type of ['keydown','keyup'])window.addEventListener(type,e=>{if(e.code==='Escape')window.keyTrace.push({type,open:document.querySelector('dialog').open,time:Date.now()});},true);});
 const handle=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.show();w.focus();return Number(w.getNativeWindowHandle().readBigUInt64LE());});
 const esc=hold=>run('powershell.exe',['-NoProfile','-File',path.resolve('tests/native-escape.ps1'),'-WindowHandle',String(handle),'-HoldMilliseconds',String(hold??120)],{windowsHide:true});
 for(const selector of ['#help','#memory-open','#collections','#sky-settings']){
  await page.evaluate(()=>document.exitPointerLock());await page.locator(selector).click();await page.waitForTimeout(6500);
  await esc(selector==='#collections'?1100:120);
  await page.waitForFunction(()=>!document.querySelector('dialog').open&&document.pointerLockElement===document.querySelector('#world canvas'),null,{timeout:6000});
  await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>!!document.pointerLockElement),true);
  console.log('native Esc PASS',selector);
 }
 await esc();await page.waitForFunction(()=>!document.pointerLockElement);
 await page.keyboard.press('p');await page.locator('#photo-toolbar').waitFor();await page.waitForTimeout(6500);await esc();await page.waitForFunction(()=>!document.body.classList.contains('photo-mode')&&!!document.pointerLockElement);
 console.log('PASS: physical Windows Esc, long-open dialogs, held key, photo exit, second Esc release; no focus emulation');
}catch(e){const p=await app.firstWindow();console.error(await app.evaluate(()=>globalThis.inputTrace));console.error(await p.evaluate(()=>({keys:window.keyTrace,errors:window.lockErrors,focus:document.hasFocus(),lock:!!document.pointerLockElement,open:document.querySelector('dialog').open,active:document.activeElement?.outerHTML.slice(0,150)})));throw e;}
finally{await app.close();}
