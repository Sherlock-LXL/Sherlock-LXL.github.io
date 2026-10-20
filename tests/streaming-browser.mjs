import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {createServer} from '../backend/server.mjs';
import {releaseMouse} from './input-helpers.mjs';
import {writeFile} from 'node:fs/promises';
const service=await createServer({port:0}),browser=await chromium.launch({channel:'msedge',headless:true,args:['--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1400,height:900}}),report=[];
try{
 await page.goto(service.url);await page.locator('#world canvas').waitFor();
 for(const id of ['poetry','xianglm']){
  await page.locator('#collections').click();await page.locator(`[data-exhibit="${id}"]`).click();await page.locator('#use-product').click();
  if(id==='poetry'){await page.locator('#field-mode').selectOption('前缀续写');await page.locator('#field-prefix').fill('春');}else await page.locator('#field-prompt').fill('你好，请介绍一下你自己。');
  const start=Date.now();await page.locator('#module-form button[type="submit"]').click();await page.locator('#model-result.streaming').waitFor({timeout:90000});const first=await page.locator('#model-result').textContent(),firstMs=Date.now()-start;assert.ok(!first.includes('�'));
  await page.screenshot({path:`artifacts/streaming-${id}.png`});await page.locator('#model-result.success').waitFor({timeout:90000});const final=await page.locator('#model-result').textContent();assert.ok(final.length>=first.length);assert.ok(!final.includes('�'));report.push({id,firstMs,totalMs:Date.now()-start,first,final});
  await page.keyboard.press('Escape');await releaseMouse(page);
 }
 await writeFile('artifacts/streaming-browser-report.json',JSON.stringify(report,null,2));console.log('PASS: real local poetry and XiangLM update the product UI before generation completes, correct Unicode and final text');
}finally{await browser.close();service.server.closeAllConnections();await new Promise(r=>service.server.close(r));}
