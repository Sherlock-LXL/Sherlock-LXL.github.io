import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import path from 'node:path';
import assert from 'node:assert/strict';
const run=promisify(execFile),{version}=JSON.parse(await readFile('package.json','utf8'));
// Explicit fallback for a host with no foreground desktop. Never report it as physical input.
const contentOnly=process.env.XIANGMETA_CONTENT_ONLY==='1';
const executable=path.resolve(`build/XiangMeta-${version}/XiangMeta-${version}-x64.exe`);
const env={...process.env,XIANGMETA_TEST:'0',XIANGMETA_TEST_PORT:'4321',XIANGMETA_TEST_PROFILE:path.resolve('artifacts/tmp/portable-regression-profile')};
const child=spawn(executable,['--remote-debugging-port=9224','--enable-unsafe-swiftshader'],{env,windowsHide:true});
const origin='http://127.0.0.1:4321';let browser,page;
const hash=data=>createHash('sha256').update(data).digest('hex');
try{
 const deadline=Date.now()+60000;while(Date.now()<deadline){try{if((await fetch(origin+'/api/health')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 browser=await chromium.connectOverCDP('http://127.0.0.1:9224');page=browser.contexts()[0].pages()[0];await page.locator('#world canvas').waitFor();
 const c=await fetch(origin+'/api/catalog').then(r=>r.json());
 const images=c.modules.flatMap(m=>[...(m.media??[]).filter(p=>p.kind==='image').map(p=>p.src),...(m.albums??[]).map(a=>a.cover)]).filter(Boolean);
 assert.equal(images.length,19);
 assert.equal(c.regions.reduce((n,r)=>n+(r.discovery?1:0)+(r.discoveries?.length??0),0),16);
 const seasonManifest=await fetch(origin+'/assets/audio/manifest.json').then(r=>r.json());assert.equal(Object.keys(seasonManifest.seasonal).length,4);assert.equal(seasonManifest.seasonal['ai-mountain'].title,'春');
 const audio=c.modules.find(m=>m.id==='personal-music').albums[0].tracks[0].src;
 async function checkAssets(stage){
  for(const url of [...images,audio,"/assets/modules/personal-music/spring.mp3"]){
   const response=await fetch(origin+url+'?test='+stage);assert.equal(response.status,200,stage+' '+url);
   const bytes=Buffer.from(await response.arrayBuffer()),local=await readFile(path.resolve(url.replace('/assets/modules/','modules/').replace(/(modules\/[^/]+)\//,'$1/assets/')));
   assert.equal(hash(bytes),hash(local),stage+' asset bytes must remain intact');
  }
  await page.evaluate(async urls=>{for(const url of urls){const image=new Image();image.src=url;await image.decode();if(!image.naturalWidth)throw new Error('No decoded image: '+url);}},images);
  console.log(stage+': 19 images decode and all sampled media hashes match');
 }
 await checkAssets('initial');
 // Launch the exact same EXE again while its first world is still running.
 const duplicate=spawn(executable,[],{env,windowsHide:true});
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>{duplicate.kill();reject(new Error('Duplicate launcher did not exit'));},60000);duplicate.once('exit',code=>{clearTimeout(timer);code===0?resolve():reject(new Error('Duplicate exit '+code));});duplicate.once('error',reject);});
 await checkAssets('after-second-launch');
 await page.reload();await page.locator('#world canvas').waitFor();await checkAssets('after-reload');
 const client=await browser.newBrowserCDPSession(),info=await client.send('SystemInfo.getProcessInfo');const pid=info.processInfo.find(p=>p.type==='browser').id;
 const handle=Number((await run('powershell.exe',['-NoProfile','-Command',`(Get-Process -Id ${pid}).MainWindowHandle.ToInt64()`],{windowsHide:true})).stdout.trim());assert.ok(handle>0);
 const esc=async hold=>{await page.bringToFront();return run('powershell.exe',['-NoProfile','-File',path.resolve('tests/native-escape.ps1'),'-WindowHandle',String(handle),'-HoldMilliseconds',String(hold??120)],{windowsHide:true});};
 for(const selector of contentOnly?[]:['#help','#memory-open','#collections','#sky-settings']){
  console.log('Checking physical Esc:',selector);
  await page.evaluate(()=>document.exitPointerLock());await page.locator(selector).click();await page.waitForTimeout(6500);await esc(selector==='#collections'?1100:120);
  await page.waitForFunction(()=>!document.querySelector('dialog').open&&document.pointerLockElement===document.querySelector('#world canvas'));
  await page.waitForTimeout(500);assert.ok(await page.evaluate(()=>!!document.pointerLockElement));
 }
 if(!contentOnly){await esc();await page.waitForFunction(()=>!document.pointerLockElement);}
 const closeProduct=async()=>{if(contentOnly){await page.locator('#close-panel').click();await page.evaluate(()=>document.exitPointerLock());return;}await page.waitForTimeout(6500);await esc();await page.waitForFunction(()=>!!document.pointerLockElement);await esc();await page.waitForFunction(()=>!document.pointerLockElement);};
 for(const id of ['personal-music','photography']){
  console.log('Checking gallery:',id);
  await page.locator('#collections').click();await page.locator(`[data-exhibit="${id}"]`).click();await page.locator('#visit').click();await page.evaluate(()=>document.exitPointerLock());await page.waitForTimeout(700);
  await page.screenshot({path:`artifacts/current/v${version}-${id}-native.png`});if(contentOnly){await page.locator('#collections').click();await page.locator(`[data-exhibit="${id}"]`).click();await page.locator('#use-product').click();}else{await page.keyboard.press('f');}await page.locator('#inspector.product-mode').waitFor();
  if(id==='personal-music'){await page.locator('[data-album="album-02"]').click();await page.locator('.album-detail audio').evaluate(a=>a.play());await page.waitForFunction(()=>document.querySelector('.album-detail audio').currentTime>.2);}
  await closeProduct();
 }
 for(const id of ['bubble-lab','sonoluminescence']){
  console.log('Checking paper model:',id);
  await page.locator('#collections').click();await page.locator(`[data-exhibit="${id}"]`).click();await page.locator('#use-product').click();
  await page.waitForFunction(()=>document.querySelector('#research-radius')?.getAttribute('d')?.length>100);assert.equal(await page.locator('.research-equation math').count(),4);
  const old=await page.locator('#research-radius').getAttribute('d'),slider=page.locator('.research-controls input').first();await slider.fill(id==='bubble-lab'?'1.4':'0.8');await slider.dispatchEvent('input');await page.waitForFunction(old=>document.querySelector('#research-radius').getAttribute('d')!==old,old);
  await closeProduct();
 }
 await page.locator('#collections').click();await page.locator('[data-exhibit="weiming"]').click();await page.locator('#use-product').click();
 assert.equal(await page.locator('video').evaluate(v=>v.volume),.95);await page.locator('video').evaluate(v=>v.play());await page.waitForFunction(()=>document.querySelector('video').videoWidth===1920&&document.querySelector('video').currentTime>.2);
 await page.locator('video').evaluate(v=>v.currentTime=70);await page.waitForFunction(()=>document.querySelector('video').currentTime>70.2);await closeProduct();
 await page.locator('#harbor-open').click();assert.equal(await page.locator('.harbor-route button:disabled').count(),3);await page.locator('#harbor-visit').click();await page.evaluate(()=>document.exitPointerLock());
 await page.screenshot({path:`artifacts/current/v${version}-harbor-native.png`});await page.locator('#harbor-open').click();await closeProduct();
 await page.locator('#collections').click();await page.locator('[data-exhibit="weiming"]').click();await page.locator('[data-tab="story"]').click();assert.match(await page.locator('.timeline').innerText(),/2026.06.16/);assert.match(await page.locator('.timeline').innerText(),/30 所 985/);await closeProduct();
 await writeFile(`artifacts/current/portable-regression-${version}${contentOnly?'-content-only':''}.json`,JSON.stringify({version,sha256:hash(await readFile(executable)),images:images.length,duplicateLaunch:true,reload:true,physicalEscape:!contentOnly,contentOnly,focusEmulation:false,paperModels:true,mvPlaySeek:true,harbor:true,teamTimeline:true,seasonalTracks:4,discoveries:16},null,2));
 console.log('PASS: final bundle media, paper models, MV playback and seek.'+(contentOnly?' Physical keyboard/pointer-lock checks skipped explicitly.':' Physical Esc restores lock after long-open panels/products; next Esc releases it.'));
}finally{
 if(browser){const client=await browser.newBrowserCDPSession();await Promise.race([client.send('Browser.close').catch(()=>{}),new Promise(r=>setTimeout(r,2000))]);}
 child.kill();
}
