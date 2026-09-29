import type {Exhibit} from './types';

export const sitePath=(path='')=>`${import.meta.env.BASE_URL}${path.replace(/^\//,'')}`;
export const escapeHTML=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function resolveAssets<T>(value:T):T {
  if(typeof value==='string')return (value.startsWith('/assets/')?sitePath(value):value) as T;
  if(Array.isArray(value))return value.map(resolveAssets) as T;
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,resolveAssets(item)])) as T;
  return value;
}
export async function readContent<T>(name:string):Promise<T>{
  const response=await fetch(sitePath(`content/${name}.json`));
  if(!response.ok)throw new Error('内容暂时未能加载，请刷新重试。');
  return resolveAssets(await response.json());
}
export const externalAttrs='target="_blank" rel="noopener noreferrer"';
export const projectLinks=(m:Exhibit)=>({github:m.portfolio?.github,demo:m.portfolio?.demo??m.link});
export interface Project {
  id:string; name:string; category:'AI'|'Research'|'Engineering'|'Creative'; description:string;
  technologies:string[]; github?:string; demo?:string; featured:boolean; order:number;
  position:[number,number]; region:string; owner:'personal'|'team';
  facts:Exhibit['facts'];story:Exhibit['story'];albums?:Exhibit['albums'];media:Exhibit['media'];
  screenshots:string[];simulation?:Exhibit['simulation'];
}
export interface Portfolio {
  profile:{name:string;handle:string;disciplines:string;intro:string;github:string;music:string};
  projects:Project[];
}
