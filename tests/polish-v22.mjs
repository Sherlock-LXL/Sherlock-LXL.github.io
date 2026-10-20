import {build} from 'vite';import {chromium} from 'playwright';import assert from 'node:assert/strict';import {createServer} from '../backend/server.mjs';import {mkdir,writeFile,readFile} from 'node:fs/promises';import {releaseMouse} from './input-helpers.mjs';
const code=await build({configFile:false,logLevel:'error',build:{write:false,lib:{entry:'tests/polish-v22.ts',name:'PolishAudit',formats:['iife']}}}),service=await createServer({port:0});
const browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1200,height:850}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|WebGL|THREE/.test(m.text()))errors.push(m.text());});await mkdir('artifacts/current',{recursive:true});
try{
 await page.route('**/__v22?inspect=1',r=>r.fulfill({contentType:'text/html',body:'<body style="margin:0">'}));await page.goto(service.url+'/__v22?inspect=1');await page.addScriptTag({content:code[0].output.find(o=>o.type==='chunk').code});
 const {roofs}=await page.evaluate(c=>window.initV22(c),service.catalog.public);assert.equal(roofs.length,5);assert.deepEqual(roofs.map(r=>r.x),[-9,-4.5,0,4.5,9]);assert.ok(roofs.every(r=>Math.abs(r.bottom-4.01)<.001));
 const views=[['camp-front',[24,6,-21],[24,3.5,-32]],['camp-rear',[23,7,-40],[24,3.5,-32]],['gate',[10,3,-7],[12.5,3.4,-10.4]],['green-mountain',[-11,3,-19],[-19,5,-32]]];
 for(let i=0;i<5;i++){const x=15+i*4.5;views.push([`lab-${i}`,[x+1.7,5.9,-27.5],[x,4.35,-32]]);}
 for(const [name,p,t] of views){await page.evaluate(([p,t])=>window.viewV22(p,t),[p,t]);await page.screenshot({path:`artifacts/current/v22-${name}.png`});}
 const memory=[];for(const collect of [false,true]){const s=await page.evaluate(c=>window.memoryV22(c),collect);memory.push(s);const [x,y,z]=s.point;await page.evaluate(([p,t])=>window.viewV22(p,t),[[x+.4,y+.5,z+3],[x,y,z]]);await page.screenshot({path:`artifacts/current/v22-memory-${collect?'collected':'new'}.png`});}
 assert.ok(memory[1].brightness<memory[0].brightness*.55&&memory[1].halo<memory[0].halo*.3);assert.equal(memory[1].collected,2,'collected shard is still interactive');
 await page.goto(service.url+'/?inspect=1');await page.locator('#world canvas').waitFor();
 const sizes=await page.locator('.interaction-prompt .prompt-art svg').evaluateAll(es=>es.map(e=>({width:getComputedStyle(e).width,height:getComputedStyle(e).height})));assert.equal(sizes.length,3);assert.ok(sizes.every(s=>s.width==='25px'&&s.height==='25px'));
 await releaseMouse(page);await page.locator('#collections').click();await page.locator('[data-exhibit="bubble-lab"]').click();await page.locator('#visit').click();await releaseMouse(page);await page.screenshot({path:'artifacts/current/v22-f-prompt.png'});
 const audio=JSON.parse(await readFile('public/assets/audio/manifest.json','utf8'));assert.equal(audio.volume.ui,.02);assert.equal(audio.volume.music,.95);assert.equal(audio.volume.interaction,.22);
 assert.deepEqual(errors,[]);await writeFile('artifacts/current/polish-v22.json',JSON.stringify({roofs,memory,sizes,audio:audio.volume,errors},null,2));console.log('PASS: five supported decorative lab instruments, collectible dims smoothly and remains interactive, three 25px SVG prompts, quieter UI-only audio, no rendering errors');
}finally{await browser.close();service.server.closeAllConnections();service.server.close();}
