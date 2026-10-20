import * as T from 'three';
import type {WorldModuleScene} from './module-contract';
import type {ArtworkAction} from '../core/types';
import {material,mesh,softBox} from './architecture';
import {sign,type Obstacle} from './scenery';
import {batchStatic} from './optimizer';
import {regionTexture} from './lazy-texture';
import {kit,place,roof,column,beam} from './vernacular';

export interface GalleryPicture {title:string;src:string;width?:number;height?:number;subtitle?:string;action:ArtworkAction}
/** A covered gallery (langlang): plastered walls under two tiled side roofs; the central aisle stays open to the sky. */
export function exhibitionGallery(pictures:GalleryPicture[],accent:string,kind:'photography'|'albums',region:string){
  const root=new T.Group();root.name=`${kind}-arcade`;
  const stone=kit.stone(),plaster=kit.plaster(),timber=kit.timber();
  const colliders:Obstacle[]=[],artworks:NonNullable<WorldModuleScene["artworks"]>=[];
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material=stone)=>mesh(root,softBox(w,h,d),m,x,y,z);
  box(7.8,.08,10.6,0,.04,-1.25); // Flush, accessible floor, front edge at z=4.
  box(7.8,3.6,.22,0,1.8,-6.5,plaster);colliders.push({x:0,z:-6.5,radius:0,halfX:3.9,halfZ:.16,height:3.7});
  roof(root,{width:7.6,depth:.22,height:.24,overhang:.22,lift:.06,thickness:.07,y:3.6,z:-6.5});
  for(const x of [-3.75,3.75]){
    box(.22,3.6,10.5,x,1.8,-1.25,plaster);colliders.push({x,z:-1.25,radius:0,halfX:.16,halfZ:5.25,height:3.7});
    place(root,new T.BoxGeometry(.3,.34,10.5),kit.stoneDark(),x,.17,-1.25);
    // A plaster frieze closes the wall up to the eave beam.
    place(root,new T.BoxGeometry(.22,.3,10.5),plaster,x,3.72,-1.25);
    // Lacquered columns stand outside the wall, clear of every picture, and carry the eave beam.
    const outside=x*1.068;
    for(const z of [-6.4,-3.8,-1.3,1.2,3.7]){column(root,outside,z,3.5,.16,kit.lacquer(),.06);colliders.push({x:outside,z,radius:.18,height:3.9});}
    beam(root,10.5,outside,3.84,-1.25,Math.PI/2,.24,.24);
    roof(root,{width:.9,depth:10.5,height:.7,overhang:.45,lift:.26,y:3.96,x,z:-1.25});
  }
  // Tie beams cross the open aisle; the front one carries the hall's name plaque.
  for(const z of [-3.8,-1.3,1.2,3.7])beam(root,7.7,0,3.86,z,0,.22,.2);
  const nameplate=sign(root,kind==='photography'?'光影长廊':'旋律展廊',kind==='photography'?'PHOTOGRAPHY':'ALBUM COLLECTION',accent,3.6,.62);nameplate.position.set(0,3.39,3.7);
  for(const x of [-1.4,1.4])place(root,new T.BoxGeometry(.05,.1,.05),kit.bronze(),x,3.73,3.7).castShadow=false;
  // Lattice transoms above the tallest picture lamps let the walls breathe.
  for(const x of [-3.615,3.615])for(const z of [-5.1,-2.55,-.05,2.45]){const panel=place(root,new T.BoxGeometry(.04,.26,1.5),kit.lattice(),x,3.46,z);panel.castShadow=false;}
  const slots=kind==='photography'?
    [...Array.from({length:4},(_,i)=>({x:-2.7+i*1.8,z:-6.32,angle:0})),...Array.from({length:5},(_,i)=>({x:-3.6,z:-5.4+i*1.85,angle:Math.PI/2})),...Array.from({length:5},(_,i)=>({x:3.6,z:-5.4+i*1.85,angle:-Math.PI/2}))]:
    [{x:-3.6,z:-1.8,angle:Math.PI/2},{x:-2.35,z:-6.32,angle:0},{x:0,z:-6.32,angle:0},{x:2.35,z:-6.32,angle:0},{x:3.6,z:-1.8,angle:-Math.PI/2}];
  const textures:T.Texture[]=[];
  pictures.forEach((p,i)=>{
    const slot=slots[i];if(!slot)return;const frame=new T.Group();frame.position.set(slot.x,2.1,slot.z);frame.rotation.y=slot.angle;root.add(frame);
    artworks.push({id:`work-${i}`,label:p.title,position:[slot.x,slot.z],approach:[slot.x+Math.sin(slot.angle)*1.3,slot.z+Math.cos(slot.angle)*1.3],action:p.action});
    const aspect=(p.width??1)/(p.height??1),max=kind==='albums'?1.9:1.45,w=aspect>1?max:max*aspect,h=aspect>1?max/aspect:max;
    // Silk mount in a dark timber frame, like a mounted album leaf.
    mesh(frame,softBox(w+.22,h+.22,.09),timber);
    mesh(frame,new T.PlaneGeometry(w+.13,h+.13),kit.paper(),0,0,.049);
    const texture=regionTexture(p.src,region);textures.push(texture);
    mesh(frame,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture,toneMapped:false}),0,0,.056).castShadow=false;
    const caption=sign(frame,p.title,p.subtitle??'摄影原作',accent,Math.min(kind==='photography'?1.12:1.6,w),.20);caption.position.set(0,-h/2-.20,.025);
    frame.userData.artworkId=`work-${i}`;frame.userData.dynamic=true; // Preserve hit identity through static batching.
    mesh(frame,softBox(.6,.035,.05),kit.bronze(),0,h/2+.21,.06).castShadow=false;
    mesh(frame,softBox(.52,.02,.04),kit.lamp('#f6d9a0'),0,h/2+.19,.085).castShadow=false;
  });
  // Two long benches, offset from the entrance and the viewing wall.
  for(const x of [-1.1,1.1]){box(1.25,.1,.5,x,.5,-2.8,timber);box(1.15,.03,.46,x,.565,-2.8,material('#34495a',.9,0));for(const side of [-.52,.52])box(.12,.45,.44,x+side,.225,-2.8,timber);colliders.push({x,z:-2.8,radius:0,halfX:.64,halfZ:.31,height:.72});}
  const release=batchStatic(root);
  return {root,colliders,artworks,dispose(){release();textures.forEach(t=>t.dispose());}};
}
