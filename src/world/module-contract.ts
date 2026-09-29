import type * as T from 'three';
import type {Exhibit,Region,ArtworkAction} from '../core/types';
import type {Obstacle} from './scenery';
import {invoke} from '../core/api';

/** Trusted, build-time extension. Source TypeScript is never evaluated from a downloaded manifest. */
export interface WorldModuleContext {
  module:Exhibit;region:Region;
  invoke(input:Record<string,unknown>,signal?:AbortSignal):Promise<unknown>;
}
export interface WorldModuleScene {
  root:T.Group;
  /** Local x/z coordinates. Omit to retain the chosen visual preset's collider layout. */
  colliders?:Obstacle[];
  /** Local wall and viewing coordinates; core resolves region placement and rotation. */
  artworks?:{id:string;label:string;position:[number,number];approach:[number,number];action:ArtworkAction}[];
  update?(delta:number,hour:number):void;
  dispose?():void;
}
export interface SceneFactory {version:1;create(context:WorldModuleContext):WorldModuleScene}
export interface InteractionFactory {version:1;create(context:WorldModuleContext):{onVisit?():void;onInteract?():void;dispose?():void}}
// Vite discovers future source modules without editing this registry.
const scenes=import.meta.glob<{default:SceneFactory}>('../../modules/*/scene.ts',{eager:true});
const interactions=import.meta.glob<{default:InteractionFactory}>('../../modules/*/interactions.ts',{eager:true});
export function moduleExtensions(module:Exhibit,region:Region){
  const context:WorldModuleContext={module,region,invoke:(input,signal)=>invoke(module.id,input,signal??new AbortController().signal)};
  const scene=scenes[`../../modules/${module.id}/scene.ts`]?.default,hooks=interactions[`../../modules/${module.id}/interactions.ts`]?.default;
  if(scene&&scene.version!==1||hooks&&hooks.version!==1)throw new Error(`Unsupported scene contract: ${module.id}`);
  return {scene:scene?.create(context),hooks:hooks?.create(context)};
}
