import {projectLinks} from './portfolio';
import type {ArtworkInteraction,Exhibit} from './types';

export type InteractionKey='F'|'E'|'R';
export interface NearbyAction {key:InteractionKey;label:string;href?:string}

/** One action list for the physical console, HUD and keyboard availability. */
export function nearbyActions(module:Exhibit|null,artwork:ArtworkInteraction|null=null,harbor=false):NearbyAction[]{
  if(harbor)return [{key:'F',label:'查看航线'}];
  const m=artwork?.module??module;
  if(!m)return [];
  const {github,demo}=projectLinks(m);
  const primary:NearbyAction=artwork
    ?{key:'F',label:artwork.action.kind==='album'?'查看专辑':'查看摄影'}
    :{key:'F',label:github?'GitHub':'打开展览',...(github?{href:github}:{})};
  return [
    primary,
    {key:'E',label:'项目详情'},
    ...(demo?[{key:'R' as const,label:m.albums?'音乐':m.id==='weiming'?'MV':'Demo',href:demo}]:[])
  ];
}

export const actionHint=(actions:NearbyAction[])=>actions.map(a=>`[${a.key}] ${a.label}`).join('   ·   ');
