import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {webkit} from 'playwright';
import {staticServer} from './ai-lab-server.mjs';
const baseline=JSON.parse(await readFile('tests/fixtures/ai-lab/baseline.json','utf8'));
const server=await staticServer(),browser=await webkit.launch({headless:true});
const evidence={engine:'WebKit',version:browser.version(),checks:[],errors:[]};
const maximum=(a,b)=>Math.max(...a.map((value,i)=>Math.abs(value-b[i])));
await mkdir('artifacts/ai-lab/webkit',{recursive:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  page.on('pageerror',error=>evidence.errors.push(error.message));
  const ready=()=>page.locator('#model-status[data-state=ready]').waitFor({timeout:120000});
  await page.goto(server.origin+'/ai-lab/?inspect');await ready();
  await page.locator('#run').click();await page.locator('#run-status').filter({hasText:'已完成'}).waitFor();
  const gift=await page.evaluate(()=>window.__aiLabLastResult);
  assert.ok(Math.abs(gift.result.raw-baseline.gift[0].raw)<1e-14);
  evidence.checks.push({name:'gift',result:gift.result});
  await page.locator('[data-project=expression-recognition-cnn]').click();await ready();
  await page.locator('#image-file').setInputFiles('tests/fixtures/ai-lab/expression-rgb.png');
  await page.locator('#run').click();await page.locator('#run-status').filter({hasText:'已完成'}).waitFor();
  const cnn=await page.evaluate(()=>window.__aiLabLastResult);
  const tensorError=maximum(cnn.result.input,baseline.expression.input),probabilityError=maximum(cnn.result.probabilities,baseline.expression.probabilities);
  assert.equal(tensorError,0);assert.ok(probabilityError<1e-5);
  evidence.checks.push({name:'cnn',tensorError,probabilityError});
  await page.screenshot({path:'artifacts/ai-lab/webkit/mobile-expression.png',fullPage:true});
  await page.locator('[data-project=blind-verse-rnn]').click();await ready();
  const sample=baseline.poetry.generation[1],generated=await page.evaluate(sample=>window.__aiLabRun({type:'verse',...sample}),sample);
  assert.deepEqual(generated.result.lines,sample.lines);assert.deepEqual(generated.result.tokenIds,sample.tokenIds);
  evidence.checks.push({name:'rnn-seeded-continuation',result:generated.result});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(evidence.errors,[]);
  console.log(JSON.stringify(evidence,null,2));
}finally{
  await writeFile('artifacts/ai-lab/webkit/evidence.json',JSON.stringify(evidence,null,2)+'\n');
  await browser.close();await server.close();
}
