import './portfolio.css';
import {readContent,sitePath,escapeHTML as esc,externalAttrs,type Portfolio,type Project} from './core/portfolio';
const host=document.querySelector<HTMLDivElement>('#portfolio')!;
const isHome=document.body.dataset.page==='home';
const labels={AI:'AI / 人工智能',Research:'Research / 科研',Engineering:'Engineering / 工程',Creative:'Music & Creative / 创作'};
const link=(href:string,text:string,cls='text-link')=>`<a class="${cls}" href="${esc(href)}" ${externalAttrs}>${text} ↗</a>`;
const worldURL=(id?:string)=>sitePath('world/')+(id?`?project=${encodeURIComponent(id)}`:'');
function card(p:Project,index:number,compact=false){
  return `<article class="project-card" id="${p.id}" data-category="${p.category}">
    <div class="card-top"><span>${esc(labels[p.category])}</span><span>${String(index+1).padStart(2,'0')}</span></div>
    <h3>${esc(p.name)}</h3><p>${esc(p.description)}</p>
    <div class="technologies">${p.technologies.map(t=>`<span>${esc(t)}</span>`).join('')}</div>
    <div class="project-links">${p.github?link(p.github,'GitHub'):''}${p.demo?link(p.demo,p.albums?'网易云音乐':p.id==='weiming'?'观看 MV':'Demo'):''}<a href="${worldURL(p.id)}">${p.simulation?'交互模拟':'世界坐标'} →</a></div>
    ${compact?`<a class="card-detail" href="${sitePath('projects/')}#${p.id}">项目档案 <span>＋</span></a>`:`
    <details><summary>项目档案 <span>＋</span></summary><div class="project-details">
      <div class="facts">${p.facts.map(f=>`<div><b>${esc(f.value)}</b><small>${esc(f.label)}</small></div>`).join('')}</div>
      ${p.story.map(s=>`<h4>${esc(s.title)}</h4><p>${esc(s.body)}</p>`).join('')}
      ${p.albums?`<div class="record-grid">${p.albums.map(a=>`<a href="${esc(a.link)}" ${externalAttrs}><img loading="lazy" decoding="async" src="${esc(a.cover)}" alt="${esc(a.title)} 专辑封面" width="240" height="240"><b>${esc(a.title)} ↗</b><small>${esc(a.credit)}</small></a>`).join('')}</div>`:''}
      ${p.media.length?`<div class="photo-grid">${p.media.map(m=>`<a href="${esc(m.src)}" ${externalAttrs}><img loading="lazy" decoding="async" src="${esc(m.thumbnail??m.src)}" alt="${esc(m.title)}" width="${m.width??640}" height="${m.height??360}"><span>${esc(m.title)}${m.location?' · '+esc(m.location):''} ↗</span></a>`).join('')}</div>`:''}
      ${p.screenshots.map(src=>`<img class="project-shot" loading="lazy" src="${esc(src)}" alt="${esc(p.name)} 项目截图">`).join('')}
      <small class="credit">${p.owner==='team'?'团队项目':'个人项目'} · 资料来自项目原始档案</small>
    </div></details>`}
  </article>`;
}
function atlas(){
  return `<div class="atlas" aria-label="XiangMeta 世界索引：AI 山、科研谷、个人博物馆、未名拾音">
    <div class="atlas-ring ring-one"></div><div class="atlas-ring ring-two"></div><div class="atlas-axis"></div>
    <span class="atlas-coordinate">31° N / A PERSONAL UNIVERSE</span>
    <a class="isle isle-ai" href="${sitePath('projects/')}?category=AI"><span class="isle-symbol">△</span><b>AI Mountain</b><small>语言 · 视觉 · 生成</small><i>01</i></a>
    <a class="isle isle-research" href="${sitePath('projects/')}?category=Research"><span class="isle-symbol">◌</span><b>Science Valley</b><small>气泡 · 声音 · 光</small><i>02</i></a>
    <a class="atlas-core" href="${worldURL()}" aria-label="进入 XiangMeta"><span>✳</span><b>XIANGMETA</b></a>
    <a class="isle isle-creative" href="${sitePath('projects/')}?category=Creative"><span class="isle-symbol">♫</span><b>Personal Museum</b><small>旋律 · 光影 · 记忆</small><i>03</i></a>
    <span class="atlas-caption">EVERY CREATION HAS A COORDINATE.</span>
  </div>`;
}
async function boot(){
  const {profile,projects}=await readContent<Portfolio>('projects');
  const touchExperience=matchMedia('(pointer: coarse) and (max-width: 900px)').matches;
  const worldHint=touchExperience?'方向键移动 · 拖动画面环顾 · 点击跳跃与展台操作':'WASD 行走 · 鼠标环顾 · F 打开 GitHub / 展览 · E 查看简介';
  const categories=[...new Set(projects.map(p=>p.category))];
  const navigation=`<a class="wordmark" href="${sitePath()}"><span>✳</span> XiangMeta<span class="wordmark-dot">/</span><small>${esc(profile.handle)}</small></a><nav aria-label="主导航"><a href="${sitePath()}#about">About</a><a href="${sitePath('projects/')}" ${!isHome?'aria-current="page"':''}>Projects</a>${link(profile.github,'GitHub')}<a class="nav-enter" href="${worldURL()}">Enter world ↗</a></nav>`;
  const heading=isHome?`<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="live-dot"></span> THE PERSONAL ATLAS</p><h1>李湘伦<span class="hero-handle">Sherlock-LXL</span></h1><p class="disciplines">${esc(profile.disciplines)}</p><p class="hero-description">让好奇心带路，<br>让每一次创造成为新的大陆。</p><div class="hero-actions"><a class="button primary" href="${worldURL()}">Enter XiangMeta <span>↗</span></a><a class="button" href="${sitePath('projects/')}">View Projects <span>→</span></a></div><p class="device-note">${touchExperience?'已适配触控移动、环顾与跳跃':'自由探索 3D 世界 · 桌面浏览器体验更佳'}</p></div>${atlas()}</section>
    <div class="index-strip"><span>ONE WORLD. MANY WAYS TO CREATE.</span><div><b>${String(projects.length).padStart(2,'0')}</b> PROJECTS <i>/</i> <b>04</b> REGIONS <i>/</i> ALWAYS GROWING</div></div>
    <section class="about-section" id="about"><div><p class="eyebrow">01 / ABOUT</p><h2>在不同领域之间，<br>寻找同一种好奇。</h2></div><div><p>${esc(profile.intro)}</p><p>XiangMeta 是我的个人交互作品集。你可以沿着山径找到语言模型，在实验室里观察气泡，也可以走进展廊，听见音乐、看见旅途。</p><a class="text-link" href="${sitePath('projects/')}">直接浏览所有项目 →</a></div></section>`:
    `<section class="projects-heading"><p class="eyebrow">THE PROJECT ARCHIVE</p><h1>每一次创造，<br>都有坐标<span>。</span></h1><p>从模型、方程到旋律。这里是 ${esc(profile.name)} 的项目与创作档案。</p><a class="text-link" href="${worldURL()}">换一种方式探索 · 进入 XiangMeta ↗</a></section>`;
  host.innerHTML=`<a class="skip-link" href="#main">跳转正文</a><header class="site-header">${navigation}</header><main id="main">${heading}
    <section class="projects-section" id="projects"><div class="section-heading"><div><p class="eyebrow">${isHome?'02 / SELECTED WORK':'EXPLORE BY INTEREST'}</p><h2>${isHome?'几处值得停留的地方。':'项目 / Projects'}</h2></div>${isHome?`<a href="${sitePath('projects/')}">全部 ${projects.length} 个项目 ↗</a>`:'<span id="result-count" role="status"></span>'}</div>
    ${isHome?'':`<div class="project-tools"><div class="filters" aria-label="项目分类">${['All',...categories].map(c=>`<button data-filter="${c}" aria-pressed="${c==='All'}">${c==='All'?'全部':esc(labels[c as keyof typeof labels])}</button>`).join('')}</div><label class="search-label"><span>搜索项目</span><input id="project-search" type="search" placeholder="名称、技术或关键词…" autocomplete="off"></label></div>`}
    <div class="project-grid">${(isHome?projects.filter(p=>p.featured):projects).map((p,i)=>card(p,i,isHome)).join('')}</div><p id="empty-projects" hidden>没有找到匹配的项目，请换一个关键词。</p></section>
    ${isHome?`<section class="world-invitation"><div><p class="eyebrow">03 / GO EXPLORING</p><h2>走进作品所在的世界。</h2><p>${worldHint}</p></div><a class="button primary" href="${worldURL()}">Enter XiangMeta ↗</a></section>`:''}
    <section class="contact-section" id="contact"><div><p class="eyebrow">KEEP IN TOUCH</p><h2>下一次连接，从这里开始。</h2></div><div>${link(profile.github,'GitHub / Sherlock-LXL')}${link(profile.music,'网易云音乐 / 个人主页')}</div></section></main>
    <footer class="site-footer"><span>© ${new Date().getFullYear()} ${esc(profile.name)} · XiangMeta</span><span>BUILT WITH CURIOSITY.</span><a href="${sitePath()}">回到起点 ↑</a></footer>`;
  if(!isHome){
    const params=new URLSearchParams(location.search);
    let category=categories.includes(params.get('category') as Project['category'])?params.get('category')!:'All';
    const search=document.querySelector<HTMLInputElement>('#project-search')!;
    search.value=params.get('q')??'';
    const filter=()=>{
      const q=search.value.trim().toLocaleLowerCase();
      let count=0;
      projects.forEach(p=>{const visible=(category==='All'||p.category===category)&&[p.name,p.description,...p.technologies].join(' ').toLocaleLowerCase().includes(q);document.getElementById(p.id)!.hidden=!visible;if(visible)count++;});
      document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===category)));
      document.querySelector('#result-count')!.textContent=`${count} / ${projects.length} PROJECTS`;
      document.querySelector<HTMLElement>('#empty-projects')!.hidden=count>0;
      const url=new URL(location.href);if(category==='All')url.searchParams.delete('category');else url.searchParams.set('category',category);if(q)url.searchParams.set('q',search.value);else url.searchParams.delete('q');history.replaceState(null,'',url);
    };
    search.oninput=filter;
    document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(b=>b.onclick=()=>{category=b.dataset.filter!;filter();});
    const revealHash=()=>{const id=decodeURIComponent(location.hash.slice(1)),p=projects.find(p=>p.id===id);if(!p)return;category='All';search.value='';filter();const item=document.getElementById(id)!;item.querySelector('details')!.open=true;item.scrollIntoView({block:'start'});};
    filter();revealHash();window.addEventListener('hashchange',revealHash);
  }
}
boot().catch(error=>{host.querySelector('[role=status]')!.textContent=error.message;});
