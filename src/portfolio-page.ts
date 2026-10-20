import './portfolio.css';
import {diagonalArrow} from './core/inline-arrow';
import {navIcon} from './core/nav-icons';
import {readContent,sitePath,escapeHTML as esc,externalAttrs,type Portfolio,type Project} from './core/portfolio';
const host=document.querySelector<HTMLDivElement>('#portfolio')!;
const isHome=document.body.dataset.page==='home';
const labels={AI:'AI / 人工智能',Research:'Research / 科研',Engineering:'Engineering / 工程',Creative:'Music & Creative / 创作'};
const link=(href:string,text:string,cls='text-link')=>`<a class="${cls}" href="${esc(href)}" ${externalAttrs}>${text} ${diagonalArrow}</a>`;
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
      ${p.albums?`<div class="record-grid">${p.albums.map(a=>`<a href="${esc(a.link)}" ${externalAttrs}><img loading="lazy" decoding="async" src="${esc(a.cover)}" alt="${esc(a.title)} 专辑封面" width="240" height="240"><b>${esc(a.title)} ${diagonalArrow}</b><small>${esc(a.credit)}</small></a>`).join('')}</div>`:''}
      ${p.media.length?`<div class="photo-grid">${p.media.map(m=>`<a href="${esc(m.src)}" ${externalAttrs}><img loading="lazy" decoding="async" src="${esc(m.thumbnail??m.src)}" alt="${esc(m.title)}" width="${m.width??640}" height="${m.height??360}"><span>${esc(m.title)}${m.location?' · '+esc(m.location):''} ${diagonalArrow}</span></a>`).join('')}</div>`:''}
      ${p.screenshots.map(src=>`<img class="project-shot" loading="lazy" src="${esc(src)}" alt="${esc(p.name)} 项目截图">`).join('')}
      <small class="credit">${p.owner==='team'?'团队项目':'个人项目'} · 资料来自项目原始档案</small>
    </div></details>`}
  </article>`;
}
/** Brushed water: rows of soft waves that tighten toward the horizon, as in the world's painted sea. */
const waves=(top:number,rows:number,width:number)=>Array.from({length:rows},(_,i)=>{
  const y=top+i*11+i*i*1.4,w=14+i*3,a=1.2+i*.45;
  return `<path d="M${-w} ${y.toFixed(1)}q${w/4} ${-a} ${w/2} 0${`t${w/2} 0`.repeat(Math.ceil((width+w*2)/(w/2)))}"/>`;
}).join('');
/** The hero atlas is a round album leaf: blue-green peaks over brushed water, crossed by the hub's orbits. */
const fan=`<svg class="atlas-painting" viewBox="0 0 400 400" aria-hidden="true" focusable="false"><defs>
  <radialGradient id="fan-silk" cx=".5" cy=".36" r=".72"><stop offset="0" stop-color="#fbf6ea"/><stop offset=".72" stop-color="#efe5cf"/><stop offset="1" stop-color="#e2d3b3"/></radialGradient>
  <linearGradient id="fan-peak-wash" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#355f7a"/><stop offset=".4" stop-color="#4f9a80"/><stop offset=".78" stop-color="#a7b98d"/><stop offset="1" stop-color="#cfa96f"/></linearGradient>
  <linearGradient id="fan-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f93a3" stop-opacity=".5"/><stop offset="1" stop-color="#6f93a3" stop-opacity="0"/></linearGradient>
  <linearGradient id="fan-sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ece6d2"/><stop offset="1" stop-color="#cbd9cf"/></linearGradient>
  <linearGradient id="fan-mist" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f0e2" stop-opacity="0"/><stop offset=".72" stop-color="#f6f0e2" stop-opacity=".94"/><stop offset="1" stop-color="#f6f0e2" stop-opacity="0"/></linearGradient>
  <clipPath id="fan-clip"><circle cx="200" cy="200" r="184"/></clipPath></defs>
  <circle class="fan-mount" cx="200" cy="200" r="192"/>
  <g clip-path="url(#fan-clip)"><rect width="400" height="400" fill="url(#fan-silk)"/>
    <circle class="fan-sun" cx="268" cy="100" r="16"/>
    <path class="fan-cloud" d="M52 138q16-11 34-3q13-10 29-1q15-7 27 4q-46 8-90 0Z M236 160q15-9 31-2q12-8 25 1q13-5 22 6q-40 6-78-5Z"/>
    <path fill="url(#fan-far)" d="M0 242Q34 206 66 224T124 204T182 216T240 196T302 212T358 198T400 216V292H0Z"/>
    <path class="fan-peak" fill="url(#fan-peak-wash)" d="M14 270C42 248 60 222 76 200C90 180 100 156 112 134C118 122 124 110 132 102C140 110 146 124 152 138C160 154 170 168 178 186C186 202 198 216 214 232C224 242 236 254 254 270Z"/>
    <path class="fan-peak far-peak" fill="url(#fan-peak-wash)" d="M186 270C208 252 228 230 246 208C260 190 276 170 290 156C298 148 306 150 312 158C322 170 330 184 338 194C344 186 352 184 358 190C370 204 382 224 404 246V270Z"/>
    <path class="fan-strokes" d="M98 172q10 10 4 26M120 148q8 14 0 30M148 168q-6 14 4 28M168 196q-4 10 2 20M280 178q8 10 2 24M318 184q6 10 0 20M352 200q4 8 0 16"/>
    <rect y="226" width="400" height="50" fill="url(#fan-mist)"/><rect y="264" width="400" height="140" fill="url(#fan-sea)"/>
    <g class="fan-waves">${waves(274,8,400)}</g>
    <ellipse class="fan-orbit" cx="200" cy="206" rx="178" ry="52" transform="rotate(-12 200 206)"/><ellipse class="fan-orbit dashed" cx="200" cy="206" rx="132" ry="88" transform="rotate(22 200 206)"/></g>
  <circle class="fan-rim" cx="200" cy="200" r="184"/>
  <g class="fan-inscription">${[...'山海册页'].map((c,i)=>`<text x="330" y="${82+i*15}">${c}</text>`).join('')}<rect x="324.5" y="136" width="11" height="11" rx="1.5"/></g></svg>`;
/** The invitation is a short hand scroll: distant ranges along its foot, the nearer peaks behind the way in. */
const scroll=`<svg class="invitation-painting" viewBox="0 0 1000 170" preserveAspectRatio="xMaxYMax slice" aria-hidden="true" focusable="false"><defs>
  <linearGradient id="scroll-peak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#355f7a"/><stop offset=".5" stop-color="#4f9a80"/><stop offset="1" stop-color="#cfa96f" stop-opacity=".3"/></linearGradient>
  <linearGradient id="scroll-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f93a3" stop-opacity=".45"/><stop offset="1" stop-color="#6f93a3" stop-opacity="0"/></linearGradient></defs>
  <path fill="url(#scroll-far)" d="M0 140Q80 116 160 128T330 112T500 124T660 104T820 118T1000 100V170H0Z"/>
  <path class="fan-peak" fill="url(#scroll-peak)" d="M560 170C600 150 630 120 660 94C676 80 690 60 706 50C716 58 724 72 734 86C750 108 770 122 800 134C820 118 838 102 856 90C868 82 880 84 890 94C910 112 940 134 1004 150V170Z"/>
  <path class="fan-strokes" d="M690 92q8 12 2 28M720 84q6 12 0 26M866 104q6 10 0 22"/>
  <g class="fan-waves">${waves(150,3,1000)}</g></svg>`;
function atlas(){
  return `<div class="atlas" aria-label="XiangMeta 世界索引：AI 山、科研谷、个人博物馆、未名拾音">${fan}
    <span class="atlas-coordinate">31° N / A PERSONAL UNIVERSE</span>
    <a class="isle isle-ai" href="${sitePath('projects/')}?category=AI"><span class="isle-symbol">${navIcon('mountain')}</span><b>AI Mountain</b><small>语言 · 视觉 · 生成</small><i>01</i></a>
    <a class="isle isle-research" href="${sitePath('projects/')}?category=Research"><span class="isle-symbol">${navIcon('science')}</span><b>Science Valley</b><small>气泡 · 声音 · 光</small><i>02</i></a>
    <a class="atlas-core" href="${worldURL()}" aria-label="进入 XiangMeta"><span class="xiang-logo-glyph">想</span><b>XIANGMETA</b></a>
    <a class="isle isle-creative" href="${sitePath('projects/')}?category=Creative"><span class="isle-symbol">${navIcon('museum')}</span><b>Personal Museum</b><small>旋律 · 光影 · 记忆</small><i>03</i></a>
    <span class="atlas-caption">EVERY CREATION HAS A COORDINATE.</span>
  </div>`;
}
async function boot(){
  const {profile,projects}=await readContent<Portfolio>('projects');
  const touchExperience=matchMedia('(pointer: coarse) and (max-width: 900px)').matches;
  const worldHint=touchExperience?'摇杆移动 · 拖动画面环顾 · 点击跳跃与展台操作':'WASD 行走 · 鼠标环顾 · F 打开 GitHub / 展览 · E 查看简介';
  const categories=[...new Set(projects.map(p=>p.category))];
  const navigation=`<a class="wordmark" href="${sitePath()}"><span class="xiang-logo" aria-hidden="true">想</span> XiangMeta<span class="wordmark-dot">/</span><small>${esc(profile.handle)}</small></a><nav aria-label="主导航"><a href="${sitePath()}#about">About</a><a href="${sitePath('projects/')}" ${!isHome?'aria-current="page"':''}>Projects</a>${link(profile.github,'GitHub')}<a class="nav-enter" href="${worldURL()}">Enter world ${diagonalArrow}</a></nav>`;
  const heading=isHome?`<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="live-dot"></span> 山海册页 · THE PERSONAL ATLAS</p><h1>李湘伦<span class="hero-handle">Sherlock-LXL</span></h1><p class="disciplines">${esc(profile.disciplines)}</p><p class="hero-description">让好奇心带路，<br>让每一次创造成为新的大陆。</p><div class="hero-actions"><a class="button primary" href="${worldURL()}">Enter XiangMeta <span>${diagonalArrow}</span></a><a class="button" href="${sitePath('projects/')}">View Projects <span>→</span></a></div><p class="device-note">${touchExperience?'已适配触控移动、环顾与跳跃':'自由探索 3D 世界 · 桌面浏览器体验更佳'}</p></div>${atlas()}</section>
    <div class="index-strip"><span>ONE WORLD. MANY WAYS TO CREATE.</span><div><b>${String(projects.length).padStart(2,'0')}</b> PROJECTS <i>/</i> <b>04</b> REGIONS <i>/</i> ALWAYS GROWING</div></div>
    <section class="about-section" id="about"><div><p class="eyebrow">01 / ABOUT</p><h2>在不同领域之间，<br>寻找同一种好奇。</h2></div><div><p>${esc(profile.intro)}</p><p>XiangMeta 是我的个人交互作品集。你可以沿着山径找到语言模型，在实验室里观察气泡，也可以走进展廊，听见音乐、看见旅途。</p><a class="text-link" href="${sitePath('projects/')}">直接浏览所有项目 →</a></div></section>`:
    `<section class="projects-heading"><p class="eyebrow">THE PROJECT ARCHIVE</p><h1>每一次创造，<br>都有坐标<span>。</span></h1><p>从模型、方程到旋律。这里是 ${esc(profile.name)} 的项目与创作档案。</p><a class="text-link" href="${worldURL()}">换一种方式探索 · 进入 XiangMeta ${diagonalArrow}</a></section>`;
  host.innerHTML=`<a class="skip-link" href="#main">跳转正文</a><header class="site-header">${navigation}</header><main id="main">${heading}
    <section class="projects-section" id="projects"><div class="section-heading"><div><p class="eyebrow">${isHome?'02 / SELECTED WORK':'EXPLORE BY INTEREST'}</p><h2>${isHome?'几处值得停留的地方。':'项目 / Projects'}</h2></div>${isHome?`<a href="${sitePath('projects/')}">全部 ${projects.length} 个项目 ${diagonalArrow}</a>`:'<span id="result-count" role="status"></span>'}</div>
    ${isHome?'':`<div class="project-tools"><div class="filters" aria-label="项目分类">${['All',...categories].map(c=>`<button data-filter="${c}" aria-pressed="${c==='All'}">${c==='All'?'全部':esc(labels[c as keyof typeof labels])}</button>`).join('')}</div><label class="search-label"><span>搜索项目</span><input id="project-search" type="search" placeholder="名称、技术或关键词…" autocomplete="off"></label></div>`}
    <div class="project-grid">${(isHome?projects.filter(p=>p.featured):projects).map((p,i)=>card(p,i,isHome)).join('')}</div><p id="empty-projects" hidden>没有找到匹配的项目，请换一个关键词。</p></section>
    ${isHome?`<section class="world-invitation">${scroll}<div><p class="eyebrow">03 / GO EXPLORING</p><h2>走进作品所在的世界。</h2><p>${worldHint}</p></div><a class="button primary" href="${worldURL()}">Enter XiangMeta ${diagonalArrow}</a></section>`:''}
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
