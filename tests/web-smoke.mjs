import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {loadCatalog} from '../backend/catalog.mjs';
import {LivingNavigation} from '../shared/living-navigation.mjs';

const root=path.resolve('dist');
const configuredBase=process.env.BASE_PATH||'/';
const base=`/${configuredBase.replace(/^\/|\/$/g,'')}${configuredBase==='/'?'':'/'}`;
const mime={
  '.css':'text/css','.html':'text/html','.jpeg':'image/jpeg','.jpg':'image/jpeg',
  '.js':'text/javascript','.json':'application/json','.mp3':'audio/mpeg',
  '.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp',
};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://local').pathname);
    if(!pathname.startsWith(base))throw new Error('outside base');
    let file=path.resolve(root,pathname.slice(base.length)||'index.html');
    if(!file.startsWith(`${root}${path.sep}`)&&file!==root)throw new Error('outside root');
    if((await stat(file)).isDirectory())file=path.join(file,'index.html');
    res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');
    res.end(await readFile(file));
  }catch{
    res.statusCode=404;
    res.end('Not found');
  }
});

await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const url=route=>`${origin}${base}${route}`;
const browser=await chromium.launch({
  headless:true,
  args:['--disable-crash-reporter','--disable-breakpad'],
});

try{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  const page=await context.newPage();
  const errors=[],failures=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{
    if(response.status()>=400)failures.push(`${response.status()} ${response.url()}`);
  });

  await page.goto(url(''));
  await page.locator('.hero').waitFor({timeout:15000});
  assert.ok(await page.getByRole('link',{name:'View Projects',exact:false}).isVisible());
  assert.equal(await page.getByRole('link',{name:'Jiahui Teaching Studio'}).getAttribute('href'),`${base}jiahui/`);
  for(const javaScriptEnabled of [true,false]){
    const entryContext=await browser.newContext({javaScriptEnabled});
    const destination='https://jiahui-teaching-studio.18616246261.workers.dev/';
    await entryContext.route(destination,route=>route.fulfill({contentType:'text/html',body:'<title>Teaching Studio destination</title>'}));
    try{
      const entryPage=await entryContext.newPage();
      await entryPage.goto(url('jiahui/'));
      await entryPage.waitForURL(destination,{timeout:15000});
      assert.equal(await entryPage.title(),'Teaching Studio destination');
    }finally{await entryContext.close();}
  }

  await page.getByRole('link',{name:'View Projects',exact:false}).click();
  await page.locator('.project-card').first().waitFor({timeout:15000});
  const githubHref=await page.locator('.project-card a[href^="https://github.com/"]').first().getAttribute('href');
  assert.match(githubHref??'',/^https:\/\/github\.com\/Sherlock-LXL\//);

  await page.goto(url('world/?project=xianglm&inspect'));
  await page.locator('#world-loading').waitFor({state:'hidden',timeout:75000});
  await page.locator('#world canvas').waitFor({state:'visible',timeout:15000});
  await page.waitForFunction(()=>Number(document.querySelector('#world')?.dataset.previewReady)>0,null,{timeout:30000});
  await page.locator('#interaction-prompt a[href="https://github.com/Sherlock-LXL/xianglm"]').waitFor({timeout:30000});
  assert.equal(await page.locator('.brand-symbol svg.brand-mark').count(),1);
  assert.equal((await page.locator('.brand-symbol').textContent()).trim(),'');
  assert.equal(await page.locator('#app').evaluate(element=>element.classList.contains('world-booting')),false);
  assert.equal(await page.locator('[data-park],[data-mini-park]').count(),0);
  const inspected=await page.evaluate(()=>window.__xiangmetaInspect());
  assert.equal(inspected.foundations,5);
  assert.equal(inspected.living.animals.length,10);
  assert.equal(inspected.living.items.length,16);
  assert.equal(inspected.resonance.total,4);
  assert.deepEqual({birds:inspected.ambient.flyingBirds,perched:inspected.ambient.perchedBirds,fish:inspected.ambient.fish,boats:inspected.ambient.boats},{birds:10,perched:3,fish:4,boats:3});
  assert.ok(inspected.ambient.fishBoatBuffer>7);
  assert.ok(inspected.ambient.routeGap>6);
  assert.ok(inspected.ambient.minBoatSeparation>12);
  assert.ok(Math.max(...inspected.ambient.boatScales)>=1.5);
  assert.ok(inspected.harbor.boatPosition[2]>inspected.harbor.deckEnd+3);
  assert.ok(inspected.harbor.boatScale>1);
  assert.ok(inspected.harbor.tenderScale>=1);
  assert.ok(inspected.harbor.tenderPosition[2]>inspected.harbor.deckEnd+2);
  assert.ok(Math.abs(inspected.harbor.boatYaw)<.01);
  await page.waitForFunction(()=>window.__xiangmetaInspect().signatures.some(effect=>effect.kind==='tokens'&&effect.activity>.4));
  await context.close();

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mobilePage=await mobile.newPage();
  await mobilePage.goto(url(''));
  await mobilePage.getByRole('link',{name:'Jiahui Teaching Studio'}).waitFor();
  assert.equal(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await mobilePage.goto(url('world/?inspect'));
  await mobilePage.locator('#world canvas').waitFor({timeout:75000});
  await mobilePage.waitForFunction(()=>typeof window.__xiangmetaInspect==='function',null,{timeout:75000});
  await mobilePage.locator('#touch-controls').waitFor();
  const joystick=mobilePage.locator('#touch-joystick'),joystickBox=await joystick.boundingBox();
  assert.ok(joystickBox);
  const joystickCenter={x:joystickBox.x+joystickBox.width/2,y:joystickBox.y+joystickBox.height/2};
  const start=await mobilePage.evaluate(()=>window.__xiangmetaInspect().player);
  await joystick.dispatchEvent('pointerdown',{pointerId:31,pointerType:'touch',button:0,buttons:1,clientX:joystickCenter.x,clientY:joystickCenter.y});
  await joystick.dispatchEvent('pointermove',{pointerId:31,pointerType:'touch',buttons:1,clientX:joystickCenter.x,clientY:joystickCenter.y-38});
  await mobilePage.waitForFunction(p=>{const v=window.__xiangmetaInspect().player;return Math.hypot(v.x-p.x,v.z-p.z)>.4},start);
  await joystick.dispatchEvent('pointerup',{pointerId:31,pointerType:'touch',button:0,clientX:joystickCenter.x,clientY:joystickCenter.y-38});
  await mobilePage.locator('#touch-jump').dispatchEvent('pointerdown',{pointerId:32,pointerType:'touch',button:0,buttons:1});
  await mobilePage.waitForFunction(()=>!window.__xiangmetaInspect().player.grounded);
  await mobilePage.waitForFunction(()=>window.__xiangmetaInspect().player.grounded);
  const canvas=mobilePage.locator('#world canvas');
  await joystick.dispatchEvent('pointerdown',{pointerId:40,pointerType:'touch',button:0,buttons:1,clientX:joystickCenter.x,clientY:joystickCenter.y});
  await joystick.dispatchEvent('pointermove',{pointerId:40,pointerType:'touch',buttons:1,clientX:joystickCenter.x,clientY:joystickCenter.y-38});
  await canvas.dispatchEvent('pointerdown',{pointerId:41,pointerType:'touch',button:0,buttons:1,clientX:300,clientY:350});
  await mobilePage.evaluate(()=>window.dispatchEvent(new PointerEvent('pointermove',{pointerId:41,pointerType:'touch',buttons:1,clientX:270,clientY:350})));
  const dragYaw=await mobilePage.evaluate(()=>window.__xiangmetaInspect().yaw);
  await joystick.dispatchEvent('pointermove',{pointerId:40,pointerType:'touch',buttons:1,clientX:joystickCenter.x+20,clientY:joystickCenter.y-32});
  assert.equal(await mobilePage.evaluate(()=>window.__xiangmetaInspect().yaw),dragYaw);
  await mobilePage.evaluate(()=>window.dispatchEvent(new PointerEvent('pointermove',{pointerId:41,pointerType:'touch',buttons:1,clientX:230,clientY:350})));
  assert.notEqual(await mobilePage.evaluate(()=>window.__xiangmetaInspect().yaw),dragYaw);
  await joystick.dispatchEvent('pointerup',{pointerId:40,pointerType:'touch',button:0,clientX:joystickCenter.x+20,clientY:joystickCenter.y-32});
  await mobilePage.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerup',{pointerId:41,pointerType:'touch',clientX:230,clientY:350})));
  assert.ok(await mobilePage.evaluate(()=>window.__xiangmetaInspect().traveler.activeMarks>0));
  assert.equal(await mobilePage.locator('.mini-atlas text').first().evaluate(element=>getComputedStyle(element).display),'none');
  assert.equal(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const regions=(await loadCatalog(process.cwd())).public.regions;
  const touchApproach=async(kind,animal=false)=>{
    const state=await mobilePage.evaluate(()=>window.__xiangmetaInspect()),nav=new LivingNavigation(regions,state.obstacles);
    const target=(animal?state.living.animals:state.living.items).find(o=>o.kind===kind),occupied=[...state.living.items,...state.living.animals];
    const candidates=Array.from({length:32},(_,i)=>({x:target.x+Math.sin(i*Math.PI/16)*(target.radius+.8),z:target.z+Math.cos(i*Math.PI/16)*(target.radius+.8)}));
    const safe=candidates.find(p=>nav.ground(p.x,p.z,.36,null,occupied)!==null&&nav.sight({...p,y:target.y+.5},{...target,y:target.y+.5}));assert.ok(safe);
    await mobilePage.evaluate(({p,t})=>window.__xiangmetaWalk(p.x,p.z,t.x,t.z),{p:safe,t:target});
    await mobilePage.waitForFunction(name=>document.querySelector('#interaction-prompt b')?.textContent===name,target.name);
  };
  await touchApproach('conch');
  await mobilePage.locator('[data-living-key="Q"]').tap();
  await mobilePage.waitForFunction(()=>window.__xiangmetaInspect().living.carried!==null&&window.__xiangmetaInspect().living.drop!==null);
  await mobilePage.locator('[data-living-key="Q"]').tap();
  await mobilePage.waitForFunction(()=>window.__xiangmetaInspect().living.carried===null);
  await touchApproach('tortoise',true);await mobilePage.locator('[data-living-key="Q"]').tap();
  await mobilePage.waitForFunction(()=>window.__xiangmetaInspect().living.hearts>0);
  const promptBox=await mobilePage.locator('#interaction-prompt').boundingBox();
  assert.ok(promptBox.x>=0&&promptBox.x+promptBox.width<=390);
  assert.ok(promptBox.y+promptBox.height<joystickBox.y);
  await mobile.close();

  assert.deepEqual(errors,[]);
  assert.deepEqual(failures,[]);
  console.log('Smoke passed: Jiahui entry with and without JavaScript, mobile footer, four-island world, project link, responsive ambience, resonance and mobile movement.');
}finally{
  await browser.close();
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
}
