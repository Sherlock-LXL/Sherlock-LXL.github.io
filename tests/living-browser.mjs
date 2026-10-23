import {chromium,webkit} from 'playwright';
import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadCatalog} from '../backend/catalog.mjs';
import {LivingNavigation} from '../shared/living-navigation.mjs';

const root=path.resolve('dist'),out=process.env.LIVING_ARTIFACTS||'artifacts/living',reviewOnly=process.env.LIVING_REVIEW_ONLY==='1';
const server=createServer(async(req,res)=>{
  try{
    let file=path.resolve(root,decodeURIComponent(new URL(req.url,'http://local').pathname).slice(1)||'index.html');
    if(!file.startsWith(root+path.sep)&&file!==root)throw Error('outside root');
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'})[path.extname(file)]??'application/octet-stream');
    res.end(await readFile(file));
  }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,catalog=(await loadCatalog(process.cwd())).public;
await mkdir(out,{recursive:true});const results=[];
try{
  for(const [name,engine] of Object.entries(process.env.LIVING_ENGINE==='webkit'?{webkit}:process.env.TEST_WEBKIT==='1'?{chromium,webkit}:{chromium})){
    const browser=await engine.launch({headless:true});let page;
    try{
      page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(18000);const errors=[];
      page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
      await page.goto(origin+'/world/?inspect');await page.waitForFunction(()=>typeof window.__xiangmetaInspect==='function',null,{timeout:90000});
      const inspect=()=>page.evaluate(()=>window.__xiangmetaInspect());let state=await inspect();
      assert.equal(state.living.items.length,16);assert.equal(state.living.animals.length,10);
      const reserved=[...state.memories,...state.discoveries,...state.stations.map(s=>s.approach),...state.artworks.map(a=>a.approach)].map(p=>({...p,radius:1.7}));
      const nav=new LivingNavigation(catalog.regions,state.obstacles,reserved);
      const approach=async(kind,animal=false)=>{
        const s=await inspect(),target=(animal?s.living.animals:s.living.items).find(a=>a.kind===kind),dynamic=[...s.living.items.filter(i=>!i.held),...s.living.animals];
        const candidates=Array.from({length:32},(_,i)=>{const angle=i*Math.PI/16,d=target.radius+.85;return {x:target.x+Math.sin(angle)*d,z:target.z+Math.cos(angle)*d};});
        const p=candidates.find(p=>{const y=nav.ground(p.x,p.z,.36,null,dynamic);return y!==null&&Math.abs(y-target.y)<.15&&nav.sight({...p,y:y+.5},{...target,y:target.y+.5});});
        assert.ok(p,`approach ${kind}`);await page.evaluate(({p,t})=>window.__xiangmetaWalk(p.x,p.z,t.x,t.z),{p,t:target});
        await page.waitForFunction(({name,animal})=>document.querySelector('#interaction-prompt b')?.textContent===name&&document.querySelector('[data-living-key="Q"]')?.textContent?.includes(animal?'抚摸':'拿起'),{name:target.name,animal});
        return target;
      };
      for(const item of reviewOnly?[]:state.living.items){
        await approach(item.kind);await page.keyboard.press('q');await page.waitForFunction(id=>window.__xiangmetaInspect().living.carried===id,item.id);
        // Carry to a clear part of the hub and turn toward a valid footprint.
        const hub=Array.from({length:48},(_,i)=>{const a=i*Math.PI/24;return {x:Math.sin(a)*5.5,z:Math.cos(a)*5.5,tx:Math.sin(a)*6.65,tz:Math.cos(a)*6.65};})
          .find(p=>nav.ground(p.x,p.z,.36)!==null&&nav.ground(p.tx,p.tz,item.radius,null,[],true,.035)!==null&&nav.sight({...p,y:.4},{x:p.tx,y:.4,z:p.tz}));
        assert.ok(hub);await page.evaluate(p=>window.__xiangmetaWalk(p.x,p.z,p.tx,p.tz),hub);
        await page.waitForFunction(()=>window.__xiangmetaInspect().living.drop!==null);
        const before=(await inspect()).living.drop;await page.keyboard.press('q');
        await page.waitForFunction(()=>window.__xiangmetaInspect().living.carried===null);
        console.log(`${name}: ${item.kind} round trip`);
        const placed=(await inspect()).living.items.find(i=>i.id===item.id);
        assert.ok(Math.hypot(placed.x-before.x,placed.z-before.z)<.01);
        // Return the item to its original patch so subsequent loops do not crowd the hub.
        await approach(item.kind);await page.keyboard.press('q');await page.waitForFunction(id=>window.__xiangmetaInspect().living.carried===id,item.id);
        const candidates=Array.from({length:16},(_,i)=>({x:item.x+Math.sin(i*Math.PI/8)*1.15,z:item.z+Math.cos(i*Math.PI/8)*1.15}));
        const back=candidates.find(p=>nav.ground(p.x,p.z,.36)!==null);assert.ok(back);
        await page.evaluate(({p,t})=>window.__xiangmetaWalk(p.x,p.z,t.x,t.z),{p:back,t:item});
        await page.waitForFunction(()=>window.__xiangmetaInspect().living.drop!==null);await page.keyboard.press('q');
        await page.waitForFunction(()=>window.__xiangmetaInspect().living.carried===null);
      }
      if(!reviewOnly)console.log(`${name}: all 16 objects carried across regions and placed`);
      for(const original of state.living.animals){
        await approach(original.kind,true);await page.keyboard.press('q');await page.waitForFunction(()=>window.__xiangmetaInspect().living.hearts>0);
        if(original.ride){
          await page.keyboard.press('t');await page.waitForFunction(kind=>window.__xiangmetaInspect().living.mounted===kind,original.kind);
          const start=await inspect(),mount=start.living.animals.find(a=>a.kind===original.kind),occupied=[...start.living.items,...start.living.animals.filter(a=>a.kind!==original.kind)];
          const paths=[['w',1,0],['d',0,1],['s',-1,0],['a',0,-1],['w d',1,1],['s d',-1,1],['s a',-1,-1],['w a',1,-1]].map(([keys,forward,side])=>{
            const n=Math.hypot(forward,side),yaw=start.yaw;
            return {keys:keys.split(' '),x:mount.x+(-Math.sin(yaw)*forward+Math.cos(yaw)*side)/n*1.5,z:mount.z+(-Math.cos(yaw)*forward-Math.sin(yaw)*side)/n*1.5};
          });
          const path=paths.find(p=>nav.segment(mount,p,mount.radius,mount.regionId,occupied));assert.ok(path,`${original.kind} safe riding path`);
          for(const key of path.keys)await page.keyboard.down(key);
          await page.waitForFunction(p=>{const s=window.__xiangmetaInspect().player;return Math.hypot(s.x-p.x,s.z-p.z)>.55;},start.player,{timeout:10000});
          for(const key of path.keys)await page.keyboard.up(key);
          const ridden=(await inspect()).player;assert.notEqual(nav.ground(ridden.x,ridden.z,mount.radius,mount.regionId,occupied),null);
          await page.keyboard.press('Space');await page.waitForFunction(()=>!window.__xiangmetaInspect().player.grounded);
          const peak=await page.evaluate(()=>new Promise(resolve=>{let peak=0;const tick=()=>{const s=window.__xiangmetaInspect();peak=Math.max(peak,s.player.y);if(s.player.grounded)resolve(peak);else requestAnimationFrame(tick);};tick();}));
          assert.ok(peak-original.y>1.8);await page.keyboard.press('t');await page.waitForFunction(()=>window.__xiangmetaInspect().living.mounted===null);
        }
        const a=(await inspect()).living.animals.find(a=>a.kind===original.kind),d=a.ride?3:1.7,angle=a.yaw+.5;
        await page.evaluate(({a,d,angle})=>window.__xiangmetaFrame([a.x+Math.sin(angle)*d,a.y+a.height*.7+.4,a.z+Math.cos(angle)*d],[a.x,a.y+a.height*.48,a.z],10),{a,d,angle});
        await page.screenshot({path:`${out}/${name}-${a.kind}.png`});
        await page.keyboard.press('p');
      }
      console.log(`${name}: ten pets, hearts, both mounts and safe landings`);
      await page.locator('#sky-settings').click();await page.locator('#cycle-time').uncheck();
      for(const kind of ['hail','tornado','aurora','sunset']){
        await page.locator('#weather-select').selectOption(kind);
        await page.waitForFunction(kind=>window.__xiangmetaInspect().weather[kind]>.99,kind,{timeout:45000});
        const s=await inspect();if(kind==='aurora')assert.ok(s.hour>21.9&&s.hour<22.1);if(kind==='sunset')assert.ok(s.hour>17.3&&s.hour<17.5);
        await page.keyboard.press('Escape');
        const frame=kind==='tornado'?{p:[-75,12,-70],t:[-135,15,-105]}:kind==='hail'?{p:[32,3,-19],t:[28,1,-25]}:{p:[0,3,6],t:[-45,38,-80]};
        await page.evaluate(({p,t})=>window.__xiangmetaFrame(p,t),frame);
        const frozen=(await inspect()).weather.motionTime;await page.screenshot({path:`${out}/${name}-${kind}.png`});
        assert.equal((await inspect()).weather.motionTime,frozen);await page.keyboard.press('p');await page.locator('#sky-settings').click();
      }
      await page.keyboard.press('Escape');assert.deepEqual(errors,[]);
      results.push({engine:name,items:reviewOnly?'previously verified':16,animals:10,mounts:2,weather:4,errors});await page.close();
    }catch(error){
      if(page){await page.screenshot({path:`${out}/${name}-failure.png`});await writeFile(`${out}/${name}-failure.json`,JSON.stringify(await page.evaluate(()=>({state:window.__xiangmetaInspect?.(),prompt:document.querySelector('#interaction-prompt')?.textContent})),null,2));}
      throw error;
    }finally{await browser.close();}
  }
}finally{await new Promise(resolve=>server.close(resolve));await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));}
