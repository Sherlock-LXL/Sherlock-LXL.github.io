import {groundHeight} from '../../shared/terrain-height.mjs';
import type { z } from 'zod';
import type { moduleSchema, regionSchema } from '../../shared/schema.mjs';
export type Exhibit = z.infer<typeof moduleSchema> & { status: { state: 'configured' | 'unavailable' | 'exhibition'; detail: string } };
export type MemoryFragment=NonNullable<Exhibit['world']>['fragments'][number]&{moduleId:string;regionId:string;regionTitle:string;color:string;x:number;z:number};
export type Region = z.infer<typeof regionSchema>;
export type Discovery = NonNullable<Region['discovery']> & {id:string;regionId?:string;regionTitle:string;color:string;x:number;z:number;y?:number};
export function discoveries(regions:Region[]):Discovery[]{return regions.flatMap(r=>[...(r.discovery?[{...r.discovery,id:r.id}]:[]),...(r.discoveries??[]).map(d=>({...d,id:r.id+'-'+d.id}))].map(d=>({...d,y:groundHeight(r.position[0]+d.position[0],r.position[1]+d.position[1],regions),regionId:r.id,regionTitle:r.title,color:r.color,x:r.position[0]+d.position[0],z:r.position[1]+d.position[1]})));}
export interface MusicTrack {id:string;title:string;src:string;gain?:number}
export interface MusicManifest {playlist:MusicTrack[];seasonal:Record<string,MusicTrack>}
export interface Catalog { regions: Region[]; modules: Exhibit[]; agents: {id:string;title:string;chatModule:string}[]; tools?:{id:string;title:string;endpoint:string;capabilities:string[];fields:NonNullable<Exhibit['interface']>['fields']}[]; warnings: string[]; imagePreviews?:{src:string;preview:string}[]; audio?:MusicManifest }
export interface ModelResult { text: string; mode: 'live'; predictions?: { label: string; score: number }[] }

export type ArtworkAction={kind:"album";id:string}|{kind:"photo";index:number};
export interface ArtworkInteraction {id:string;label:string;module:Exhibit;x:number;z:number;approach:{x:number;z:number};action:ArtworkAction}
