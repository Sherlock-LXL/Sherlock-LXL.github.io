import {build} from 'vite';import {chromium} from 'playwright';import assert from 'node:assert/strict';import {createServer} from '../backend/server.mjs';import {writeFile} from 'node:fs/promises';
import {footprintsOverlap} from '../shared/decoration-clearance.mjs';import {onRegionRoute} from '../shared/region-routes.mjs';
const code=await build({configFile:false,logLevel:'error',build:{write:false,lib:{entry:'tests/clearance-v19.ts',name:'ClearanceAudit',formats:['iife']}}}),service=await createServer({port:0});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/.test(m.text()))errors.push(m.text());});
try{
 await page.route('**/__clearance?inspect=1',r=>r.fulfill({contentType:'text/html',body:'<body style="margin:0">'}));await page.goto(service.url+'/__clearance?inspect=1');await page.addScriptTag({content:code[0].output.find(o=>o.type==='chunk').code});
 const catalog=service.catalog.public,s=await page.evaluate(c=>window.auditInit(c),catalog),winter=catalog.regions.find(r=>r.season==='winter');
 for(const bench of s.benches)for(const o of s.obstacles){if(o.x===bench.x&&o.z===bench.z)continue;assert.ok(!footprintsOverlap(bench,o,.15),'bench clear of rail / other furniture');}
 for(const drift of s.snowDrifts){assert.ok(drift.top<.14,'snow stays shallow');for(const o of s.obstacles)assert.ok(!footprintsOverlap(drift,o,.44),'full snow footprint avoids furniture');for(const m of s.memories)assert.ok(!footprintsOverlap(drift,{...m,radius:1.5},.24),'snow avoids memories');assert.ok(!onRegionRoute(drift.x-winter.position[0],drift.z-winter.position[1],winter,catalog.modules.filter(m=>m.region===winter.id),Math.max(drift.halfX,drift.halfZ)+.34));}
 assert.ok(s.snowDrifts.length>10);
 for(const r of catalog.regions)for(const [i,a] of [.3,2.4,4.5].entries()){
  const pos=[r.position[0]+Math.sin(a)*33,r.terrain?21:12,r.position[1]+Math.cos(a)*33],target=[r.position[0],r.terrain?6:1.6,r.position[1]];
  await page.evaluate(([p,t])=>window.auditView(p,t),[pos,target]);await page.screenshot({path:`artifacts/v19-clearance-${r.id}-${i}.png`});
 }
 for(const [i,b] of s.benches.entries())for(const [n,a] of [.35,2.6].entries()){await page.evaluate(([p,t])=>window.auditView(p,t),[[b.x+Math.sin(a)*5,b.y+2.2,b.z+Math.cos(a)*5],[b.x,b.y+.6,b.z]]);await page.screenshot({path:`artifacts/v19-bench-${i}-${n}.png`});}
 for(const [id,p,t] of [['hub',[9,8,12],[0,2,1]],['harbor',[12,2,33],[1,-3.8,25]],['pier',[-6,-.7,28],[4,-4.3,25]]]){await page.evaluate(([p,t])=>window.auditView(p,t),[p,t]);await page.screenshot({path:`artifacts/v19-clearance-${id}.png`});}
 for(const [i,a] of [0,.65,1.57,2.35,3.14].entries()){
  await page.evaluate(([p,t,time])=>window.auditView(p,t,'rain',time),[[0,2,8],[Math.sin(a)*30,8,8-Math.cos(a)*30],i*.23]);await page.screenshot({path:`artifacts/v19-rain-${i}.png`});
 }
 const rain=await page.evaluate(()=>window.rainAudit());assert.ok(rain.cameraIndependent&&rain.frozen&&rain.maxLength<.73);assert.deepEqual(errors,[]);
 await writeFile('artifacts/clearance-v19.json',JSON.stringify({benches:s.benches,walls:s.walls,snowDrifts:s.snowDrifts,rain,errors},null,2));
 console.log('PASS:',JSON.stringify({benches:s.benches.length,snowDrifts:s.snowDrifts.length,walls:s.walls.length,rain}));
}finally{await browser.close();service.server.closeAllConnections();service.server.close();}
