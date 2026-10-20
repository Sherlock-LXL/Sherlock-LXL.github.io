import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const fixtureHtml=await readFile('tests/scene-fixtures.html','utf8');
const fixtureCode=fixtureHtml.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replaceAll("'/src/", "'../src/");
const bundled=await build({stdin:{contents:fixtureCode,resolveDir:fileURLToPath(new URL('.',import.meta.url)),loader:'ts'},bundle:true,write:false,format:'iife',platform:'browser'});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.setContent('<!doctype html><html><head><style>body{margin:0}canvas{display:block}</style></head><body></body></html>');await page.addScriptTag({content:bundled.outputFiles[0].text});
  for(const [kind,angles] of [['hub',[0,Math.PI/2,Math.PI,3*Math.PI/2]],['cup',[.6,-.8]],['sign',[.7,2.4]],['sky',[6.2,17.8,22]]]){
    for(let i=0;i<angles.length;i++){const stats=await page.evaluate(([kind,a])=>window.fixture(kind,a),[kind,angles[i]]);if(kind==='sky')assert.ok(stats.sun.every((v,j)=>Math.abs(v+stats.moon[j])<1e-9));await page.screenshot({path:`artifacts/detail-${kind}-${i}.png`});}
  }
  const {initial,frames}=await page.evaluate(()=>window.flight());assert.equal(initial.length,9);
  let previous=initial;
  for(const frame of frames){for(let i=0;i<9;i++){assert.ok(Math.hypot(...frame[i].p.map((v,j)=>v-previous[i].p[j]))<.055,'activation/retrigger cannot jump the paper position');assert.ok(Math.abs(frame[i].w-previous[i].w)<.12,'wing phase must not snap');}previous=frame;}
  assert.deepEqual(errors,[]);console.log('PASS: four hub views, front/back signs, connected ceramic cup, horizon sky renders, 600 frames of real butterfly transforms');
}catch(error){console.error(errors);throw error;}finally{await browser.close();}
