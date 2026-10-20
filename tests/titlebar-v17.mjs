import {_electron as electron} from 'playwright';import assert from 'node:assert/strict';import path from 'node:path';
const app=await electron.launch({executablePath:path.resolve('node_modules/electron/dist/electron.exe'),args:['.','--enable-unsafe-swiftshader'],env:{...process.env,XIANGMETA_TEST:'1',XIANGMETA_TEST_PORT:'4320',XIANGMETA_TEST_PROFILE:path.resolve('artifacts/titlebar-v17-profile')}});
try{const page=await app.firstWindow();await page.locator('#world canvas').waitFor();
 for(const [width,height] of [[1500,960],[900,650]]){
  await app.evaluate(({BrowserWindow},[w,h])=>BrowserWindow.getAllWindows()[0].setSize(w,h),[width,height]);
  await page.waitForTimeout(200);const layout=await page.evaluate(()=>{const b=document.querySelector('.desktop-titlebar').getBoundingClientRect(),a=document.querySelector('#app').getBoundingClientRect();return {bar:b.height,top:a.top,bottom:a.bottom,viewport:innerHeight,color:getComputedStyle(document.querySelector('.desktop-titlebar')).backgroundColor,scroll:getComputedStyle(document.querySelector('.sidebar')).scrollbarColor};});
  assert.equal(layout.bar,32);assert.equal(layout.top,32);assert.ok(Math.abs(layout.bottom-layout.viewport)<2);assert.equal(layout.color,'rgb(14, 26, 32)');assert.equal(await app.evaluate(({nativeTheme})=>nativeTheme.shouldUseDarkColors),true);await page.screenshot({path:`artifacts/v17-desktop-${width}.png`});
 }console.log('PASS: dark native overlay, 32px drag bar, no cropped viewport at normal/minimum window sizes');
}finally{await app.close();}
