import {chromium,webkit} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

// Exercise the production files behind a strict static server (no SPA rewrite).
const root=path.resolve('dist'),base=process.env.BASE_PATH||'/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg'};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
    if(!pathname.startsWith(base))throw new Error('outside base');
    let file=path.resolve(root,pathname.slice(base.length)||'index.html');
    if(!file.startsWith(root+path.sep)&&file!==root)throw new Error('outside root');
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.end(await readFile(file));
  }catch{res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,url=route=>origin+base+route;
await mkdir('artifacts/web',{recursive:true});
const engines=process.env.TEST_WEBKIT==='1'?{chromium,webkit}:{chromium};
const results=[];
try{
  for(const [name,engine] of Object.entries(engines)){
    const checkpoint=label=>console.log(`[${name} ${base}] ${label}`);
    const browser=await engine.launch({headless:true,args:name==='chromium'?['--disable-crash-reporter','--disable-breakpad']:[]});
    try{
      const context=await browser.newContext({viewport:{width:1440,height:1000}});
      const page=await context.newPage(),errors=[],requests=[],failures=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('request',r=>requests.push(r.url()));
      page.on('response',r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
      // Observe external destinations without depending on third-party availability.
      await context.route('https://**/*',route=>route.fulfill({status:200,body:'External destination verified'}));
      await page.goto(url(''));
      await page.locator('.hero').waitFor();
      assert.equal(await page.locator('.project-card').count(),3);
      assert.ok(!requests.some(u=>/three-|main-.*\.js|\.webp|\/api\//.test(u)));
      await page.screenshot({path:`artifacts/web/${name}-landing.png`,fullPage:true});
      await page.getByRole('link',{name:'View Projects',exact:false}).click();
      await page.locator('.project-card').last().waitFor();
      assert.equal(await page.locator('.project-card').count(),10);
      await page.getByRole('button',{name:'Research / 科研',exact:true}).click();
      assert.equal(await page.locator('.project-card:visible').count(),2);
      await page.reload();await page.locator('#result-count').waitFor();
      assert.equal(await page.locator('.project-card:visible').count(),2);
      await page.getByRole('button',{name:'全部',exact:true}).click();
      await page.locator('#project-search').fill('LSTM');
      assert.equal(await page.locator('.project-card:visible').count(),1);
      await page.goto(url('projects/#personal-music'));
      await page.locator('#personal-music details[open]').waitFor();
      assert.equal(await page.locator('#personal-music .record-grid a').count(),5);
      assert.equal(await page.locator('audio,video').count(),0);
      checkpoint('Landing, project filters/refresh and album links passed');
      await page.goto(url('world/?project=xianglm&inspect'));
      await page.locator('#world-loading').waitFor({state:'hidden',timeout:90000});
      await page.locator('#interaction-prompt').waitFor({timeout:90000});
      assert.ok((await page.locator('#interaction-prompt').innerText()).includes('XiangLM'));
      assert.equal(await page.locator('#interaction-prompt a:has-text("GitHub")').getAttribute('href'),'https://github.com/Sherlock-LXL/xianglm');
      const textureState=await page.evaluate(()=>window.__xiangmetaInspect().textures);
      assert.ok(textureState.length>=20);assert.ok(textureState.every(t=>t.ready&&t.width>0));
      assert.ok(textureState.every(t=>!t.detail&&t.width<=384),'distant covers display real previews before region detail loads');
      assert.equal(await page.locator('#world').getAttribute('data-preview-ready'),String(textureState.length));
      const keyStyle=await page.locator('#interaction-prompt kbd').first().evaluate(el=>{
        const s=getComputedStyle(el);return {color:s.color,background:s.backgroundColor,size:parseFloat(s.fontSize)};
      });
      assert.equal(keyStyle.color,'rgb(23, 51, 39)');assert.ok(keyStyle.size>=16);
      await page.screenshot({path:`artifacts/web/${name}-mountain.png`});
      const initial=await page.evaluate(()=>window.__xiangmetaInspect().player);
      await page.keyboard.down('KeyS');
      await page.waitForFunction(p=>Math.hypot(window.__xiangmetaInspect().player.x-p.x,window.__xiangmetaInspect().player.z-p.z)>.5,initial,{timeout:10000});
      const hudBounds=await page.evaluate(()=>new Promise(resolve=>{
        const bounds=[];const sample=()=>{const r=document.querySelector('.controls-pill').getBoundingClientRect();bounds.push({x:r.x,width:r.width});if(bounds.length<35)requestAnimationFrame(sample);else resolve(bounds);};sample();
      }));
      assert.ok(hudBounds.every(r=>Math.abs(r.x-hudBounds[0].x)<.1&&Math.abs(r.width-hudBounds[0].width)<.1),'walking HUD must not move with coordinates or nearby names');
      await page.keyboard.up('KeyS');
      await page.keyboard.press('Space');
      await page.waitForFunction(()=>!window.__xiangmetaInspect().player.grounded,null,{timeout:10000});
      await page.waitForFunction(()=>window.__xiangmetaInspect().player.grounded,null,{timeout:10000});
      checkpoint('World boot, 20 distant previews, legible keys, stationary HUD, walking and jumping passed');
      await page.goto(url('world/?project=xianglm&inspect'));
      await page.locator('#interaction-prompt').waitFor({timeout:90000});
      await page.keyboard.press('KeyE');
      await page.locator('#inspector[open]').waitFor();
      assert.ok((await page.locator('#panel-content').innerText()).includes('4B tokens'));
      assert.equal(await page.locator('#module-form').count(),0);
      await page.keyboard.press('Escape');
      // Release auto-resumed pointer lock before clicking ordinary UI controls.
      await page.keyboard.press('Escape');
      const popup=context.waitForEvent('page');
      await page.keyboard.press('KeyF');
      const external=await popup;await external.waitForLoadState();
      assert.equal(external.url(),'https://github.com/Sherlock-LXL/xianglm');await external.close();
      await page.keyboard.press('KeyP');
      await page.locator('body.photo-mode').waitFor();
      const photoY=await page.evaluate(()=>window.__xiangmetaInspect().photoCamera[1]);
      await page.keyboard.down('KeyE');
      await page.waitForFunction(y=>window.__xiangmetaInspect().photoCamera[1]>y+.3,photoY,{timeout:10000});
      await page.keyboard.up('KeyE');
      assert.equal(await page.locator('#inspector[open]').count(),0);
      await page.keyboard.press('KeyP');
      await page.keyboard.press('Escape');
      await page.locator('#memory-open').click();
      await page.locator('.memory-index [data-memory]').first().click();
      await page.locator('#memory-visit').click();
      await page.locator('#memory-prompt').waitFor({timeout:10000});
      await page.keyboard.press('KeyG');
      await page.locator('#inspector[open] .memory-source').waitFor();
      assert.ok((await page.locator('.memory-source').innerText()).includes('已收藏'));
      await page.keyboard.press('Escape');
      await page.keyboard.press('Escape');
      checkpoint('E About, F GitHub, photo E and G memory passed');
      await page.locator('#overview').click();
      await page.waitForFunction(()=>document.querySelector('#world')?.dataset.view==='map');
      await page.waitForFunction(()=>performance.getEntriesByType('resource').some(r=>r.name.endsWith('/weiming/yan-lai-you-sheng.webp')),{},{timeout:15000});
      await page.screenshot({path:`artifacts/web/${name}-world.png`});
      await page.goto(url('world/?project=personal-music&inspect'));
      await page.locator('#interaction-prompt').waitFor({timeout:90000});
      const musicPopup=context.waitForEvent('page');
      await page.keyboard.press('KeyR');
      const musicExternal=await musicPopup;await musicExternal.waitForLoadState();
      assert.equal(musicExternal.url(),'https://music.163.com/#/artist?id=46962347');
      await musicExternal.close();
      await page.keyboard.press('KeyE');
      await page.locator('.album-gallery').waitFor();
      assert.equal(await page.locator('audio,video').count(),0);
      assert.equal(await page.locator('.album-detail a').getAttribute('href'),'https://music.163.com/#/album?id=172971428');
      assert.equal(await page.locator('.album-cover').count(),5);
      checkpoint('Map, R music and album gallery passed');
      assert.ok(!requests.some(u=>/\.mp3|\.mp4|\/api\//.test(u)),'no audio request before opt-in');
      await page.keyboard.press('Escape');await page.keyboard.press('Escape');
      await page.locator('#memory-open').click();await page.locator('#atlas-visit').click();
      await page.keyboard.press('Escape');
      await page.locator('#sound').click();
      await page.waitForFunction(()=>window.__xiangmetaAudio().playing&&window.__xiangmetaAudio().context==='running',null,{timeout:15000});
      assert.match(await page.evaluate(()=>window.__xiangmetaAudio().track),/^backing-0[1-7]$/);
      await page.locator('[data-region="personal-museum"]').click();
      await page.waitForFunction(()=>window.__xiangmetaAudio().track==='season-autumn-v1'&&window.__xiangmetaAudio().playing,null,{timeout:15000});
      assert.equal(await page.evaluate(()=>window.__xiangmetaAudio().track),'season-autumn-v1');
      for(const [region,track] of [['ai-mountain','season-spring-v1'],['weiming-studio','season-summer-v1'],['science-valley','season-winter-v1']]){
        await page.locator(`[data-region="${region}"]`).click();
        await page.waitForFunction(id=>{const s=window.__xiangmetaAudio();return s.track===id&&s.playing&&s.heard.includes(id);},track,{timeout:15000});
      }
      const beforePause=await page.evaluate(()=>window.__xiangmetaAudio());
      await page.locator('#sound').click();
      await page.waitForFunction(()=>window.__xiangmetaAudio().muted&&!window.__xiangmetaAudio().playing);
      const paused=await page.evaluate(()=>window.__xiangmetaAudio());
      assert.ok(paused.time>=beforePause.time);
      await page.locator('#sound').click();
      await page.waitForFunction(t=>window.__xiangmetaAudio().playing&&window.__xiangmetaAudio().time>t+.2,paused.time,{timeout:15000});
      await page.locator('[data-region="ai-mountain"]').click();
      const reentry=await page.evaluate(()=>window.__xiangmetaAudio());
      assert.equal(reentry.track,'season-winter-v1');assert.equal(reentry.heard.length,4);assert.ok(reentry.time>=paused.time);
      await page.screenshot({path:`artifacts/web/${name}-music.png`});
      await page.locator('#sound').click();
      checkpoint('Opt-in MP3 playback, all four seasons, pause/resume and no replay on re-entry passed');
      for(const [project,parameter] of [['bubble-lab','saturation'],['sonoluminescence','drive']]){
        await page.locator('#collections').click();await page.locator(`[data-exhibit="${project}"]`).click();
        await page.waitForFunction(()=>document.querySelector('#research-radius')?.getAttribute('d')?.length>100,null,{timeout:15000});
        const curve=await page.locator('#research-radius').getAttribute('d');
        await page.locator(`[data-parameter="${parameter}"]`).focus();await page.keyboard.press('ArrowRight');
        await page.waitForFunction(previous=>document.querySelector('#research-radius')?.getAttribute('d')!==previous,curve,{timeout:15000});
        await page.keyboard.press('Escape');await page.keyboard.press('Escape');
      }
      checkpoint('Both research Workers respond to parameter changes');
      const catalog=JSON.parse(await readFile(path.join(root,'content/world.json'),'utf8'));
      for(const m of catalog.modules){
        await page.locator('#collections').click();await page.locator(`[data-exhibit="${m.id}"]`).click();
        await page.locator('#visit').click();await page.keyboard.press('Escape');
        await page.waitForFunction(title=>document.querySelector('#interaction-prompt:not([hidden]) .nearby-copy b')?.textContent===title,m.portfolio.name,{timeout:15000});
        const actions=await page.locator('#interaction-prompt [data-near-key]').evaluateAll(elements=>elements.map(el=>({
          key:el.dataset.nearKey,label:el.textContent.trim().replace(/^[FER]\s+|\s*↗$/g,''),href:el.getAttribute('href')
        })));
        const demo=m.portfolio.demo??m.link;
        assert.deepEqual(actions.map(a=>a.key),demo?['F','E','R']:['F','E'],m.id);
        assert.equal(actions[0].label,m.portfolio.github?'GitHub':'打开展览',m.id);
        assert.equal(actions[0].href,m.portfolio.github??null,m.id);
        if(demo)assert.equal(actions[2].href,demo,m.id);
        const sign=await page.evaluate(id=>window.__xiangmetaInspect().stations.find(s=>s.id===id).hint,m.id);
        assert.equal(sign,actions.map(a=>`[${a.key}] ${a.label}`).join('   ·   '),`${m.id}: physical sign and HUD agree`);
        assert.equal(await page.locator('#nearby kbd').innerText(),'F');
        if(!m.portfolio.github){
          await page.keyboard.press('KeyF');await page.locator('#inspector[open].product-mode').waitFor();
          assert.equal(await page.locator('#panel-title').textContent(),m.title);
          await page.keyboard.press('Escape');await page.keyboard.press('Escape');
          await page.locator('#interaction-prompt [data-near-key="E"]').click();
          await page.locator('#inspector[open]:not(.product-mode)').waitFor();
          assert.equal(await page.locator('#panel-title').textContent(),m.title);
          await page.keyboard.press('Escape');await page.keyboard.press('Escape');
          if(m.id==='bubble-lab'){
            for(const selector of ['#nearby','#interaction-prompt [data-near-key="F"]']){
              await page.locator(selector).click();await page.locator('#inspector[open].product-mode').waitFor();
              assert.equal(await page.locator('#panel-title').textContent(),m.title);
              await page.keyboard.press('Escape');await page.keyboard.press('Escape');
            }
            await page.screenshot({path:`artifacts/web/${name}-interaction-hints.png`});
          }
        }
      }
      await page.locator('#harbor-open').click();await page.locator('#harbor-visit').click();
      await page.keyboard.press('Escape');
      await page.waitForFunction(()=>document.querySelector('#interaction-prompt:not([hidden]) .nearby-copy b')?.textContent==='海风港口',null,{timeout:15000});
      assert.deepEqual(await page.locator('#interaction-prompt kbd').allTextContents(),['F']);
      assert.match(await page.locator('#interaction-prompt').innerText(),/查看航线/);
      await page.keyboard.press('KeyE');await page.keyboard.press('KeyR');
      assert.equal(await page.locator('#inspector[open]').count(),0);
      await page.keyboard.press('KeyF');await page.locator('#inspector[open][data-kind="harbor"]').waitFor();
      await page.keyboard.press('Escape');await page.keyboard.press('Escape');
      checkpoint('All 10 sign/HUD key lists match; no-repository F, E, HUD clicks and harbor actions passed');
      const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
      const mp=await mobile.newPage(),mobileRequests=[];mp.on('request',r=>mobileRequests.push(r.url()));
      await mp.goto(url(''));await mp.locator('.hero').waitFor();
      assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await mp.goto(url('world/'));await mp.getByRole('link',{name:'View Projects'}).waitFor();
      assert.ok(!mobileRequests.some(u=>/three-|main-.*\.js/.test(u)));
      await mp.getByRole('link',{name:'View Projects'}).click();await mp.locator('.project-card').first().waitFor();
      assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await mp.screenshot({path:`artifacts/web/${name}-mobile.png`,fullPage:true});
      await mobile.close();
      const noWebGL=await browser.newContext();
      await noWebGL.addInitScript(()=>{
        const getContext=HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext=function(type,...args){
          return String(type).includes('webgl')?null:getContext.call(this,type,...args);
        };
      });
      const fp=await noWebGL.newPage();
      await fp.goto(url('world/'));await fp.locator('.render-error').waitFor();
      await fp.getByRole('link',{name:'继续浏览全部项目 →'}).click();
      await fp.locator('.project-card').first().waitFor();
      assert.equal(await fp.locator('.project-card').count(),10);
      await noWebGL.close();
      assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
      assert.ok(!requests.some(u=>/\.mp4|\/api\/|audio\/manifest/.test(u)));
      assert.ok(requests.filter(u=>u.endsWith('.mp3')).every(u=>u.includes('/assets/music/')));
      checkpoint('Mobile and WebGL fallback passed; no HTTP/page errors, unapproved media or API requests');
      results.push({engine:name,status:'passed',checks:['landing isolated','filters/search/refresh','music links','3D boot','distant cover previews','fixed HUD','clear keys','walk/jump','E About','F GitHub','photo E','G memory','R music','map','opt-in BGM','four seasons','pause/resume/re-entry','research Workers','10 matching station hints','F without GitHub','mouse/keyboard consistency','harbor actions','mobile fallback','WebGL fallback'],requests:requests.length});
    }finally{await browser.close();}
  }
  await writeFile('artifacts/web/results.json',JSON.stringify({base,results},null,2));
  console.log(JSON.stringify(results,null,2));
}finally{server.close();}
