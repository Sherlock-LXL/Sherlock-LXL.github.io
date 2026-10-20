import {build} from 'vite';import {chromium} from 'playwright';import assert from 'node:assert/strict';import {createServer} from '../backend/server.mjs';import {mkdir,writeFile} from 'node:fs/promises';
import {groundHeight,regionHeight} from '../shared/terrain-height.mjs';import {bridgeLightSpan} from '../shared/bridge-joints.mjs';
const code=await build({configFile:false,logLevel:'error',build:{write:false,lib:{entry:'tests/refinement-v20.ts',name:'GeometryAudit',formats:['iife']}}}),service=await createServer({port:0});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/.test(m.text()))errors.push(m.text());});
await mkdir('artifacts/current',{recursive:true});
try{
 await page.route('**/__v21?inspect=1',r=>r.fulfill({contentType:'text/html',body:'<body style="margin:0">'}));await page.goto(service.url+'/__v21?inspect=1');await page.addScriptTag({content:code[0].output.find(o=>o.type==='chunk').code});
 const catalog=service.catalog.public,{state}=await page.evaluate(c=>window.initV20(c),catalog);let bays=0,minClearance=Infinity;
 for(const run of state.rails){assert.ok(run.length>=3);for(let i=1;i<run.length;i++){const a=run[i-1],b=run[i],d=Math.hypot(b.x-a.x,b.z-a.z);for(let n=0;n<=40;n++)for(const side of [-.09,0,.09]){const t=n/40,x=a.x+(b.x-a.x)*t-(b.z-a.z)/d*side,z=a.z+(b.z-a.z)*t+(b.x-a.x)/d*side,clearance=a.y+(b.y-a.y)*t+.42-.032-groundHeight(x,z,catalog.regions);minClearance=Math.min(minClearance,clearance);assert.ok(clearance>.13,`buried rail at ${x},${z}`);}bays++;}}
 const joints=[];
 for(const r of catalog.regions){const d=Math.hypot(...r.position),line=bridgeLightSpan(d,r.radius);assert.ok(Math.abs(Math.hypot(line.start-.18,2.65)-7.9)<1e-8);assert.ok(Math.abs(Math.hypot(d-line.end-.18,2.65)-(r.radius-.28))<1e-8);joints.push({region:r.id,...line});}
 const mountain=catalog.regions.find(r=>r.terrain);let maxJump={delta:0,x:0,z:0};
 for(let x=-20;x<20;x+=.35)for(let z=-20;z<22;z+=.35){const h=regionHeight(x,z,mountain);for(const [dx,dz] of [[.01,0],[0,.01]]){const delta=Math.abs(regionHeight(x+dx,z+dz,mountain)-h);if(delta>maxJump.delta)maxJump={delta,x,z};}}
 const views=[['harbor-end',[0,-2.9,24],[0,-3.3,20]],['hub-low',[1.8,1.7,3.5],[0,4.25,0]],['hub-side',[4,3,0],[0,3.4,0]],['gift-slope',[-19,2.7,-21],[-24,4,-33]],['gate',[-11,3,-19],[-14.8,2.35,-25]],['upper',[-13,15,-46],[-30,10,-49]]];
 for(const r of catalog.regions){const d=Math.hypot(...r.position),t=d-Math.sqrt((r.radius-.28)**2-2.65**2),px=r.position[0]/d,pz=r.position[1]/d,x=px*t+pz*2.65,z=pz*t-px*2.65;views.push([`joint-${r.id}`,[x+2,3,z+3],[x,0,z]]);}
 for(const [name,p,t] of views){await page.evaluate(([p,t])=>window.viewV20(p,t),[p,t]);await page.screenshot({path:`artifacts/current/v21-${name}.png`});}
 for(const [index,run] of state.rails.entries())if(index%3===0){const p=run[Math.floor(run.length/2)];await page.evaluate(([p,t])=>window.viewV20(p,t),[[p.x+3,p.y+1,p.z+3],[p.x,p.y+.4,p.z]]);await page.screenshot({path:`artifacts/current/v21-rail-${index}.png`});}
 assert.deepEqual(errors,[]);await writeFile('artifacts/current/geometry-v21.json',JSON.stringify({bays,minClearance,joints,maxJump,errors},null,2));console.log(JSON.stringify({bays,minClearance,maxJump,errors}));
}finally{await browser.close();service.server.closeAllConnections();service.server.close();}
