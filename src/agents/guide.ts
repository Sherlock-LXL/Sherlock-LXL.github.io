import type { Catalog, Exhibit } from '../core/types';
// Deliberately grounded in curated exhibition metadata. Model chat is a separate capability.
export function guide(query:string,catalog:Catalog):{text:string;exhibits:Exhibit[]} {
  const q=query.toLowerCase().trim();
  const scored=catalog.modules.map(m=>{
    const words=[m.title,m.subtitle,...m.tags,...m.facts.flatMap(f=>[f.label,f.value]),...(m.world?.fragments??[]).flatMap(f=>[f.title,f.body]),...(m.world?.connections??[]).map(c=>c.title)].join(' ').toLowerCase();
    let score=0;for(let i=0;i<q.length-1;i++)if(words.includes(q.slice(i,i+2)))score++;
    return {m,score};
  }).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
  const exhibits=scored.length?scored.map(s=>s.m):catalog.regions.slice(0,3).flatMap(r=>catalog.modules.filter(m=>m.region===r.id).slice(0,1));
  return {text:scored.length?'这些展品与你想探索的内容有关。资料来自展品清单，你可以直接前往，或打开 XiangLM 体验真实模型问答。':'可以从 AI 山脉开始，沿着步道去科学山谷，再到个人博物馆停留。未名拾音是独立的团队品牌区域。',exhibits};
}
