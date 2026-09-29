import type {Exhibit} from './types';
import {escapeHTML as esc,externalAttrs} from './portfolio';

export function mountAlbumGallery(host:HTMLElement,module:Exhibit,initialAlbum?:string){
  if(!module.albums?.length)return;
  const albums=[...module.albums].sort((a,b)=>a.order-b.order);
  const section=document.createElement('section');section.className='album-gallery';
  section.innerHTML=`<div class="album-shelf">${albums.map(a=>`<button class="album-cover" data-album="${a.id}"><img src="${esc(a.cover)}" alt="${esc(a.title)} 专辑封面" loading="lazy"><span>${String(a.order).padStart(2,'0')} · ${esc(a.title)}</span></button>`).join('')}</div><article class="album-detail"></article>`;
  host.prepend(section);
  const show=(id:string)=>{
    const a=albums.find(a=>a.id===id)??albums[0];
    section.querySelectorAll<HTMLButtonElement>('[data-album]').forEach(b=>{b.classList.toggle('active',b.dataset.album===a.id);b.setAttribute('aria-pressed',String(b.dataset.album===a.id));});
    section.querySelector('.album-detail')!.innerHTML=`<h3>${esc(a.title)}</h3><p class="album-credit">${esc(a.credit)}</p>
      ${a.link?`<a class="primary-button external-link" href="${esc(a.link)}" ${externalAttrs}>${a.link.includes('music.163.com')?'网易云音乐 · 收听专辑':'哔哩哔哩 · 观看 MV'} ↗</a>`:''}
      <p class="source-note">在新标签页打开作品，回到这里继续探索。</p>
      ${a.tracks.length?`<details class="album-archive"><summary>精选曲目与歌词档案</summary>${a.tracks.map(t=>`<details><summary>${esc(t.title)}</summary><pre class="album-lyrics">${esc(t.lyrics)}</pre></details>`).join('')}</details>`:''}`;
  };
  section.querySelectorAll<HTMLButtonElement>('[data-album]').forEach(b=>b.onclick=()=>show(b.dataset.album!));show(initialAlbum??albums[0].id);
}
