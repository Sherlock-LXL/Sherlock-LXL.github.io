import {actionIcon} from './core/action-icons';
import {navIcon} from './core/nav-icons';
import './style.css';
import './refined-ui.css';
import './web-world.css';
import {sitePath,projectLinks,externalAttrs} from './core/portfolio';
import {nearbyActions,type InteractionKey} from './core/nearby-actions';
import {mountAlbumGallery} from './core/album-gallery';
import { version } from '../package.json';
import { catalog, invoke } from './core/api';
import { EventBus } from './core/events';
import { VisitorStore } from './core/storage';
import { discoveries,type Exhibit } from './core/types';
import { World } from './world/world';
import { AudioSystem } from './audio/audio';
import { guide } from './agents/guide';
import {mountResearch} from './core/research-lab';
import {memoryEntries,growthEntries,starPosition} from '../shared/memories.mjs';
import type {MemoryFragment,ArtworkInteraction} from './core/types';
import {horizons} from './world/horizons';
import {harborRoutes} from '../shared/harbor.mjs';
import {weatherKinds,weatherNames} from '../shared/weather.mjs';
import {artwork} from './world/artwork';

const app=document.querySelector<HTMLDivElement>('#app')!;
const escape=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const icon=(name:string)=>({world:'◈',mountain:'△',science:'◌',museum:'▥',studio:'♫',guide:'✦',arrow:'↗',sound:'♪',map:'⌖',close:'×',star:'☆'}[name]??'◈');
app.innerHTML='<div class="web-loading"><span class="loading-symbol">✳</span><h1>XiangMeta</h1><p>正在读取项目与世界档案…</p><progress aria-label="读取世界档案"></progress></div>';
async function boot(){
  const data=await catalog();const bus=new EventBus(),store=new VisitorStore(),audio=new AudioSystem(bus,data.audio,(text,playing)=>{
    const caption=document.querySelector<HTMLElement>('#music-caption');if(caption){caption.textContent='♫ '+text;caption.dataset.playing=String(playing);}
  });
  if(new URLSearchParams(location.search).has('inspect'))Object.assign(window,{__xiangmetaAudio:()=>audio.snapshot});
  app.innerHTML=`
    <aside class="sidebar">
      <a class="brand" href="#" aria-label="返回世界总览"><span class="brand-symbol">✳</span><span>XiangMeta<small>A PERSONAL UNIVERSE</small></span></a>
      <div class="side-caption">EXPLORATION <span>探索无界</span></div>
      <button class="nav-overview active" id="overview" aria-label="世界总览" title="世界总览">${navIcon('world')} <span>世界总览</span><span class="nav-end">⌘</span></button>
      <div class="nav-section-label">探索大陆</div>
      <nav id="regions">${data.regions.map((r,i)=>`<button class="region-nav" data-region="${r.id}" aria-label="${escape(r.title)}" title="${escape(r.title)}" style="--accent:${r.color}">${navIcon(['mountain','science','museum','studio'][i])}<span>${escape(r.title)}<small>${escape(r.english)}</small></span><span class="nav-end">↗</span></button>`).join('')}</nav>
      <div class="side-divider"></div>
      <button class="secondary-nav" id="collections" aria-label="展品索引" title="展品索引">${navIcon('collections')} <span>展品索引</span><b>${String(data.modules.length).padStart(2,'0')}</b></button>
      <button class="secondary-nav" id="favorites" aria-label="我的收藏" title="我的收藏">${navIcon('favorites')} <span>我的收藏</span><b id="favorite-count">${store.favorites.size}</b></button>
      <div class="side-bottom"><div class="journey-heading">探索足迹 <span id="progress-count"></span></div><div class="progress-track"><div id="progress-fill"></div></div><p>每一段探索，都是新的连接。</p><div class="build-tag"><span class="status-dot"></span> 持续生长 <span>v${version}</span></div></div>
    </aside>
    <main class="main-world first-person">
      <header class="topbar"><div><span class="breadcrumb">我的数字宇宙</span><span class="slash">/</span><span id="current-region">世界总览</span></div><div class="top-actions"><span class="local-badge"><span class="status-dot"></span> 本地世界</span><button class="icon-button" id="sound" aria-label="开启声音" title="开启声音"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l11-3v13M9 9l11-3"/><ellipse cx="6" cy="18" rx="3" ry="2.5"/><ellipse cx="17" cy="16" rx="3" ry="2.5"/></svg><span class="muted-slash" aria-hidden="true"></span></button><button class="journal-button" id="journal" aria-label="旅行印记" title="旅行印记">✧ <span id="stamp-count"></span></button><button class="icon-button" id="help" aria-label="操作指南">?</button></div></header>
      <section id="world" aria-label="可探索的 3D 世界"></section>
      <div class="world-heading"><div class="eyebrow"><span class="line"></span> THE LIVING ATLAS</div><h1>一个世界，无限可能<span>。</span></h1><p>让好奇心带路，让每一次创造成为新的大陆。</p></div>
      <div class="world-meta"><span class="status-dot"></span> ${data.regions.length} REGIONS <span class="meta-divider">/</span> ${String(data.modules.length).padStart(2,'0')} EXHIBITS <span class="meta-divider">/</span> ALWAYS GROWING</div>
      <div class="crosshair" aria-hidden="true"></div>
      <div class="interaction-prompt" id="interaction-prompt" hidden></div>
      <button class="interaction-prompt discovery-prompt" id="discovery-prompt" hidden><span class="interaction-key">G</span><span><b id="discovery-name"></b><small id="discovery-action"></small></span><span class="prompt-art">${actionIcon('sparkle')}</span></button>
      <div class="view-badge"><span class="status-dot"></span><span id="view-name">第一人称探索</span><button id="capture-look">点击进入环顾</button></div>
      <div class="world-bottom"><div class="coordinates"><span id="coordinate">正在定位…</span><small>XIANGMETA</small></div><div class="controls-pill"><span><kbd>W A S D</kbd> 行走 · Shift 加速 · 空格跳跃</span><i></i><span id="look-hint">点击 / 拖动环顾 · Esc 释放鼠标</span><i></i><button id="nearby" disabled><kbd>F</kbd> 靠近展台交互</button></div><button class="overview-small" id="camera-reset" title="回到第一人称" aria-label="回到第一人称">⌖</button></div>
      <button class="guide-card" id="guide"><span class="guide-orb">✦</span><span><b>世界向导</b><small>下一站，想去哪里？</small></span><span>↗</span></button>
      <div class="compass" aria-hidden="true">N<br><span>✧</span></div>
      <div class="toast" role="status" aria-live="polite" hidden></div>
    </main>
    <dialog id="inspector" aria-labelledby="panel-title"><div id="panel-content"></div></dialog>`;
  const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
  const dialog=$<HTMLDialogElement>('#inspector');let world:World|undefined;let current:Exhibit|undefined;let abort:AbortController|undefined;
  $('.local-badge').innerHTML=`<a href="${sitePath('projects/')}">Projects ↗</a>`;
  $('.side-caption').insertAdjacentHTML('beforebegin',`<a class="portfolio-home" href="${sitePath()}">← 李湘伦 / Portfolio</a>`);
  $('.main-world').insertAdjacentHTML('beforeend',`<div id="music-caption" class="music-caption">♫ 点击右上角 ♪ · 开启 BGM 与四季音乐</div>`);
  const seasons={spring:'春 · 桃花山径',summer:'夏 · 海风绿洲',autumn:'秋 · 金色回忆',winter:'冬 · 初雪实验室'};
  data.regions.forEach(r=>{const small=document.querySelector(`[data-region="${r.id}"] small`);if(small&&r.season)small.textContent=seasons[r.season];});
  $('.top-actions').insertAdjacentHTML('afterbegin','<button id="sky-settings" class="sky-clock" title="调整海岛时光" aria-label="海岛时光">◒ <span id="sky-clock">09:00</span></button>');
  $('.top-actions').insertAdjacentHTML('afterbegin','<button id="memory-open" class="journal-button" aria-label="记忆星图" title="记忆星图">✶ <span id="memory-count">0</span></button><button id="photo-open" class="icon-button" aria-label="摄影模式" title="摄影模式 · P">▧</button>');
  $('#collections').insertAdjacentHTML('beforebegin','<button id="growth-open" aria-label="成长路径" title="成长路径" class="secondary-nav">'+navIcon('growth')+' <span>成长路径</span><b>EXPLORE</b></button>');
  $('.main-world').insertAdjacentHTML('beforeend','<button class="interaction-prompt memory-prompt" id="memory-prompt" hidden><span class="interaction-key">G</span><span><b id="memory-near-name"></b><small>收集碎片 · 点亮星图</small></span><span class="prompt-art" id="memory-prompt-icon"></span></button><div id="trail-guide" hidden><span id="trail-text"></span><button id="trail-stop" aria-label="结束路线">×</button></div><div id="photo-toolbar" hidden><div><b>XIANGMETA / PHOTO MODE</b><small>WASD 移动 · Q / E 升降 · 拖动环顾 · P / Esc 返回</small></div><label>视角 <input id="photo-fov" type="range" min="30" max="90" value="60" aria-label="摄影视野"/></label><label>光线 <select id="photo-hour" aria-label="摄影时刻"><option value="">当前时刻</option><option value="6.2">晨曦</option><option value="10">晴昼</option><option value="17.8">暮色</option><option value="22">月夜</option></select></label><button id="photo-save">导出照片</button><button id="postcard-save">制作明信片</button><button id="photo-exit">返回世界</button><span id="photo-status" role="status"></span></div>');
  let stream:MediaStream|undefined;let imageData='';let toastTimer:ReturnType<typeof setTimeout>;
  function toast(text:string){$('.toast').textContent=text;$('.toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('.toast').hidden=true,4500);}
  function progress(){const count=data.modules.filter(m=>store.visited.has(m.id)).length;$('#progress-count').textContent=`${String(count).padStart(2,'0')} / ${String(data.modules.length).padStart(2,'0')}`;$('#progress-fill').style.width=`${count/data.modules.length*100}%`;$('#favorite-count').textContent=String(data.modules.filter(m=>store.favorites.has(m.id)).length);}
  function stopCamera(){stream?.getTracks().forEach(t=>t.stop());stream=undefined;}
  let cleanupResearch=()=>{};
  function cleanup(){cleanupResearch();cleanupResearch=()=>{};abort?.abort();abort=undefined;stopCamera();imageData='';}
  function closePanel(capture:boolean|Event=true){cleanup();current=undefined;dialog.close();world?.setPaused(false);document.querySelector<HTMLCanvasElement>('#world canvas')?.focus({preventScroll:true});if(capture!==false)world?.captureMouse();}
  function showPanel(html:string){cleanup();dialog.classList.remove('product-mode','memory-mode','immersive-mode','memory-detail');dialog.dataset.kind='';world?.setPaused(true);$('#panel-content').innerHTML=html;if(!dialog.open)dialog.showModal();dialog.scrollTop=0;$('#close-panel').onclick=closePanel;}
  function showHarbor(){showPanel(panelHeader('向海出发','海风港口')+`<p class="panel-description">船已泊岸，新的大陆正在生长。<br>在这里，预览下一次旅程的方向。</p><div class="harbor-ticket"><span>出发港</span><b>中央枢纽 · 海风港口</b><span class="harbor-status">航线筹备中</span></div><div class="harbor-routes">${harborRoutes.map((r,i)=>`<article class="harbor-route"><div class="route-number">0${i+1}</div><div><h3>${escape(r.title)}</h3><small>${escape(r.theme)}</small><p>${escape(r.description)}</p></div><button disabled aria-label="${escape(r.title)}尚未开放">尚未开放</button></article>`).join('')}</div><p class="harbor-note">航线暂时封锁，尚不可乘船抵达。目的地开放后，会在这里迎接第一批旅人，敬请期待。</p><button class="primary-button" id="harbor-visit">去栈桥走走 ↗</button>`);dialog.dataset.kind='harbor';$('#harbor-visit').onclick=()=>{closePanel(false);world?.visitHarbor();world?.captureMouse();};}
  bus.on('harbor',showHarbor);
  $('#collections').insertAdjacentHTML('beforebegin','<button id="harbor-open" aria-label="海风港口" title="海风港口" class="secondary-nav">'+navIcon('harbor')+' <span>海风港口</span><b>航线</b></button>');$('#harbor-open').onclick=showHarbor;
  function panelHeader(eyebrow:string,title:string){return `<div class="panel-top"><span class="eyebrow">${escape(eyebrow)}</span><button class="icon-button" id="close-panel" aria-label="关闭面板"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><h2 id="panel-title">${escape(title)}</h2>`;}
  dialog.addEventListener('close',()=>{if(dialog.open)return;cleanup();world?.setPaused(false);current=undefined;document.querySelector<HTMLCanvasElement>('#world canvas')?.focus({preventScroll:true});});
  dialog.addEventListener('cancel',event=>{event.preventDefault();closePanel();});
  let escapeReturn=false;
  window.addEventListener('keydown',event=>{if(event.code==='Escape'&&(dialog.open||world?.isPhoto)){event.preventDefault();event.stopImmediatePropagation();escapeReturn=true;if(dialog.open)closePanel(false);else exitPhoto(false);}},{capture:true});
  window.addEventListener('keyup',event=>{if(event.code==='Escape'&&escapeReturn){event.preventDefault();escapeReturn=false;if(!dialog.open)world?.captureMouse();}},{capture:true});
  window.addEventListener('xiangmeta:close-panel',()=>{if(dialog.open)closePanel(false);else if(world?.isPhoto)exitPhoto(false);});
  window.addEventListener('xiangmeta:resume-look',()=>{if(!dialog.open&&!world?.isPhoto)world?.captureMouse();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closePanel();}});
  function collection(favorites=false){
    const items=data.modules.filter(m=>!favorites||store.favorites.has(m.id));
    showPanel(panelHeader('THE COLLECTION',favorites?'我的收藏':'每一次创造，都有坐标')+`<p class="panel-description">${favorites?'你想再次抵达的地方。收藏保存在这台设备上。':'每个起点都有自己的故事。这个索引会随着模块的加入自动生长。'}</p><div class="collection-list">${items.map(m=>`<button class="collection-item" data-exhibit="${m.id}"><span class="collection-symbol">${icon('world')}</span><span><b>${escape(m.title)}</b><small>${escape(m.subtitle)}</small></span><span>↗</span></button>`).join('')||'<p class="empty">还没有收藏。打开一个展品，点击收藏即可。</p>'}</div>`);
    wireExhibits();
  }
  function wireExhibits(){dialog.querySelectorAll<HTMLButtonElement>('[data-exhibit]').forEach(b=>b.onclick=()=>openExhibit(data.modules.find(m=>m.id===b.dataset.exhibit)!));}
  function openExhibit(m:Exhibit,product=false,albumId?:string){
    current=m;store.visited.add(m.id);store.save();progress();world?.focusExhibit(m);bus.emit('sound','interaction');
    const region=data.regions.find(r=>r.id===m.region)!;
    const links=projectLinks(m);
    const fields=m.interface?.fields.map(f=>{
      const id=`field-${f.key}`;
      let input='';
      if(f.type==='text')input=`<textarea id="${id}" name="${f.key}" rows="3" required maxlength="${f.max??1000}" placeholder="${escape(f.placeholder??'')}">${escape(f.default??'')}</textarea>`;
      if(f.type==='number')input=`<div class="range-row"><input type="range" id="${id}" name="${f.key}" min="${f.min}" max="${f.max}" step="${f.step??0.01}" value="${f.default??f.min}"/><output for="${id}">${f.default??f.min}</output></div>`;
      if(f.type==='select')input=`<select id="${id}" name="${f.key}">${f.options?.map(o=>`<option ${o===f.default?'selected':''}>${escape(o)}</option>`).join('')}</select>`;
      if(f.type==='image')input=`<div class="upload-zone"><span class="upload-icon">↑</span><input id="${id}" name="${f.key}" type="file" accept="image/png,image/jpeg,image/webp"/><small>图片只用于本次推理</small></div><img id="image-preview" alt="待分析的图片" hidden/><div class="camera-controls"><button type="button" class="quiet-button" id="camera">◎ 开启摄像头</button><button type="button" class="quiet-button" id="capture" hidden>拍摄并关闭</button></div><video id="camera-preview" autoplay playsinline muted hidden></video>`;
      return `<div class="form-field"><label for="${id}">${escape(f.label)}</label>${input}</div>`;
    }).join('')??'';
    showPanel(panelHeader(`${region.english} / ${m.owner==='team'?'团队作品':'个人项目'}`,m.title)+`
      <div class="panel-subtitle">${escape(m.subtitle)}</div><div class="tag-row">${m.tags.map(t=>`<span>${escape(t)}</span>`).join('')}</div>
      <p class="panel-description">${escape(m.portfolio?.summary??m.description)}</p>
      <div class="portfolio-actions">${links.github?`<a class="primary-button" href="${escape(links.github)}" ${externalAttrs}>GitHub ↗</a>`:''}${links.demo?`<a class="quiet-button" href="${escape(links.demo)}" ${externalAttrs}>${m.albums?'网易云音乐':m.id==='weiming'?'观看 MV':'Demo'} ↗</a>`:''}<a class="quiet-button" href="${sitePath('projects/')}#${m.id}">项目档案 →</a></div>
      <button class="primary-button open-product" id="use-product">${m.simulation?'打开交互模拟':'进入展览'} <span>↗</span></button>
      <div class="fact-grid">${m.facts.map(f=>`<div><b>${escape(f.value)}</b><span>${escape(f.label)}</span></div>`).join('')}</div>
      <div class="panel-tabs"><button class="active" data-tab="experience">${m.interface?'交互体验':'展品'} <span>↗</span></button><button data-tab="story">成长档案 <span>↗</span></button></div>
      <section id="experience">
        <div class="module-status ${m.status.state}"><span class="status-dot"></span>${escape(m.simulation?'论文方程交互 · 演示参数':m.status.detail)}</div>
        ${m.simulation?'<div id="research-lab"></div>':''}
        ${m.interface&&!m.simulation?`<div class="product-workspace"><form id="module-form"><div class="workspace-label">01 / 输入与参数</div>${fields}<div class="form-actions"><button class="primary-button" type="submit" ${m.status.state==='unavailable'?'disabled':''}>${escape(m.interface.action)} <span>↗</span></button><button class="quiet-button" type="button" id="cancel-run" hidden>取消</button></div></form><div class="product-output"><div class="workspace-label">02 / ${m.simulation?'交互反馈':'模型输出'}</div><div class="output-empty"><span>${m.simulation?'◌':m.interface.fields.some(f=>f.type==='image')?'◎':'✦'}</span><b>${m.simulation?'调整参数，观察变化':'准备好，开始一次探索'}</b><p>${m.simulation?'上方曲线会响应你的调整。':'完成左侧输入，结果会在这里呈现。'}</p></div><div id="model-result" role="status" aria-live="polite" hidden></div></div></div>`:''}
        ${m.media.length?`<div class="media-list photo-collection">${m.media.filter(media=>media.kind==='image'&&media.src).map(media=>`<div class="media-card"><img loading="lazy" decoding="async" src="${escape(media.thumbnail??media.src)}" alt="${escape(media.title)}"/><p>${escape(media.title)}${media.location?`<small class="photo-location">拍摄于 ${escape(media.location)}</small>`:''}</p></div>`).join('')}</div>`:''}
        ${m.link?`<a class="primary-button external-link" href="${escape(m.link)}" target="_blank" rel="noopener noreferrer">观看 MV <span>↗</span></a>`:''}
      </section>
      <section id="story" hidden><div class="timeline">${m.story.map(s=>`<article><h3>${escape(s.title)}</h3><p>${escape(s.body)}</p></article>`).join('')}</div></section>
      <footer class="panel-footer"><button class="quiet-button" id="visit">${actionIcon('visit')}<span>抵达展台</span></button><button class="quiet-button" id="favorite" aria-pressed="${store.favorites.has(m.id)}">${actionIcon('favorite',store.favorites.has(m.id))}<span>${store.favorites.has(m.id)?'已收藏':'收藏'}</span></button><button class="quiet-button back-world" id="back-world">${actionIcon('back')}<span>返回 · Esc</span></button></footer>`);
    dialog.classList.toggle('product-mode',product);dialog.dataset.kind=m.visual;dialog.style.setProperty('--product-accent',region.color);mountAlbumGallery($('#experience'),m,albumId);
    if(m.world?.connections.length){$('#experience').insertAdjacentHTML('beforeend',`<div class="connection-list"><small>另一条线索 / THREADS</small>${m.world.connections.map(link=>`<button class="connection-card" data-connection="${link.target}"><b>${escape(link.title)} ↗</b><span>${escape(link.body)}</span></button>`).join('')}</div>`);dialog.querySelectorAll<HTMLButtonElement>('[data-connection]').forEach(b=>b.onclick=()=>{world?.visit(data.modules.find(m=>m.id===b.dataset.connection)!);closePanel();});}
    if(m.world?.capabilities.includes('gallery'))dialog.querySelectorAll<HTMLElement>('.media-card').forEach((card,i)=>{if(m.media[i].kind!=='image')return;const imageIndex=m.media.slice(0,i).filter(item=>item.kind==='image').length;const b=document.createElement('button');b.className='quiet-button';b.textContent='沉浸观看 ↗';b.dataset.immerse=String(imageIndex);b.onclick=()=>immerse(m,imageIndex);card.append(b);});
    $('#use-product').onclick=()=>openExhibit(m,true);$('#back-world').onclick=closePanel;
    dialog.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(button=>button.onclick=()=>{dialog.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b===button));$('#experience').hidden=button.dataset.tab!=='experience';$('#story').hidden=button.dataset.tab!=='story';});
    $('#visit').onclick=()=>{world?.visit(m);closePanel();};
    $('#favorite').onclick=()=>{if(store.favorites.has(m.id))store.favorites.delete(m.id);else store.favorites.add(m.id);store.save();progress();$('#favorite').innerHTML=actionIcon('favorite',store.favorites.has(m.id))+`<span>${store.favorites.has(m.id)?'已收藏':'收藏'}</span>`;$('#favorite').setAttribute('aria-pressed',String(store.favorites.has(m.id)));};
    dialog.querySelectorAll<HTMLInputElement>('input[type=range]').forEach(input=>input.oninput=()=>{input.parentElement!.querySelector('output')!.textContent=input.value;});
    if(m.simulation)cleanupResearch=mountResearch($('#research-lab'),m.simulation);
    if(m.interface&&!m.simulation){
      const form=$<HTMLFormElement>('#module-form');
      form.onsubmit=async event=>{
        event.preventDefault();if(abort)return;
        const result=$('#model-result');result.hidden=false;$('.output-empty').hidden=true;
        const input:Record<string,unknown>={};const values=new FormData(form);
        for(const field of m.interface!.fields)input[field.key]=field.type==='image'?imageData:field.type==='number'?Number(values.get(field.key)):values.get(field.key);
        if(m.simulation){result.textContent='示意参数已更新。曲线用于解释交互，不代表实验测量或科学预测。';return;}
        if(m.interface!.fields.some(f=>f.type==='image')&&!imageData){result.textContent='请先选择图片或拍摄一张照片。';return;}
        result.className='pending';result.textContent='正在启动本地模型并推理… 首次加载权重可能需要一些时间。';
        const submit=form.querySelector<HTMLButtonElement>('[type=submit]')!,cancel=$<HTMLButtonElement>('#cancel-run');submit.disabled=true;cancel.hidden=false;
        const controller=new AbortController();abort=controller;cancel.onclick=()=>controller.abort();
        let partial='';
        try {const response=await invoke(m.id,input,controller.signal,delta=>{if(controller.signal.aborted||!dialog.open||current?.id!==m.id||!result.isConnected)return;partial+=delta;result.className='streaming';result.textContent=`本地模型 · 正在生成\n\n${partial}`;});if(!dialog.open||current?.id!==m.id)return;result.className='success';result.textContent=`本地模型 · 真实推理\n\n${response.text}`;if(m.visual==='mirror'&&response.predictions?.length)bus.emit('expression',response.predictions[0].label);}
        catch(error){if(!result.isConnected)return;result.className='error';result.textContent=(partial?partial+'\n\n':'')+(controller.signal.aborted?'已取消本次推理。':(error as Error).message);}
        finally {if(abort===controller)abort=undefined;submit.disabled=false;cancel.hidden=true;}
      };
    }
    const file=dialog.querySelector<HTMLInputElement>('input[type=file]');
    if(file){
      const preview=$<HTMLImageElement>('#image-preview');const setImage=(value:string)=>{imageData=value;preview.src=value;preview.hidden=false;};
      file.onchange=async()=>{imageData='';preview.hidden=true;const selected=file.files?.[0];if(!selected)return;if(selected.size>5*1024*1024||!['image/png','image/jpeg','image/webp'].includes(selected.type)){toast('请选择 5 MB 以内的 PNG、JPG 或 WebP 图片');file.value='';return;}const reader=new FileReader();reader.onload=()=>{if(file.isConnected)setImage(String(reader.result));};reader.readAsDataURL(selected);};
      $('#camera').onclick=async()=>{
        if(stream){stopCamera();$<HTMLVideoElement>('#camera-preview').hidden=true;$('#capture').hidden=true;$('#camera').textContent='◎ 开启摄像头';return;}
        const cameraButton=$<HTMLButtonElement>('#camera');cameraButton.disabled=true;
        try {const next=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480}},audio:false});if(!dialog.open||!file.isConnected){next.getTracks().forEach(t=>t.stop());return;}stream=next;const video=$<HTMLVideoElement>('#camera-preview');video.srcObject=stream;video.hidden=false;$('#capture').hidden=false;$('#camera').textContent='关闭摄像头';}
        catch{toast('无法开启摄像头，请检查设备和权限，或上传图片。');}
        finally{cameraButton.disabled=false;}
      };
      $('#capture').onclick=()=>{const video=$<HTMLVideoElement>('#camera-preview');if(!video.videoWidth)return;const canvas=document.createElement('canvas');const size=Math.min(video.videoWidth,video.videoHeight);canvas.width=size;canvas.height=size;canvas.getContext('2d')!.drawImage(video,(video.videoWidth-size)/2,(video.videoHeight-size)/2,size,size,0,0,size,size);setImage(canvas.toDataURL('image/jpeg',0.88));stopCamera();video.hidden=true;$('#capture').hidden=true;$('#camera').textContent='◎ 开启摄像头';};
    }
  }
  function immerse(m:Exhibit,index:number){
    const images=m.media.filter(media=>media.kind==='image'),item=images[index];if(!item)return;
    let src=item.src;if(!src){const painting=artwork(index);src=(painting.map!.image as HTMLCanvasElement).toDataURL('image/png');painting.map!.dispose();painting.dispose();}
    showPanel(panelHeader('IN THE FRAME',item.title)+`<figure class="immersive-image"><img src="${escape(src)}" alt="${escape(item.title)}"/><figcaption>${item.location?'拍摄于 '+escape(item.location):item.src?'作品来自当前展品资源。':'程序化策展习作 · 等待个人摄影原作替换'}</figcaption></figure><div class="immersive-actions"><button id="image-prev">← 上一幅</button><button id="image-back">返回展廊</button><button id="image-next">下一幅 →</button></div>`);dialog.classList.add('immersive-mode');$('#image-prev').onclick=()=>immerse(m,(index+images.length-1)%images.length);$('#image-next').onclick=()=>immerse(m,(index+1)%images.length);$('#image-back').onclick=()=>openExhibit(m,true);
  }
  const fragments=memoryEntries(data) as MemoryFragment[],growth=growthEntries(fragments) as MemoryFragment[];let tracking:MemoryFragment|undefined;
  $('#memory-prompt-icon').innerHTML=actionIcon('sparkle');
  function memoryProgress(){$('#memory-count').textContent=`${fragments.filter(f=>store.memories.has(f.id)).length}/${fragments.length}`;}
  function openMemory(entry:MemoryFragment){
    const found=store.memories.has(entry.id),m=data.modules.find(m=>m.id===entry.moduleId)!;
    showPanel(panelHeader(found?'MEMORY FOUND':'A MEMORY AWAITS',entry.title)+`<p class="panel-description">${found?escape(entry.body):`在${escape(entry.regionTitle)}寻找这颗星。靠近发光的记忆标记，按 G 拾起它。`}</p><p class="memory-source">${escape(m.title)} · ${found?'已收藏':'尚未收藏'}</p><button id="memory-visit" class="primary-button">前往记忆附近 ↗</button><button id="memory-project" class="quiet-button">打开相关项目</button><button id="memory-atlas" class="quiet-button">返回星图</button>${m.world?.connections.map(link=>`<button class="connection-card" data-memory-link="${link.target}"><b>${escape(link.title)} ↗</b><span>${escape(link.body)}</span></button>`).join('')??''}`);
    dialog.classList.add('memory-detail');
    $('#memory-visit').onclick=()=>{world?.visitMemory(entry.id);closePanel();};$('#memory-project').onclick=()=>openExhibit(m);$('#memory-atlas').onclick=showConstellation;
    dialog.querySelectorAll<HTMLButtonElement>('[data-memory-link]').forEach(b=>b.onclick=()=>{world?.visit(data.modules.find(m=>m.id===b.dataset.memoryLink)!);closePanel();});
  }
  function showConstellation(){
    const count=fragments.filter(f=>store.memories.has(f.id)).length;
    showPanel(panelHeader('MEMORY CONSTELLATION','每次探索，都有回声')+`<p class="panel-description">${count} / ${fragments.length} 段记忆已收藏。记忆来自项目档案，由你在世界里拾起。<br>新的经历，可以成为新的星。</p><div class="memory-atlas"><svg class="memory-links" viewBox="0 0 200 190" preserveAspectRatio="none" aria-hidden="true">${fragments.slice(1).map((f,i)=>{const a=starPosition(fragments[i].id,fragments),b=starPosition(f.id,fragments);return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;}).join('')}</svg>${fragments.map((f,i)=>{const p=starPosition(f.id,fragments);return `<button class="memory-star ${store.memories.has(f.id)?'found':''}" data-memory="${f.id}" style="left:${p.x/2}%;top:${p.y/1.9}%" aria-label="${escape(f.title)}" title="${escape(f.title)}">${actionIcon('sparkle',true)}<small>${String(i+1).padStart(2,'0')}</small></button>`;}).join('')}</div><div class="memory-index">${fragments.map((f,i)=>`<button data-memory="${f.id}"><span>${String(i+1).padStart(2,'0')}</span><b>${escape(f.title)}</b><small>${store.memories.has(f.id)?'已收藏':escape(f.regionTitle)}</small></button>`).join('')}</div><div class="atlas-actions"><button class="primary-button" id="atlas-visit">抵达中心星图 ↗</button><button class="quiet-button" id="atlas-growth">沿成长路径探索</button></div><p class="source-note">远方还会生长：量化投资交易所岛 · 机器人岛 · AI 研究院。它们目前是未开放的远景设想。</p>`);dialog.classList.add('memory-mode');
    dialog.querySelectorAll<HTMLButtonElement>('[data-memory]').forEach(b=>b.onclick=()=>openMemory(fragments.find(f=>f.id===b.dataset.memory)!));$('#atlas-visit').onclick=()=>{world?.visitConstellation();closePanel();};$('#atlas-growth').onclick=showGrowth;
  }
  function showGrowth(){
    showPanel(panelHeader('THE GROWTH PATH','从山脚，走向语言的山顶')+`<p class="panel-description">沿金色山径依次探索礼物、表情、双盲诗、猫咪与 XiangLM。两座 CNN 台地之间有蓝色视觉捷径。<br>这是一条概念成长路线，不是精确的履历时间线。</p><div class="growth-list">${growth.map(f=>`<article><small>${escape(f.growth!.label)}</small><h3>${escape(f.title)}</h3><p>${escape(f.regionTitle)} · ${store.memories.has(f.id)?'记忆已收藏':'等待你的探索'}</p><button class="quiet-button" data-track-memory="${f.id}">沿步道寻找 →</button><button class="quiet-button" data-visit-memory="${f.id}">抵达附近 ↗</button></article>`).join('')}</div>`);
    dialog.querySelectorAll<HTMLButtonElement>('[data-track-memory]').forEach(b=>b.onclick=()=>{tracking=fragments.find(f=>f.id===b.dataset.trackMemory);world?.trackMemory(tracking!.id);$('#trail-guide').hidden=false;$('#trail-text').textContent=`寻找 · ${tracking!.title} · 靠近按 G`;closePanel();});
    dialog.querySelectorAll<HTMLButtonElement>('[data-visit-memory]').forEach(b=>b.onclick=()=>{world?.visitMemory(b.dataset.visitMemory!);closePanel();});
  }
  const showHorizon=(id:string)=>{const place=horizons.find(p=>p.id===id);if(!place)return;showPanel(panelHeader(place.subtitle,place.title)+`<p class="panel-description">${escape(place.description)}</p><p class="source-note">未来区域 · 尚未开放步行进入</p><button id="horizon-view" class="primary-button">远眺这座岛 · 摄影模式 ↗</button>`);$('#horizon-view').onclick=()=>{closePanel();world?.viewHorizon(id);};};
  bus.on('horizon',showHorizon);$('#growth-open').insertAdjacentHTML('afterend','<button id="horizons-open" aria-label="远方岛屿" title="远方岛屿" class="secondary-nav">'+navIcon('horizons')+' <span>远方岛屿</span><b>FUTURE</b></button>');$('#horizons-open').onclick=()=>{showPanel(panelHeader('ON THE HORIZON','未来，在远处生长')+horizons.map(p=>`<button class="connection-card" data-horizon="${p.id}"><b>${escape(p.title)} ↗</b><span>${escape(p.description)}</span></button>`).join(''));dialog.querySelectorAll<HTMLButtonElement>('[data-horizon]').forEach(b=>b.onclick=()=>showHorizon(b.dataset.horizon!));};
  $('#memory-open').onclick=showConstellation;$('#growth-open').onclick=showGrowth;$('#memory-prompt').onclick=()=>world?.interactDiscovery();$('#trail-stop').onclick=()=>{tracking=undefined;world?.trackMemory(null);$('#trail-guide').hidden=true;};
  bus.on('memoryNearby',entry=>{$('#memory-prompt').hidden=!entry;$('#memory-near-name').textContent=entry==='constellation'?'记忆星图':entry?.title??'';$('#memory-prompt small').textContent=entry==='constellation'?'查看星图 · 回顾收藏':entry&&store.memories.has(entry.id)?'查看记忆 · 已收藏':'收集碎片 · 留下记忆';});
  bus.on('memory',entry=>{store.memories.add(entry.id);store.save();memoryProgress();$('#memory-prompt small').textContent='查看记忆 · 已收藏';openMemory(entry);bus.emit('sound','interaction');});bus.on('constellation',showConstellation);memoryProgress();
  function exitPhoto(capture:boolean|Event=true){world?.photoMode(false);document.querySelector<HTMLCanvasElement>('#world canvas')?.focus({preventScroll:true});if(capture!==false)world?.captureMouse();}
  const enterPhoto=()=>{if(!dialog.open&&world){if(world.isPhoto)exitPhoto();else world.photoMode(true);}};$('#photo-open').onclick=enterPhoto;$('#photo-exit').onclick=exitPhoto;
  bus.on('photo',active=>{document.body.classList.toggle('photo-mode',active);$('#photo-toolbar').hidden=!active;$<HTMLInputElement>('#photo-fov').value='60';$<HTMLSelectElement>('#photo-hour').value='';$('#photo-status').textContent='';});
  $<HTMLInputElement>('#photo-fov').oninput=e=>world?.photoFov(Number((e.target as HTMLInputElement).value));$<HTMLSelectElement>('#photo-hour').onchange=e=>{const value=(e.target as HTMLSelectElement).value;if(value)world?.setTime(Number(value));};
  const capturePhoto=async(postcard:boolean)=>{try{await world?.photograph(postcard);$('#photo-status').textContent=postcard?'明信片已导出':'照片已导出';}catch{$('#photo-status').textContent='导出失败，请重试';}};$('#photo-save').onclick=()=>void capturePhoto(false);$('#postcard-save').onclick=()=>void capturePhoto(true);
  window.addEventListener('keydown',e=>{if(dialog.open)return;if(world?.isPhoto&&(e.code==='Escape'||e.code==='KeyP'&&!e.repeat)){e.preventDefault();exitPhoto();return;}if(e.target instanceof Element&&e.target.closest('textarea,input,select'))return;if(e.code==='KeyP'&&!e.repeat){e.preventDefault();enterPhoto();}});

  function showGuide(){
    const chat=data.modules.find(m=>m.id===data.agents[0]?.chatModule);
    showPanel(panelHeader('YOUR WORLD COMPANION','跟随好奇心出发')+`<div class="guide-intro"><span class="guide-orb">✦</span><p>我是世界向导。告诉我你想了解什么，我会从展览资料中帮你找到入口。</p></div><span class="guide-mode">资料导览 · 不使用生成模型</span><form id="guide-form"><label for="guide-query">想探索的主题</label><input id="guide-query" placeholder="例如：语言模型、猫咪、音乐…" maxlength="100" required/><button class="primary-button">寻找下一站 <span>↗</span></button></form><div id="guide-results"></div>${chat?`<button class="collection-item" data-exhibit="${chat.id}"><span>✦</span><span><b>${escape(chat.title)} · 真实对话</b><small>打开配置的语言模型，体验独立单轮问答</small></span><span>↗</span></button>`:''}`);
    const route=(q:string)=>{const answer=guide(q,data);$('#guide-results').innerHTML=`<p class="panel-description">${escape(answer.text)}</p>${answer.exhibits.map(m=>`<button class="collection-item" data-exhibit="${m.id}"><span><b>${escape(m.title)}</b><small>${escape(m.subtitle)}</small></span><span>↗</span></button>`).join('')}`;wireExhibits();};
    $<HTMLFormElement>('#guide-form').onsubmit=e=>{e.preventDefault();route($<HTMLInputElement>('#guide-query').value);};wireExhibits();
  }
  app.insertAdjacentHTML('beforeend',`<div class="web-loading" id="world-loading"><span class="loading-symbol">✳</span><h1>XiangMeta</h1><p id="load-label" role="status">正在构建群岛…</p><progress id="world-progress" max="100" value="0" aria-label="构建世界"></progress><small id="load-percent">0%</small><a href="${sitePath('projects/')}">浏览项目 →</a></div>`);
  try{
    world=await World.create($('#world'),data,bus,store.discoveries,store.memories,(done,total,label)=>{
      const percent=Math.round(done/total*100);$<HTMLProgressElement>('#world-progress').value=percent;$('#load-percent').textContent=`${percent}%`;$('#load-label').textContent=`正在准备 · ${label}`;
    });
    $('#world-loading').remove();
  }catch(error){
    $('#world-loading').remove();
    $('#world').innerHTML=`<div class="render-error"><b>3D 渲染暂时不可用</b><p>请使用支持 WebGL2 的浏览器并开启硬件加速。</p><a href="${sitePath('projects/')}">继续浏览全部项目 →</a></div>`;console.error(error);
  }
  $('#world').addEventListener('world-context-lost',()=>{app.insertAdjacentHTML('beforeend',`<div class="web-loading"><h1>图形连接已中断</h1><p>重新加载世界，或继续浏览项目。</p><div class="loading-actions"><a href="${escape(location.href)}">重新进入</a><a href="${sitePath('projects/')}">View Projects →</a></div></div>`);});
  const entries=discoveries(data.regions);
  function stamps(){const count=entries.filter(d=>store.discoveries.has(d.id)).length;$('#stamp-count').textContent=`${count}/${entries.length}`;$('#journal').hidden=!entries.length;}
  $('#journal').onclick=()=>{
    const count=entries.filter(d=>store.discoveries.has(d.id)).length;
    showPanel(panelHeader('LITTLE WONDERS','旅行印记')+`<p class="panel-description">${count===entries.length?'每一座岛，都留下了你的好奇心。':'慢一点，也许会发现展台之外的小惊喜。'}<br>已发现 ${count} / ${entries.length} · 记录保存在本机</p><div class="stamp-list">${entries.map(d=>`<article class="stamp-card ${store.discoveries.has(d.id)?'found':''}" data-stamp="${d.id}"><span class="stamp-symbol" style="--stamp:${d.color}">${store.discoveries.has(d.id)?'✧':'◇'}</span><div><small>${escape(d.regionTitle)} · ${store.discoveries.has(d.id)?'已收集':'未发现'}</small><h3>${escape(d.title)}</h3><p>${escape(d.description)}</p><button class="quiet-button" data-wonder-region="${d.regionId}">前往入口 ↗</button></div></article>`).join('')}</div><p class="source-note">在区域中寻找这些小装置，靠近按 G 触发。风铃遵循右上角声音开关。</p>`);
    dialog.querySelectorAll<HTMLButtonElement>('[data-wonder-region]').forEach(button=>button.onclick=()=>{world?.focusRegion(button.dataset.wonderRegion!);closePanel();});
  };
  $('#discovery-prompt').onclick=()=>world?.interactDiscovery();
  $('#sky-settings').onclick=()=>{
    const time=world?.timeOfDay??9;
    showPanel(panelHeader('ISLAND TIME','让光，慢慢经过')+`<p class="panel-description">日出时月亮沉入海面，日落时月亮从另一侧升起。<br>白天是柔和的奶油色，夜晚是月光与温暖的灯带。</p><div class="time-presets"><button data-hour="6.2">☀<b>晨曦</b><small>06:12</small></button><button data-hour="10">◉<b>晴昼</b><small>10:00</small></button><button data-hour="17.8">◒<b>暮色</b><small>17:48</small></button><button data-hour="22">☾<b>月夜</b><small>22:00</small></button></div><label class="time-slider">时刻 <output id="time-value"></output><input aria-label="世界时刻" id="time-range" type="range" min="0" max="24" step=".05" value="${time}"/></label><label class="quality-option"><input type="checkbox" id="cycle-time" ${world?.timeCycling?'checked':''}/> 自然流转 · 16 分钟一昼夜</label><label class="weather-choice">天气<select id="weather-select" aria-label="世界天气"><option value="auto">自动 · 随机流转</option>${weatherKinds.map((kind:string)=>`<option value="${kind}">${weatherNames[kind as keyof typeof weatherNames]}</option>`).join('')}</select></label><p class="source-note">天气用约 12 秒渐变，自动模式每隔约 2–4 分钟流转。摄影模式暂停天气与云的移动。<br>选择时刻会平滑过渡。关闭自然流转，可以把世界留在喜欢的光线中。</p>`);
    const weather=$<HTMLSelectElement>('#weather-select');weather.value=world?.weather.automatic?'auto':world?.weather.kind??'sunny';weather.onchange=()=>world?.setWeather(weather.value);
    const input=$<HTMLInputElement>('#time-range'),output=$<HTMLOutputElement>('#time-value');
    const label=(h:number)=>output.value=`${String(Math.floor(h)%24).padStart(2,'0')}:${String(Math.floor(h%1*60)).padStart(2,'0')}`;label(time);
    input.oninput=()=>{const h=Number(input.value);label(h);world?.setTime(h);};
    dialog.querySelectorAll<HTMLButtonElement>('[data-hour]').forEach(b=>b.onclick=()=>{const h=Number(b.dataset.hour);input.value=String(h);label(h);world?.setTime(h);});
    $<HTMLInputElement>('#cycle-time').onchange=e=>world?.cycleTime((e.target as HTMLInputElement).checked);
  };
  bus.on('wonderNearby',d=>{$('#discovery-prompt').hidden=!d;$('#discovery-name').textContent=d?.title??'';$('#discovery-action').textContent=d?`${d.action} · ${store.discoveries.has(d.id)?'再次体验':'收集旅行印记'}`:'';});
  bus.on('discover',d=>{const first=!store.discoveries.has(d.id);store.discoveries.add(d.id);store.save();stamps();$('#discovery-action').textContent=`${d.action} · 再次体验`;toast(`${first?'发现新印记':'再次体验'} · ${d.title}${d.kind==='chimes'&&store.muted?' · 右上角开启声音，可听见风铃':''}`);});
  stamps();
  const overview=()=>{world?.overview();$('#current-region').textContent='世界总览';document.querySelectorAll('.region-nav').forEach(b=>b.classList.remove('active'));$('#overview').classList.add('active');};
  $('#overview').onclick=overview;$('#camera-reset').onclick=()=>world?.resumeWalk();$('#capture-look').onclick=()=>world?.captureMouse();$('.brand').onclick=e=>{e.preventDefault();overview();};
  document.querySelectorAll<HTMLButtonElement>('.region-nav').forEach(b=>b.onclick=()=>world?.focusRegion(b.dataset.region!));
  $('#collections').onclick=()=>collection();$('#favorites').onclick=()=>collection(true);$('#guide').onclick=showGuide;document.addEventListener('open-guide',showGuide);
  store.muted=true;
  const soundLabel=()=>{const text=store.muted?'开启音乐与音效':'暂停音乐与音效';$('#sound').classList.toggle('enabled',!store.muted);$('#sound').setAttribute('aria-label',text);$('#sound').setAttribute('aria-pressed',String(!store.muted));$('#sound').title=text;};
  $('#sound').onclick=async()=>{store.muted=!store.muted;soundLabel();try{await audio.setMuted(store.muted);store.save();toast(store.muted?'音乐与音效已暂停':'BGM、四季音乐与风铃已开启');}catch{store.muted=true;soundLabel();toast('音乐暂时不可用，请点击 ♪ 重试');}};
  soundLabel();
  $('#help').onclick=()=>{showPanel(panelHeader('FIELD NOTES','以自己的视角，走进世界')+`<div class="help-grid"><p><kbd>W A S D</kbd> 或方向键：行走；Shift 加速；Space 跳跃</p><p>点击画布或「进入环顾」：鼠标环顾；也可以按住拖动</p><p><kbd>F</kbd>：打开项目 GitHub；没有仓库链接时打开展览；作品前查看作品，港口查看航线</p><p><kbd>E</kbd>：查看项目简介、技术栈、结果与资料</p><p><kbd>R</kbd>：打开 Demo / 音乐 / MV，仅有链接的项目显示</p><p><kbd>G</kbd>：收集记忆或体验趣味装置</p><p><kbd>P</kbd>：摄影模式；WASD 平移，Q / E 升降，导出明信片</p><p>左侧区域导航：传送；「世界总览」：拖动旋转与滚轮缩放</p><p><kbd>Esc</kbd>：释放鼠标或关闭面板；关闭后可继续探索</p></div><label class="quality-option"><input type="checkbox" id="low-quality"/> 降低渲染质量，适配低性能设备</label><p class="source-note">科研模拟按论文方程计算，默认值是演示参数。个人音乐和 MV 在外部平台打开。</p>`);$<HTMLInputElement>('#low-quality').checked=world?.isLowQuality??false;$<HTMLInputElement>('#low-quality').onchange=e=>world?.quality((e.target as HTMLInputElement).checked);};
  const openExternal=(url:string)=>{if(document.pointerLockElement)document.exitPointerLock();window.open(url,'_blank','noopener,noreferrer');};
  bus.on('select',m=>openExhibit(m));bus.on('interact',m=>{const {github}=projectLinks(m);if(github)openExternal(github);else openExhibit(m,true);});
  bus.on('demo',m=>{const {demo}=projectLinks(m);if(demo)openExternal(demo);});
  bus.on('move',p=>{$('#coordinate').textContent=`X ${p.x.toFixed(1)} · Z ${p.z.toFixed(1)}`;});
  bus.on('view',mode=>{$('.main-world').classList.toggle('first-person',mode==='first-person');$('#view-name').textContent=mode==='first-person'?'第一人称探索':'世界地图';$('#capture-look').hidden=mode==='map';$('#look-hint').textContent=mode==='map'?'拖动旋转 · 滚轮缩放':'点击 / 拖动环顾 · Esc 释放鼠标';if(mode==='first-person')$('#current-region').textContent=data.regions.find(r=>r.english===$('.coordinates small').textContent)?.title??'中央枢纽';});
  bus.on('look',locked=>{$('.main-world').classList.toggle('mouse-locked',locked);$('#capture-look').textContent=locked?'Esc 释放鼠标':'点击进入环顾';});
  bus.on('region',id=>{const r=data.regions.find(r=>r.id===id);$('#current-region').textContent=r?.title??'中央枢纽';$('.coordinates small').textContent=r?.english??'XIANGMETA NEXUS';document.querySelectorAll<HTMLButtonElement>('.region-nav').forEach(b=>b.classList.toggle('active',b.dataset.region===id));$('#overview').classList.toggle('active',id==='nexus');});
  let nearbyModule:Exhibit|null=null,nearbyArtwork:ArtworkInteraction|null=null,nearbyHarbor=false;
  const renderNearby=()=>{
    const m=nearbyArtwork?.module??nearbyModule,actions=nearbyActions(nearbyModule,nearbyArtwork,nearbyHarbor),title=nearbyHarbor?'海风港口':nearbyArtwork?.label??m?.portfolio?.name??m?.title;
    const prompt=$('#interaction-prompt'),button=$<HTMLButtonElement>('#nearby'),primary=actions[0];button.disabled=!primary;button.innerHTML=`<kbd>${primary?.key??'F'}</kbd> ${title?escape(title):'靠近展台交互'}`;button.title=primary?`${primary.key} · ${primary.label}`:'靠近展台交互';
    prompt.hidden=!title;
    prompt.innerHTML=`<div class="nearby-copy"><b>${escape(title??'')}</b><small>${nearbyHarbor?'查看乘船航线':nearbyArtwork?'打开作品档案':escape(m?.portfolio?.summary??m?.subtitle??'')}</small></div><div class="nearby-actions">${actions.map(a=>a.href?`<a data-near-key="${a.key}" href="${escape(a.href)}" ${externalAttrs}><kbd>${a.key}</kbd> ${escape(a.label)} ↗</a>`:`<button data-near-key="${a.key}"><kbd>${a.key}</kbd> ${escape(a.label)}</button>`).join('')}</div>`;
    prompt.querySelectorAll<HTMLButtonElement>('button[data-near-key]').forEach(b=>b.onclick=()=>world?.interactExhibit(b.dataset.nearKey as InteractionKey));button.onclick=()=>primary&&world?.interactExhibit(primary.key);
  };
  bus.on('harborNearby',v=>{nearbyHarbor=v;renderNearby();});
  bus.on('nearby',m=>{nearbyModule=m;renderNearby();});bus.on('artworkNearby',a=>{nearbyArtwork=a;renderNearby();});
  bus.on('artwork',a=>{if(a.action.kind==='album')openExhibit(a.module,true,a.action.id);else immerse(a.module,a.action.index);});

  const requested=new URLSearchParams(location.search).get('project'),destination=data.modules.find(m=>m.id===requested);if(destination&&world){world.visit(destination);toast('已抵达项目展台 · E 查看简介');}
  progress();
  window.addEventListener('pagehide',event=>{if(event.persisted){world?.setPaused(true);return;}cleanup();world?.dispose();audio.dispose();});
  window.addEventListener('pageshow',event=>{if(event.persisted)world?.setPaused(false);});
}
boot().catch(error=>{app.innerHTML=`<div class="web-loading"><h1>世界暂时未能加载</h1><p>${escape(error.message)}</p><div class="loading-actions"><button id="retry">重新加载</button><a href="${sitePath('projects/')}">View Projects →</a></div></div>`;document.querySelector<HTMLButtonElement>('#retry')!.onclick=()=>location.reload();});
