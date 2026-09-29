import './web-loading.css';
import {sitePath} from './core/portfolio';
const app=document.querySelector('#app')!;
const touchExperience=matchMedia('(pointer: coarse) and (max-width: 900px)').matches;
document.documentElement.classList.toggle('touch-experience',touchExperience);
async function start(){
  app.innerHTML=`<div class="web-loading"><span class="loading-symbol">✳</span><h1>XiangMeta</h1><p>正在加载世界程序…</p><progress aria-label="加载世界程序"></progress><small>${touchExperience?'正在准备触控探索界面。':'首次加载需准备 3D 引擎，完成后开始构建群岛。'}</small><div class="loading-actions"><a href="${sitePath('projects/')}">浏览项目 →</a></div></div>`;
  try{await import('./main');}
  catch{app.innerHTML=`<div class="web-loading"><h1>世界暂时未能加载</h1><p>请检查网络后重试，也可以继续浏览项目。</p><div class="loading-actions"><button id="world-retry">重新加载</button><a href="${sitePath('projects/')}">View Projects →</a></div></div>`;document.querySelector<HTMLButtonElement>('#world-retry')!.onclick=()=>location.reload();}
}
void start();
