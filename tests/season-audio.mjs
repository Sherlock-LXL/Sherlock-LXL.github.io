import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {releaseMouse} from './input-helpers.mjs';
const s=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{const Original=window.Audio;window.testAudio=[];window.Audio=function(src){const a=new Original(src);window.testAudio.push(a);return a;};window.Audio.prototype=Original.prototype;});
const heard=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('xiangmeta:seasonal-music:v1')??'[]'));
const enter=async id=>{await releaseMouse(page);await page.locator(`[data-region="${id}"]`).click();};
const playing=async suffix=>page.waitForFunction(suffix=>window.testAudio.some(a=>a.src.endsWith(suffix)&&!a.paused&&a.currentTime>.1),suffix,{timeout:20000});
try{
  await page.goto(s.url);await page.locator('#world canvas').waitFor();await playing('/spring.mp3');assert.deepEqual(await heard(),['season-spring-v1']);
  await enter('weiming-studio');await playing('/summer.mp3');assert.deepEqual(await heard(),['season-spring-v1','season-summer-v1']);
  for(let i=0;i<3;i++){await enter('ai-mountain');await enter('weiming-studio');}assert.equal(await page.evaluate(()=>window.testAudio.filter(a=>a.src.endsWith('/summer.mp3')).length),1);
  await enter('personal-museum');await playing('/autumn.mp3');await page.locator('#sound').click();const paused=await page.evaluate(()=>window.testAudio.find(a=>a.src.endsWith('/autumn.mp3')).currentTime);await page.waitForTimeout(350);await page.locator('#sound').click();await playing('/autumn.mp3');assert.ok(await page.evaluate(t=>window.testAudio.find(a=>a.src.endsWith('/autumn.mp3')).currentTime>=t,paused));
  await page.locator('#sound').click();await enter('science-valley');assert.equal((await heard()).includes('season-winter-v1'),false);await page.locator('#sound').click();await playing('/winter.mp3');
  await page.evaluate(()=>{const a=window.testAudio.find(a=>a.src.endsWith('/winter.mp3'));a.currentTime=a.duration-.2;});await page.waitForFunction(()=>/伴奏电台/.test(document.querySelector('#music-caption').textContent),null,{timeout:15000});
  assert.equal((await heard()).length,4);await enter('science-valley');assert.equal(await page.evaluate(()=>window.testAudio.filter(a=>a.src.endsWith('/winter.mp3')).length),1);
  await page.locator('#collections').click();await page.locator('[data-exhibit="personal-music"]').click();assert.equal(await page.locator('#inspector audio').count(),1);
  // The real vocal album player must pause background tracks and release them on pause/switch/close.
  await page.locator('.album-detail audio').evaluate(a=>a.play());await page.waitForFunction(()=>window.testAudio.every(a=>a.paused));await page.locator('.album-detail audio').evaluate(a=>a.pause());await page.waitForFunction(()=>window.testAudio.some(a=>!a.paused));
  await page.locator('.album-detail audio').evaluate(a=>a.play());await page.waitForFunction(()=>window.testAudio.every(a=>a.paused));await page.locator('[data-album="album-02"]').click();await page.waitForFunction(()=>window.testAudio.some(a=>!a.paused));assert.equal(await page.locator('.album-detail audio').evaluate(a=>a.paused),true);
  await page.locator('.album-detail audio').evaluate(a=>a.play());await page.waitForFunction(()=>window.testAudio.every(a=>a.paused));await page.keyboard.press('Escape');await releaseMouse(page);await page.waitForFunction(()=>window.testAudio.some(a=>!a.paused));
  await page.reload();await page.locator('#world canvas').waitFor();await page.waitForFunction(()=>window.testAudio.some(a=>!a.paused&&a.currentTime>.1));await page.locator('[data-region="weiming-studio"]').click();await page.waitForTimeout(1200);assert.equal(await page.evaluate(()=>window.testAudio.some(a=>a.src.endsWith('/summer.mp3'))),false);
  await page.locator('#collections').click();await page.locator('[data-exhibit="photography"]').click();assert.equal(await page.locator('#inspector .media-card img').count(),14);await page.locator('[data-immerse="0"]').click();await page.waitForFunction(()=>{const i=document.querySelector('.immersive-image img');return i?.complete&&i.naturalWidth>100;});await page.screenshot({path:'artifacts/real-photography.png'});
  assert.deepEqual(errors,[]);console.log('PASS: default-on MP3 playback, MP3 seek/end to playlist, rapid re-entry dedupe, mute/resume, premiere persistence, manual preview exclusion, 14 original photos');
}catch(e){await page.screenshot({path:'artifacts/season-audio-failure.png'});throw e;}finally{await browser.close();s.server.closeAllConnections();await new Promise(r=>s.server.close(r));}
