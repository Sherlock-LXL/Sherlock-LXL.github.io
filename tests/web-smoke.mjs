import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

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

  await page.getByRole('link',{name:'View Projects',exact:false}).click();
  await page.locator('.project-card').first().waitFor({timeout:15000});
  const githubHref=await page.locator('.project-card a[href^="https://github.com/"]').first().getAttribute('href');
  assert.match(githubHref??'',/^https:\/\/github\.com\/Sherlock-LXL\//);

  await page.goto(url('world/?project=xianglm&inspect'));
  await page.locator('#world-loading').waitFor({state:'hidden',timeout:75000});
  await page.locator('#world canvas').waitFor({state:'visible',timeout:15000});
  await page.waitForFunction(()=>Number(document.querySelector('#world')?.dataset.previewReady)>0,null,{timeout:30000});
  await page.locator('#interaction-prompt a[href="https://github.com/Sherlock-LXL/xianglm"]').waitFor({timeout:30000});
  assert.equal(await page.locator('[data-park],[data-mini-park]').count(),0);
  assert.equal(await page.evaluate(()=>window.__xiangmetaInspect().foundations),5);
  assert.equal(await page.evaluate(()=>window.__xiangmetaInspect().resonance.total),4);
  await page.waitForFunction(()=>window.__xiangmetaInspect().signatures.some(effect=>effect.kind==='tokens'&&effect.activity>.4));
  await context.close();

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mobilePage=await mobile.newPage();
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
  await mobile.close();

  assert.deepEqual(errors,[]);
  assert.deepEqual(failures,[]);
  console.log('Smoke passed: four-island world, project link, responsive ambience, resonance and mobile movement.');
}finally{
  await browser.close();
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
}
