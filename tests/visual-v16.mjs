import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const code=await build({entryPoints:['tests/visual-v16.ts'],bundle:true,write:false,format:'iife',platform:'browser'});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/.test(m.text()))errors.push(m.text());});
try{
 await page.setContent('<!doctype html><html><body style="margin:0"></body></html>');await page.addScriptTag({content:code.outputFiles[0].text});
 const wheel=await page.evaluate(()=>window.pinwheelCheck());assert.ok(wheel.minZ-(-.33)>.45,'rotor stays clear of the rear support throughout two rotations');
 for(const angle of [.6,1.55,2.7]){await page.evaluate(a=>window.boatView(a),angle);await page.screenshot({path:`artifacts/v16-boat-${angle}.png`});}
 const poster='data:image/webp;base64,'+(await readFile('modules/weiming/assets/yan-lai-you-sheng.webp')).toString('base64');
 for(const angle of [.2,1.48,2.7]){const s=await page.evaluate(([src,a])=>window.studioView(src,a),[poster,angle]);assert.ok(s.decoded&&!s.placeholder);assert.ok(s.z< -1.67&&s.z> -1.69&&s.width<6.7&&s.height<3.4);await page.screenshot({path:`artifacts/v16-studio-${angle}.png`});}
 const weather=await page.evaluate(()=>window.weatherChecks());for(const w of weather){assert.ok(w.unchanged,w.kind+' world anchors independent of observer');assert.ok(w.largest<.02,w.kind+' no abrupt dawn/dusk color threshold');}
 await page.evaluate(()=>window.cloudView());await page.screenshot({path:'artifacts/v16-clouds.png'});assert.deepEqual(errors,[]);console.log('PASS:',JSON.stringify({wheel,weather}));
}finally{await browser.close();}


