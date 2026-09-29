import './web-loading.css';
import {sitePath} from './core/portfolio';
const app=document.querySelector('#app')!;
async function start(){
  app.innerHTML=`<div class="web-loading"><span class="loading-symbol">✳</span><h1>XiangMeta</h1><p>正在加载世界程序…</p><progress aria-label="加载世界程序"></progress><small>首次加载需准备 3D 引擎，完成后开始构建群岛。</small><div class="loading-actions"><a href="${sitePath('projects/')}">浏览项目 →</a></div></div>`;
  try{await import('./main');}
  catch{app.innerHTML=`<div class="web-loading"><h1>世界暂时未能加载</h1><p>请检查网络后重试，也可以继续浏览项目。</p><div class="loading-actions"><button id="world-retry">重新加载</button><a href="${sitePath('projects/')}">View Projects →</a></div></div>`;document.querySelector<HTMLButtonElement>('#world-retry')!.onclick=()=>location.reload();}
}
if(matchMedia('(pointer: coarse)').matches&&matchMedia('(max-width: 900px)').matches){
  app.innerHTML=`<div class="web-loading"><span class="loading-symbol">✳</span><h1>把世界留给大屏幕。</h1><p>Desktop experience recommended</p><p>手机上也能完整浏览项目、科研与音乐。第一人称探索建议使用键盘和鼠标。</p><div class="loading-actions"><a href="${sitePath('projects/')}">View Projects →</a><button id="try-world">仍然加载 3D 世界</button></div></div>`;
  document.querySelector<HTMLButtonElement>('#try-world')!.onclick=()=>void start();
}else void start();
