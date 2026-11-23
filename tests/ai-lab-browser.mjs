import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {staticServer} from './ai-lab-server.mjs';
const baseline=JSON.parse(await readFile('tests/fixtures/ai-lab/baseline.json','utf8'));
const base=process.env.BASE_PATH||'/',server=process.env.AI_LAB_ORIGIN?undefined:await staticServer(process.env.AI_LAB_DIST||'dist',base);
const origin=process.env.AI_LAB_ORIGIN||server.origin;
const url=route=>origin+base+route,artifacts=process.env.AI_LAB_ARTIFACTS||'artifacts/ai-lab';
await mkdir(artifacts,{recursive:true});
const evidence={browser:'',origin,base,checks:[],errors:[],failures:[],warnings:[]};
const graphics=process.platform==='darwin'?['--use-angle=metal','--enable-gpu','--ignore-gpu-blocklist']:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];
const browser=await chromium.launch({headless:true,args:[...graphics,'--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
evidence.browser=browser.version();
const maximum=(a,b)=>Math.max(...a.map((x,i)=>Math.abs(x-b[i])));
function monitor(page){
  page.on('pageerror',error=>evidence.errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)evidence.failures.push(`${response.status()} ${response.url()}`);});
  page.on('console',message=>{if(message.type()==='warning'&&evidence.warnings.length<20)evidence.warnings.push(message.text());});
}
const ready=scope=>scope.locator('#model-status[data-state=ready]').waitFor({timeout:120000});
const done=scope=>scope.locator('#run-status').filter({hasText:'已完成本地推理'}).waitFor({timeout:120000});
const shot=(page,name)=>page.screenshot({path:`${artifacts}/${name}.png`,fullPage:true});
async function inferGift(page,scope=page){
  await ready(scope);await scope.locator('#run').click();await done(scope);
  const frame=scope===page?page:page.frames().find(f=>f.url().includes('/ai-lab/'));
  const result=await frame.evaluate(()=>window.__aiLabLastResult);
  assert.ok(Math.abs(result.result.raw-baseline.gift[0].raw)<1e-14);
  return result;
}
async function inferExpression(page,scope=page,image='tests/fixtures/ai-lab/expression-rgb.png'){
  await ready(scope);await scope.locator('#image-file').setInputFiles(image);await scope.locator('#run').waitFor();
  await scope.locator('#run').click();await done(scope);
  const frame=scope===page?page:page.frames().find(f=>f.url().includes('/ai-lab/'));
  const result=await frame.evaluate(()=>window.__aiLabLastResult);
  return {tensorError:maximum(result.result.input,baseline.expression.input),probabilityError:maximum(result.result.probabilities,baseline.expression.probabilities),probabilities:result.result.probabilities,seconds:result.milliseconds/1000};
}
try{
  const context=await browser.newContext({viewport:{width:1360,height:1000}});
  const page=await context.newPage();monitor(page);
  const requested=[];page.on('request',request=>requested.push(request.url()));
  if(!process.env.AI_LAB_ONLY_TEST){
    await page.goto(url(''));
    await page.locator('.hero').waitFor();
    assert.equal(requested.filter(u=>/ai-lab\/.*\.(bin|onnx|json)/.test(u)).length,0);
    assert.ok(await page.getByRole('link',{name:'AI Lab',exact:true}).isVisible());
  }
  await page.goto(url('ai-lab/?inspect'));
  const gift=await inferGift(page);assert.equal(requested.some(u=>u.includes('/verse-v1/')||u.includes('/expression-v3/')),false);
  evidence.checks.push({name:'standalone-gift',input:baseline.gift[0],output:gift.result,seconds:gift.milliseconds/1000,lazyLoading:true});
  await shot(page,'desktop-gift');
  await page.locator('[data-project=expression-recognition-cnn]').click();
  const cnn=await inferExpression(page);assert.equal(cnn.tensorError,0);assert.ok(cnn.probabilityError<1e-5);
  evidence.checks.push({name:'standalone-cnn-lossless',...cnn});await shot(page,'desktop-expression');
  const jpeg=await inferExpression(page,page,'tests/fixtures/model-inputs/expression.jpg');
  assert.ok(jpeg.tensorError<=1/255+1e-7);assert.ok(jpeg.probabilityError<.01);
  evidence.checks.push({name:'standalone-cnn-jpeg',...jpeg});
  // Permission denial and cleanup are tested through actual browser permissions.
  await context.grantPermissions(['camera']);
  await page.locator('#camera').click();await page.locator('#capture').waitFor();
  await page.evaluate(()=>{window.__cameraTrack=document.querySelector('#camera-preview').srcObject.getVideoTracks()[0];});
  await page.locator('#capture').click();
  assert.equal(await page.evaluate(()=>window.__cameraTrack.readyState),'ended');
  assert.deepEqual((await page.evaluate(()=>window.__aiLabInspect())).camera,[]);
  await page.locator('#run').click();await done(page);
  evidence.checks.push({name:'camera-capture-local-inference',result:(await page.evaluate(()=>window.__aiLabLastResult)).result.probabilities});
  await page.locator('#camera').click();await page.locator('#capture').waitFor();
  await page.evaluate(()=>{window.__cameraTrack=document.querySelector('#camera-preview').srcObject.getVideoTracks()[0];});
  await page.locator('[data-project=blind-verse-rnn]').click();
  assert.equal(await page.evaluate(()=>window.__cameraTrack.readyState),'ended');
  assert.deepEqual((await page.evaluate(()=>window.__aiLabInspect())).camera,[]);
  await ready(page);
  const states=await page.evaluate(tokens=>window.__aiLabRun({type:'steps',tokens}),baseline.poetry.tokens);
  let stateError=0;
  states.result.states.forEach((state,i)=>{for(const name of ['logits','hidden','cell'])stateError=Math.max(stateError,maximum(state[name],baseline.poetry.steps[i][name]));});
  assert.ok(stateError<1e-4);
  evidence.checks.push({name:'rnn-five-step-parity',stateError,seconds:states.milliseconds/1000});
  for(const sample of baseline.poetry.generation){
    const generated=await page.evaluate(sample=>window.__aiLabRun({type:'verse',...sample}),sample);
    assert.deepEqual(generated.result.lines,sample.lines);assert.deepEqual(generated.result.tokenIds,sample.tokenIds);
    evidence.checks.push({name:'rnn-original-decoding',input:{seed:sample.seed,mode:sample.mode,prefix:sample.prefix},output:generated.result,seconds:generated.milliseconds/1000});
  }
  await page.locator('#prefix').fill('山月');await page.locator('#run').click();await done(page);
  assert.match(await page.locator('#verse-line-0').textContent(),/^山月/);
  await page.locator('#save-poem').click();await page.locator('#favorites').click();assert.ok(await page.locator('#favorite-lines p').count()>0);
  await shot(page,'desktop-verse');
  await page.reload();await ready(page);assert.equal((await page.evaluate(()=>window.__aiLabInspect())).project,'blind-verse-rnn');
  const before=requested.length;
  await context.setOffline(true);await page.locator('[data-project=expression-recognition-cnn]').click();
  // Metadata is not persistently cached: offline inference is not promised.
  await page.locator('#model-status[data-state=error]').waitFor();await context.setOffline(false);
  await page.locator('#retry-model').click();await ready(page);assert.ok(requested.length>before);
  evidence.checks.push({name:'offline-load-failure-and-retry',passed:true});
  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mobilePage=await mobile.newPage();monitor(mobilePage);
  await mobilePage.goto(url('ai-lab/?inspect'));await inferGift(mobilePage);
  assert.equal(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await shot(mobilePage,'mobile-gift');
  await mobilePage.locator('[data-project=expression-recognition-cnn]').click();await inferExpression(mobilePage);await shot(mobilePage,'mobile-expression');
  await mobilePage.locator('[data-project=blind-verse-rnn]').click();await ready(mobilePage);await mobilePage.locator('#run').click();await done(mobilePage);await shot(mobilePage,'mobile-verse');
  assert.equal(await mobilePage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  evidence.checks.push({name:'mobile-all-three-local-inference',passed:true,viewport:'390×844'});
  await mobile.close();
  // Fake UI forces allow regardless of permissions. Use another browser without
  // that launch flag, while keeping a synthetic camera device for this test.
  const denyBrowser=await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream']});
  try{
    const denied=await denyBrowser.newContext(),deniedPage=await denied.newPage();
    await deniedPage.goto(url('ai-lab/?project=expression-recognition-cnn&inspect'));await ready(deniedPage);
    const cdp=await denied.newCDPSession(deniedPage),{targetInfo}=await cdp.send('Target.getTargetInfo');
    await cdp.send('Browser.setPermission',{permission:{name:'camera'},setting:'denied',origin,browserContextId:targetInfo.browserContextId});
    assert.equal(await deniedPage.evaluate(async()=>(await navigator.permissions.query({name:'camera'})).state),'denied');
    await deniedPage.locator('#camera').click();await deniedPage.locator('#image-status').filter({hasText:'权限被拒绝'}).waitFor();
    evidence.checks.push({name:'camera-permission-denied',passed:true});
  }finally{await denyBrowser.close();}
  const broken=await browser.newContext(),brokenPage=await broken.newPage();
  const modelURL='**/expression-v3/ensemble.onnx*';
  await broken.route(modelURL,route=>route.fulfill({status:200,body:Buffer.alloc(5457394)}));
  await brokenPage.goto(url('ai-lab/?project=expression-recognition-cnn&inspect'));
  await brokenPage.locator('#model-status').filter({hasText:'校验失败'}).waitFor();
  assert.equal((await brokenPage.evaluate(()=>window.__aiLabInspect())).ready,false);
  await broken.unroute(modelURL);await brokenPage.locator('#retry-model').click();
  const recovered=await inferExpression(brokenPage);assert.ok(recovered.probabilityError<1e-5);
  evidence.checks.push({name:'corrupt-model-rejected-and-retry',passed:true});await broken.close();
  if(!process.env.AI_LAB_ONLY_TEST){
    await page.goto(url('world/?project=recommendation&inspect'));
    await page.locator('#world canvas').waitFor({timeout:90000});
    await page.waitForFunction(()=>typeof window.__xiangmetaInspect==='function',null,{timeout:90000});
    const worldURL=page.url();let popup=0;page.on('popup',()=>popup++);
    const original=await page.evaluate(()=>window.__xiangmetaInspect());
    assert.equal(original.foundations,5);assert.equal(original.stations.length,10);
    const scope=page.frameLocator('#ai-lab-host iframe');
    for(const [moduleId,id] of [['recommendation','gift-chooser'],['emotion-recognition','expression-recognition-cnn'],['poetry','blind-verse-rnn']]){
      await page.evaluate(id=>{const s=window.__xiangmetaInspect().stations.find(s=>s.id===id);window.__xiangmetaWalk(s.approach.x,s.approach.z,s.x,s.z);},moduleId);
      await page.locator('[data-near-key=F]').waitFor({timeout:30000});
      const before=await page.evaluate(()=>window.__xiangmetaInspect());
      await page.locator('[data-near-key=F]').click();await ready(scope);
      const frame=page.frames().find(f=>f.url().includes('/ai-lab/'));
      await frame.waitForFunction(id=>window.__aiLabInspect().project===id,id);
      if(id==='gift-chooser')await inferGift(page,scope);
      else if(id==='expression-recognition-cnn')await inferExpression(page,scope);
      else{await scope.locator('#prefix').fill('月');await scope.locator('#run').click();await done(scope);}
      assert.equal(page.url(),worldURL);assert.equal(popup,0);
      const held=await page.evaluate(()=>window.__xiangmetaInspect());
      assert.deepEqual(held.player,before.player);assert.equal(held.yaw,before.yaw);assert.equal(held.pitch,before.pitch);
      // Focused typing in the iframe must not send WASD to the paused world.
      await frame.locator(id==='blind-verse-rnn'?'#prefix':'#run').focus();
      await page.keyboard.press('w');
      assert.deepEqual((await page.evaluate(()=>window.__xiangmetaInspect())).player,before.player);
      await frame.evaluate(()=>scrollTo(0,0));
      await shot(page,`world-${id}`);
      if(id==='expression-recognition-cnn'){
        await scope.locator('#camera').click();await scope.locator('#capture').waitFor();
        await frame.evaluate(()=>{window.__cameraTrack=document.querySelector('#camera-preview').srcObject.getVideoTracks()[0];});
      }
      await page.keyboard.press('Escape');await page.locator('#inspector').waitFor({state:'hidden'});
      await frame.waitForFunction(()=>!window.__aiLabInspect().active);
      assert.deepEqual((await frame.evaluate(()=>window.__aiLabInspect())).camera,[]);
      if(id==='expression-recognition-cnn')assert.equal(await frame.evaluate(()=>window.__cameraTrack.readyState),'ended');
      evidence.checks.push({name:`world-${id}`,parentNavigation:false,popup:false,statePreserved:true,escape:true});
    }
    // Same iframe persists and has one worker for the currently selected model.
    assert.equal(await page.locator('#ai-lab-host iframe').count(),1);
    const downloads=requested.filter(u=>u.includes('/verse-v1/')).length;
    for(let i=0;i<2;i++){
      await page.locator('[data-near-key=F]').click();await ready(scope);
      const frame=page.frames().find(f=>f.url().includes('/ai-lab/'));
      await frame.waitForFunction(()=>window.__aiLabInspect().active);
      await scope.locator('#prefix').fill('山月');
      await scope.locator('#run').click();await done(scope);
      await page.locator('#close-panel').click();await page.locator('#inspector').waitFor({state:'hidden'});
    }
    assert.equal(requested.filter(u=>u.includes('/verse-v1/')).length,downloads);
    evidence.checks.push({name:'repeat-open-reuses-session-without-model-download',passed:true});
    await page.locator('#world canvas').focus();const start=await page.evaluate(()=>window.__xiangmetaInspect().player);
    await page.keyboard.down('s');await page.waitForFunction(p=>{const current=window.__xiangmetaInspect().player;return Math.hypot(current.x-p.x,current.z-p.z)>.2},start);await page.keyboard.up('s');
    evidence.checks.push({name:'world-keyboard-control-restored',passed:true});
    const yaw=await page.evaluate(()=>window.__xiangmetaInspect().yaw);
    // Chrome can temporarily reject pointer lock after Escape. The existing
    // drag-to-look fallback must still work immediately on return.
    await page.evaluate(()=>document.pointerLockElement&&document.exitPointerLock());
    await page.waitForFunction(()=>!document.pointerLockElement);
    const canvasBox=await page.locator('#world canvas').boundingBox();
    await page.mouse.move(canvasBox.x+500,canvasBox.y+300);await page.mouse.down();
    await page.mouse.move(canvasBox.x+560,canvasBox.y+300);await page.mouse.move(canvasBox.x+620,canvasBox.y+300);await page.mouse.up();
    assert.notEqual(await page.evaluate(()=>window.__xiangmetaInspect().yaw),yaw);
    evidence.checks.push({name:'world-mouse-look-restored',passed:true});
    const early=await context.newPage();monitor(early);
    let release,requestReached;
    const gate=new Promise(resolve=>{release=resolve;}),reached=new Promise(resolve=>{requestReached=resolve;});
    await early.route(u=>u.pathname===base+'ai-lab/',async route=>{requestReached();await gate;await route.continue();});
    await early.goto(url('world/?project=recommendation&inspect'));
    await early.locator('[data-near-key=F]').waitFor({timeout:90000});await early.locator('[data-near-key=F]').click();
    await reached;await early.locator('#close-panel').click();release();
    const ef=early.frameLocator('#ai-lab-host iframe');
    await ef.locator('#model-status').waitFor({state:'attached'});
    const earlyFrame=early.frames().find(f=>f.url().includes('/ai-lab/'));
    await earlyFrame.waitForFunction(()=>!window.__aiLabInspect().active&&!window.__aiLabInspect().ready);
    evidence.checks.push({name:'close-before-iframe-load-stops-initialization',passed:true});await early.close();
    const worldMobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const mp=await worldMobile.newPage();monitor(mp);await mp.goto(url('world/?project=recommendation&inspect'));
    await mp.locator('[data-near-key=F]').waitFor({timeout:90000});await mp.locator('[data-near-key=F]').tap();
    const ms=mp.frameLocator('#ai-lab-host iframe');await inferGift(mp,ms);
    const mobileFrame=mp.frames().find(f=>f.url().includes('/ai-lab/'));
    await mobileFrame.evaluate(()=>document.querySelector('#gift-result').scrollIntoView({block:'start'}));await shot(mp,'world-mobile-gift');
    assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const mf=mp.frames().find(f=>f.url().includes('/ai-lab/'));assert.equal(await mf.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await mp.locator('#close-panel').tap();await mp.locator('#inspector').waitFor({state:'hidden'});
    assert.ok(await mp.locator('#touch-controls').isVisible());
    const joystick=mp.locator('#touch-joystick'),box=await joystick.boundingBox(),initial=await mp.evaluate(()=>window.__xiangmetaInspect().player);
    const point={x:box.x+box.width/2,y:box.y+box.height/2};
    await joystick.dispatchEvent('pointerdown',{pointerId:75,pointerType:'touch',button:0,buttons:1,clientX:point.x,clientY:point.y});
    await joystick.dispatchEvent('pointermove',{pointerId:75,pointerType:'touch',buttons:1,clientX:point.x,clientY:point.y-30});
    await mp.waitForFunction(p=>{const next=window.__xiangmetaInspect().player;return Math.hypot(next.x-p.x,next.z-p.z)>.15},initial);
    await joystick.dispatchEvent('pointerup',{pointerId:75,pointerType:'touch',button:0,clientX:point.x,clientY:point.y-30});
    await worldMobile.close();
    evidence.checks.push({name:'world-mobile-embed',passed:true,viewport:'390×844'});
  }
  assert.deepEqual(evidence.errors,[]);
  // Expected offline and permission rejection are not failed asset responses.
  assert.deepEqual(evidence.failures,[]);
  console.log(JSON.stringify(evidence,null,2));
}finally{
  await writeFile(`${artifacts}/evidence.json`,JSON.stringify(evidence,null,2)+'\n');
  await browser.close();await server?.close();
}
