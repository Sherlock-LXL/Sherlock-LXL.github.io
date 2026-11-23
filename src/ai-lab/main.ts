import './style.css';
import {aiProjects,generationModes} from '../../shared/ai-lab.mjs';
import giftUI from '../../shared/original-gift-ui.json';
import {escapeHTML as esc,sitePath} from '../core/portfolio';
import {ModelClient} from './client';

const app=document.querySelector<HTMLDivElement>('#app')!;
const params=new URLSearchParams(location.search),embedded=params.get('embed')==='1'&&parent!==window;
let project=aiProjects.find(p=>p.id===params.get('project'))??aiProjects[0];
let active=true,busy=false,runVersion=0,stream:MediaStream|undefined,cameraVersion=0;
let pixels:{rgba:Uint8ClampedArray;width:number;height:number}|undefined;
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>app.querySelector<T>(selector)!;
const client=new ModelClient(message=>{
  if(!active)return;
  if(message.type==='progress'){
    const loaded=Number(message.loaded),total=Number(message.total);
    status(`${message.text} · ${(loaded/1e6).toFixed(1)} / ${(total/1e6).toFixed(1)} MB`,'loading');
    $('#load-progress').setAttribute('value',String(loaded));$('#load-progress').setAttribute('max',String(total));
  }else if(message.type==='ready'){
    status('原模型已就绪 · 浏览器本地推理','ready');enable();
  }else if(message.type==='error'){status(String(message.message),'error');busy=false;enable();}
  else if(message.type==='partial'){
    const line=$(`#verse-line-${Number(message.line)}`);if(line)line.textContent=String(message.text);
  }
});
function status(text:string,state:string){
  $('#model-status').textContent=text;$('#model-status').dataset.state=state;
  $('#load-progress').hidden=state!=='loading';$('#retry-model').hidden=state!=='error';
}
function enable(){
  const submit=$<HTMLButtonElement>('#run');
  if(submit)submit.disabled=busy||!client.isReady||(project.id==='expression-recognition-cnn'&&!pixels);
  const cancel=$('#cancel-run');if(cancel)cancel.hidden=!busy;
}
function initialize(){
  if(client.isReady){status('原模型已就绪 · 浏览器本地推理','ready');enable();return;}
  status('正在准备原始模型…','loading');enable();client.initialize(project.id);
}
function stopCamera(){
  cameraVersion++;stream?.getTracks().forEach(track=>track.stop());stream=undefined;
  const video=$<HTMLVideoElement>('#camera-preview');
  if(video){video.pause();video.srcObject=null;video.hidden=true;}
  const capture=$('#capture');if(capture)capture.hidden=true;
  const button=$('#camera');if(button)button.textContent='开启摄像头';
}
function suspend(){
  active=false;runVersion++;busy=false;stopCamera();client.suspend();enable();
}
function activate(id:string){
  const next=aiProjects.find(p=>p.id===id);if(!next)return;
  active=true;
  if(next.id!==project.id){runVersion++;stopCamera();client.dispose();project=next;pixels=undefined;busy=false;render();}
  initialize();
}
function details(){
  const descriptions={
    'gift-chooser':'作者 NumPy 手写网络：14 → 8 ReLU → 1，共 129 个参数。七项评分除以 10，再拼接类别 one-hot。线性原始值只在显示时裁剪为 0–10 分；下方建议来自原项目规则。模型版本 original-f64-v1，训练于一个特定个人偏好场景，本体验用于展示原项目的计算过程。模型与数据用途说明随 THIRD_PARTY_NOTICES.txt 保留。',
    'expression-recognition-cnn':'作者训练的三个残差 CNN，各 453,447 个参数；Softmax 概率等权平均。RGB 灰度 → Pillow 等价的双线性缩放 48×48 → /255，不额外标准化，也不自动检测或裁剪人脸。FP32 ONNX，WASM 单线程 Worker。标签顺序：angry / disgust / fear / happy / neutral / sad / surprise。',
    'blind-verse-rnn':'作者 v1.0.0 微调 LSTM：5,160 字符词表，Embedding 1536、Hidden 1536，单层，共 34,743,336 个参数。保留 FP32 权重；每句从 BOS 和独立 h/c 开始，屏蔽 PAD/BOS/UNK，保留 EOS。双盲每句最多 30 字，续写最多增加 20 字。三档 temperature / top-k 与原 App 一致。',
  };
  return `<details class="model-info"><summary>模型与运行说明 <span>＋</span></summary><p>${descriptions[project.id as keyof typeof descriptions]}</p><p>模型仅在打开当前项目时加载，文件经过 SHA256 校验。可用时缓存到本地；浏览器存储不足时仍可直接下载。关闭世界内窗口后停止摄像头和正在进行的计算，空闲模型最多保留一分钟。</p><a href="https://github.com/Sherlock-LXL/${project.id}" target="_blank" rel="noopener noreferrer">查看原项目源码 ↗</a></details>`;
}
function giftView(){
  return `<div class="workspace gift-workspace"><form id="project-form" class="input-card"><div class="section-label">01 / 衡量一份心意</div>
    <label class="field">礼物类别<select id="category">${giftUI.CATEGORIES.map((name,i)=>`<option value="${i}" ${i===2?'selected':''}>${esc(name)}</option>`).join('')}</select></label>
    <p class="input-note">七项均为 0–10 分。越高表示越匹配、越有把握。</p>
    <div class="score-fields">${giftUI.SCORE_QUESTIONS.map((q,i)=>`<div class="score-field"><div class="score-heading"><label for="score-${i}">${esc(q.name)}</label><output for="score-${i}">7.0</output></div><input id="score-${i}" type="range" min="0" max="10" step=".5" value="7"/><details class="score-guide"><summary>${esc(q.question)}</summary>${q.guide.map(text=>`<p>${esc(text)}</p>`).join('')}</details></div>`).join('')}</div>
    <div class="form-actions"><button id="run" class="primary" disabled>计算匹配分数 →</button><button type="button" id="cancel-run" hidden>取消</button></div></form>
    <section class="result-card" aria-label="送礼预测结果"><div class="section-label">02 / 网络的回答</div><div id="gift-result" class="empty-result"><span class="result-symbol">◇</span><h2>心意，也需要一点把握。</h2><p>调整左侧评分，让原始小网络为这个选择算一算。</p></div></section></div>`;
}
function expressionView(){
  return `<div class="workspace"><form id="project-form" class="input-card"><div class="section-label">01 / 给模型看一张表情</div>
    <div class="image-stage"><div id="image-empty"><span class="result-symbol">◎</span><p>选择一张清晰的面部图片</p><small>原模型不含人脸检测，请让脸部占据画面主要区域。</small></div><canvas id="image-preview" hidden aria-label="当前输入图片"></canvas><video id="camera-preview" autoplay playsinline muted hidden></video></div>
    <label class="upload-button">选择图片<input id="image-file" type="file" accept="image/png,image/jpeg,image/webp"/></label>
    <div class="camera-actions"><button id="camera" type="button">开启摄像头</button><button id="capture" type="button" hidden>拍一帧并关闭</button></div>
    <p id="image-status" class="input-note" role="status">图片与画面只留在当前浏览器，不上传、不录制。</p>
    <div class="form-actions"><button id="run" class="primary" disabled>识别这张表情 →</button><button type="button" id="cancel-run" hidden>取消</button></div></form>
    <section class="result-card" aria-label="表情分类结果"><div class="section-label">02 / 三个网络，一次判断</div><div id="expression-result" class="empty-result"><span class="result-symbol">◌</span><h2>读一张表情。</h2><p>模型输出七种标签的概率。它描述图像特征，不能判断一个人真实的心情。</p></div></section></div>`;
}
function verseView(){
  return `<div class="workspace verse-workspace"><form id="project-form" class="input-card"><div class="section-label">01 / 留一点偶然</div>
    <div class="verse-modes" role="group" aria-label="生成风格">${generationModes.map((mode,i)=>`<button type="button" data-mode="${i}" aria-pressed="${i===1}">${mode.name}</button>`).join('')}</div><p id="mode-description" class="input-note">在自然和意外之间取得平衡。</p>
    <label class="field">给诗一个开头 <span>可选 · 1–3 个字</span><input id="prefix" type="text" maxlength="6" placeholder="例如：山月" autocomplete="off"/></label><p class="input-note">留空生成两句双盲诗；填入开头则为你续写。</p>
    <div class="download-note"><span>☾</span><p>首次使用约下载 <b>139 MB</b> 原始权重。准备过程有进度提示，后续可复用浏览器缓存。</p></div>
    <div class="form-actions"><button id="run" class="primary" disabled>让两句诗相遇 →</button><button type="button" id="cancel-run" hidden>停止生成</button></div></form>
    <section class="result-card poem-paper" aria-label="生成的诗句"><div class="section-label">02 / 两句互不知晓的诗</div><div class="poem-lines"><p id="verse-line-0">第一句，尚未落笔。</p><p id="verse-line-1">第二句，在等一次相遇。</p></div><div id="verse-caption" class="input-note">每一句都由原始 LSTM 逐字生成。</div><div class="poem-actions" hidden><button type="button" id="copy-poem">复制诗句</button><button type="button" id="save-poem">收藏在此浏览器</button></div><details id="favorites"><summary>收藏的诗句</summary><div id="favorite-lines"></div></details></section></div>`;
}
function render(){
  document.documentElement.classList.toggle('embedded',embedded);
  app.innerHTML=`${embedded?'':`<header class="lab-header"><a class="wordmark" href="${sitePath()}">XiangMeta <span>/ AI LAB</span></a><a href="${sitePath('world/')}">进入山海世界 ↗</a></header><section class="lab-intro"><p class="eyebrow">李湘伦 / THREE ORIGINAL EXPERIMENTS</p><h1>把好奇，交给模型。</h1><p>三个自己训练的模型，在你的浏览器里运行。</p></section><nav class="project-nav" aria-label="AI 项目">${aiProjects.map(p=>`<button data-project="${p.id}" aria-pressed="${p.id===project.id}"><span class="nav-symbol">${p.symbol}</span><span><b>${p.title}</b><small>${p.english}</small></span><i>↗</i></button>`).join('')}</nav>`}
    <main class="lab-main"><div class="project-heading"><div><p class="eyebrow">${project.english}</p><h${embedded?'1':'2'}>${project.title}<span class="heading-symbol">${project.symbol}</span></h${embedded?'1':'2'}></div><p>${project.description}</p></div>
    <div class="model-state"><span id="model-status" role="status" data-state="loading">正在准备模型…</span><button type="button" id="retry-model" hidden>重新加载</button><progress id="load-progress" max="1" value="0" aria-label="模型文件加载进度"></progress></div>
    ${project.id==='gift-chooser'?giftView():project.id==='expression-recognition-cnn'?expressionView():verseView()}
    <p id="run-status" class="run-status" role="status" aria-live="polite"></p>${details()}</main>
    ${embedded?'':'<footer class="lab-footer">XIANGMETA · 原始权重，本地计算。<span>让好奇心继续带路。</span></footer>'}`;
  app.querySelectorAll<HTMLButtonElement>('[data-project]').forEach(button=>button.onclick=()=>{
    const url=new URL(location.href);url.searchParams.set('project',button.dataset.project!);history.replaceState(null,'',url);activate(button.dataset.project!);
  });
  $('#retry-model').onclick=()=>{client.dispose();initialize();};
  $('#cancel-run').onclick=()=>{runVersion++;client.dispose();busy=false;$('#run-status').textContent='已停止本次推理。';initialize();};
  app.querySelectorAll<HTMLInputElement>('input[type=range]').forEach(input=>input.oninput=()=>{input.parentElement!.querySelector('output')!.value=Number(input.value).toFixed(1);});
  $<HTMLFormElement>('#project-form').onsubmit=event=>{event.preventDefault();void run();};
  if(project.id==='expression-recognition-cnn')wireExpression();
  if(project.id==='blind-verse-rnn')wireVerse();
}
function giftResult(raw:number,score:number,scores:number[],category:number){
  const band=giftUI.SCORE_BANDS.find(b=>score>=b.minimum)!;
  const strongest=scores.indexOf(Math.max(...scores)),feedback=giftUI.FEATURE_FEEDBACK[strongest],best=scores[strongest];
  const strength=best>=7?feedback.strength:best>=5?`${feedback.name}是当前相对较稳定的一项，但得分只有 ${best.toFixed(1)}/10，暂时还不足以视为明显优势。`:'当前七项指标都偏低，还没有明显优势。建议先重新确认礼物方向，再考虑具体款式。';
  const suggestions=scores.map((value,index)=>({value,index})).sort((a,b)=>a.value-b.value||a.index-b.index).filter(x=>x.value<7.5).slice(0,2)
    .map(x=>`${giftUI.FEATURE_FEEDBACK[x.index].name} (${x.value.toFixed(1)}/10): ${giftUI.FEATURE_FEEDBACK[x.index].suggestion}`);
  if(!suggestions.length)suggestions.push('七项指标都比较稳定。目前不需要大幅修改方案，购买前确认商品质量和快递时间即可。');
  $('#gift-result').className='';
  $('#gift-result').innerHTML=`<div class="gift-score"><b>${score.toFixed(2)}</b><span>/ 10</span></div><h3>${esc(band.title)}</h3><p>${esc(band.comment)}</p><div class="feedback"><small>原项目规则建议</small><p>${esc(strength)}</p>${suggestions.map(text=>`<p>${esc(text)}</p>`).join('')}<p>${esc(giftUI.CATEGORY_TIPS[category])}</p></div><p class="input-note">${esc(giftUI.RESULT_TEXT.disclaimer)}</p><details><summary>查看网络原始输出</summary><code>${raw.toPrecision(16)}</code><p class="input-note">展示分数经裁剪，原始线性值不经过 Sigmoid。</p></details>`;
}
function expressionResult(probabilities:number[]){
  const labels=['愤怒','厌恶','恐惧','开心','平静','悲伤','惊讶'],english=['angry','disgust','fear','happy','neutral','sad','surprise'];
  const ranked=probabilities.map((value,id)=>({value,id})).sort((a,b)=>b.value-a.value),first=ranked[0];
  $('#expression-result').className='';
  $('#expression-result').innerHTML=`<div class="prediction-title"><h2>${labels[first.id]}</h2><b>${(first.value*100).toFixed(1)}<small>%</small></b></div><p class="input-note">预测标签 ${english[first.id]} · 三网络平均概率</p><div class="probabilities">${ranked.map(({value,id})=>`<div class="probability"><div><span>${labels[id]} <small>${english[id]}</small></span><b>${(value*100).toFixed(2)}%</b></div><div class="probability-track"><i style="width:${value*100}%"></i></div></div>`).join('')}</div><p class="input-note">整张图直接进入原模型；请使用清晰、以面部为主的图片。</p>`;
}
async function run(){
  if(busy||!active)return;
  const version=++runVersion;busy=true;enable();$('#run-status').textContent='正在浏览器里计算…';
  try{
    let request:Record<string,unknown>;
    const scores=project.id==='gift-chooser'?Array.from({length:7},(_,i)=>Number($<HTMLInputElement>(`#score-${i}`).value)):[];
    const category=project.id==='gift-chooser'?Number($<HTMLSelectElement>('#category').value):0;
    if(project.id==='gift-chooser')request={type:'gift',scores,category};
    else if(project.id==='expression-recognition-cnn'){if(!pixels)throw new Error('请先选择图片。');request={type:'expression',...pixels};}
    else{
      const prefix=$<HTMLInputElement>('#prefix').value.trim();
      if(Array.from(prefix).length>3)throw new Error('开头最多 3 个字。');
      const seed=crypto.getRandomValues(new Uint32Array(1))[0];
      request={type:'verse',prefix,mode:Number(app.querySelector('[data-mode][aria-pressed=true]')!.getAttribute('data-mode')),seed};
      $('#verse-line-0').textContent=prefix||'正在落笔…';$('#verse-line-1').textContent=prefix?'':'另一句独立生成…';$('.poem-actions').hidden=true;
    }
    const output=await client.run(request);if(!active||version!==runVersion)return;
    const result=output.result as {raw:number;score:number;probabilities:number[];lines:string[];seed:number};
    if(project.id==='gift-chooser')giftResult(result.raw,result.score,scores,category);
    else if(project.id==='expression-recognition-cnn')expressionResult(result.probabilities);
    else{
      result.lines.forEach((line,i)=>{$(`#verse-line-${i}`).textContent=line||'（模型输出了结束符，试着再生成一次。）';});
      $('#verse-caption').textContent=request.prefix?'从你的开头续写 · 每次使用新的隐状态':'双盲生成 · 两句不共享上下文';
      $('.poem-actions').hidden=false;lastPoem=result.lines.filter(Boolean).join('\n');
    }
    $('#run-status').textContent=`已完成本地推理 · ${(Number(output.milliseconds)/1000).toFixed(2)} 秒`;
    if(params.has('inspect'))Object.assign(window,{__aiLabLastResult:output});
  }catch(error){if(active&&version===runVersion)$('#run-status').textContent=error instanceof Error?error.message:String(error);}
  finally{if(version===runVersion){busy=false;enable();}}
}
function readPixels(source:CanvasImageSource,width:number,height:number){
  if(width*height>16_000_000)throw new Error('图片超过 1600 万像素，请先缩小后重试。');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{willReadFrequently:true})!;context.drawImage(source,0,0);
  pixels={rgba:context.getImageData(0,0,width,height).data,width,height};
  const preview=$<HTMLCanvasElement>('#image-preview');preview.width=width;preview.height=height;
  preview.getContext('2d')!.drawImage(canvas,0,0);preview.hidden=false;$('#image-empty').hidden=true;
  $('#image-status').textContent=`${width} × ${height} · 图片留在本机，待识别。`;enable();
}
function wireExpression(){
  $<HTMLInputElement>('#image-file').onchange=async event=>{
    stopCamera();const version=cameraVersion;
    const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;
    try{
      if(file.size>20_000_000)throw new Error('图片超过 20 MB，请先缩小后上传。');
      if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('请选择 PNG、JPEG 或 WebP 图片。');
      const bitmap=await createImageBitmap(file);
      try{if(active&&version===cameraVersion)readPixels(bitmap,bitmap.width,bitmap.height);}finally{bitmap.close();}
    }catch(error){if(active&&version===cameraVersion)$('#image-status').textContent=`图片读取失败：${error instanceof Error?error.message:String(error)}`;}
  };
  $('#camera').onclick=async()=>{
    if(stream){stopCamera();$('#image-status').textContent='摄像头已关闭。';return;}
    const version=++cameraVersion;
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('摄像头需要 HTTPS 和浏览器支持，请使用图片上传。');
      $('#image-status').textContent='等待你的摄像头授权…';
      let denied=false;
      try{denied=(await navigator.permissions.query({name:'camera' as PermissionName})).state==='denied';}catch{/* Safari may not expose camera permission queries. */}
      if(denied)throw new DOMException('摄像头未获授权','NotAllowedError');
      const next=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480}},audio:false});
      if(!active||version!==cameraVersion){next.getTracks().forEach(track=>track.stop());return;}
      stream=next;const video=$<HTMLVideoElement>('#camera-preview');video.srcObject=stream;video.hidden=false;await video.play();
      $('#capture').hidden=false;$('#camera').textContent='关闭摄像头';$('#image-status').textContent='实时预览中 · 点击拍一帧，随后自动关闭摄像头。';
    }catch(error){
      if(!active||version!==cameraVersion)return;stopCamera();
      const name=error instanceof Error?error.name:'';
      $('#image-status').textContent=name==='NotAllowedError'?'摄像头权限被拒绝。你仍可以上传图片。':name==='NotFoundError'?'没有找到摄像头。请上传图片。':`无法开启摄像头：${error instanceof Error?error.message:String(error)}`;
    }
  };
  $('#capture').onclick=()=>{
    const video=$<HTMLVideoElement>('#camera-preview');
    if(video.readyState<2)return;
    try{readPixels(video,video.videoWidth,video.videoHeight);}catch(error){$('#image-status').textContent=String(error);}finally{stopCamera();}
  };
}
let lastPoem='';
function favoritePoems():string[]{try{return JSON.parse(localStorage.getItem('xiangmeta-ai-poems-v1')??'[]').filter((x:unknown)=>typeof x==='string').slice(0,30);}catch{return [];}}
function showFavorites(){const favorites=favoritePoems();$('#favorite-lines').innerHTML=favorites.length?favorites.map(text=>`<p>${esc(text).replace(/\n/g,'<br>')}</p>`).join(''):'<p>还没有收藏的诗句。</p>';}
function wireVerse(){
  lastPoem='';
  app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button=>button.onclick=()=>{
    app.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    $('#mode-description').textContent=['更稳定、自然，偏向常见表达。','在自然和意外之间取得平衡。','更自由、更偶然，也更容易出现惊喜。'][Number(button.dataset.mode)];
  });
  $<HTMLInputElement>('#prefix').oninput=()=>{$('#run').textContent=$<HTMLInputElement>('#prefix').value.trim()?'为这个开头续写 →':'让两句诗相遇 →';};
  $('#copy-poem').onclick=async()=>{try{await navigator.clipboard.writeText(lastPoem);$('#verse-caption').textContent='已复制诗句。';}catch{$('#verse-caption').textContent='复制未获授权，请选中诗句手动复制。';}};
  $('#save-poem').onclick=()=>{
    try{localStorage.setItem('xiangmeta-ai-poems-v1',JSON.stringify([lastPoem,...favoritePoems().filter(text=>text!==lastPoem)].slice(0,30)));showFavorites();$('#verse-caption').textContent='已收藏在此浏览器。';}
    catch{$('#verse-caption').textContent='浏览器存储不可用，可以复制诗句保存。';}
  };
  showFavorites();
}
if(embedded){
  window.addEventListener('message',event=>{
    if(event.source!==parent||event.origin!==location.origin)return;
    if(event.data?.type==='xiangmeta:ai-activate')activate(event.data.project);
    else if(event.data?.type==='xiangmeta:ai-suspend')suspend();
  });
  window.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();parent.postMessage({type:'xiangmeta:ai-close'},location.origin);}});
  parent.postMessage({type:'xiangmeta:ai-ready'},location.origin);
}
window.addEventListener('pagehide',()=>{suspend();client.dispose();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stopCamera();if(busy){runVersion++;busy=false;client.dispose();$('#run-status').textContent='页面进入后台，已停止计算。';enable();}}else if(active)initialize();});
render();initialize();
if(params.has('inspect'))Object.assign(window,{
  __aiLabRun:(request:object)=>client.run(request),
  __aiLabInspect:()=>({project:project.id,ready:client.isReady,busy,active,camera:stream?.getTracks().map(track=>track.readyState)??[]}),
});
