import {chromium} from 'playwright';import assert from 'node:assert/strict';import {writeFile,readFile} from 'node:fs/promises';import {createServer} from '../backend/server.mjs';import {releaseMouse} from './input-helpers.mjs';
const service=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),report=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{
 const Original=window.Audio;window.media=[];window.Audio=function(src){const a=new Original(src);window.media.push(a);return a;};window.Audio.prototype=Original.prototype;
 const original=AudioContext.prototype.createDynamicsCompressor;AudioContext.prototype.createDynamicsCompressor=function(){const node=original.call(this),analyser=this.createAnalyser();analyser.fftSize=2048;node.connect(analyser);window.output=analyser;return node;};
});
async function sample(name,selector){
 const media=page.locator(selector);await media.evaluate(async a=>{a.load();await a.play();});await page.waitForFunction(s=>Number.isFinite(document.querySelector(s).duration),selector);
 await media.evaluate(a=>a.currentTime=a.duration*.3);await page.waitForTimeout(500);
 const data=await page.evaluate(async s=>{const a=document.querySelector(s),values=new Float32Array(2048);let peak=0,squares=0,n=0;for(let i=0;i<25;i++){await new Promise(requestAnimationFrame);window.output.getFloatTimeDomainData(values);for(const v of values){peak=Math.max(peak,Math.abs(v));squares+=v*v;n++;}}return {volume:a.volume,peak,rms:Math.sqrt(squares/n),src:a.getAttribute('src')};},selector);
 assert.equal(data.volume,.95);assert.ok(data.rms>.0001,name+' has audible signal');assert.ok(data.peak<=1.01,name+' is not digitally clipped');report.push({name,...data});await media.evaluate(a=>a.pause());
}
try{
 await page.goto(service.url);await page.locator('#world canvas').waitFor();await page.waitForFunction(()=>window.media.some(a=>!a.paused&&a.volume>.94));
 const music=service.catalog.public.modules.find(m=>m.id==='personal-music');
 await page.locator('#collections').click();await page.locator('[data-exhibit="personal-music"]').click();await page.locator('#use-product').click();
 for(const album of music.albums){await page.locator(`[data-album="${album.id}"]`).click();for(let i=0;i<album.tracks.length;i++){await page.locator('.album-tracks button').nth(i).click();await sample(album.tracks[i].title,'.album-detail audio');}}
 await page.locator('#close-panel').click();await releaseMouse(page);await page.locator('#collections').click();await page.locator('[data-exhibit="weiming"]').click();await page.locator('#use-product').click();await sample('燕来有声','video[controls]');
 await page.locator('#close-panel').click();await releaseMouse(page);await page.waitForFunction(()=>window.media.some(a=>!a.paused&&a.volume>.94));
 await page.locator('#sound').click();await page.waitForFunction(()=>window.media.every(a=>a.paused));await page.locator('#sound').click();await page.waitForFunction(()=>window.media.some(a=>!a.paused&&a.volume>.94));
 const levels=JSON.parse(await readFile('asset-sources/metadata/audio-loudness.json','utf8'));assert.equal(Object.keys(levels).length,24);
 assert.deepEqual(errors,[]);await writeFile('artifacts/current/release-audio.json',JSON.stringify({targetLufs:-14,recordings:24,report,errors},null,2));console.log('PASS: 12 album tracks + MV produce nonzero, unclipped output through normalization; album switches, background resume and mute work; 24 recordings calibrated');
}finally{await browser.close();service.server.closeAllConnections();service.server.close();}
