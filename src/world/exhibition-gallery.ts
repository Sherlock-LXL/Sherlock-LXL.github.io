import * as T from 'three';
import type {WorldModuleScene} from './module-contract';
import type {ArtworkAction} from '../core/types';
import {material,mesh,softBox} from './architecture';
import {sign,type Obstacle} from './scenery';
import {batchStatic} from './optimizer';
import {regionTexture} from './lazy-texture';

export interface GalleryPicture {title:string;src:string;width?:number;height?:number;subtitle?:string;action:ArtworkAction}
/** An open-front arcade: artwork surrounds a clear central aisle. */
export function exhibitionGallery(pictures:GalleryPicture[],accent:string,kind:'photography'|'albums',region:string){
  const root=new T.Group();root.name=`${kind}-arcade`;
  const stone=material('#ede4d5',.9,.02,'stone'),wood=material('#a18a78',.82,.02,'wood'),roof=material('#d6c8ba',.92,0,'stone');
  const colliders:Obstacle[]=[],artworks:NonNullable<WorldModuleScene["artworks"]>=[];
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material=stone)=>mesh(root,softBox(w,h,d),m,x,y,z);
  const nameplate=sign(root,kind==='photography'?'光影长廊':'旋律展廊',kind==='photography'?'PHOTOGRAPHY':'ALBUM COLLECTION','#bb895b',4.4,.7);nameplate.position.set(0,3.7,3.78);
  box(7.8,.08,10.6,0,.04,-1.25); // Flush, accessible floor, front edge at z=4.
  box(7.8,3.6,.22,0,1.8,-6.5);colliders.push({x:0,z:-6.5,radius:0,halfX:3.9,halfZ:.16,height:3.7});
  for(const x of [-3.75,3.75]){
    box(.22,3.6,10.5,x,1.8,-1.25);colliders.push({x,z:-1.25,radius:0,halfX:.16,halfZ:5.25,height:3.7});
    box(.8,.18,10.9,x,3.78,-1.25,roof);
    for(const z of [-6.4,-3.8,-1.3,1.2,3.7]){box(.28,3.85,.28,x,1.92,z,wood);box(.46,.14,.46,x,.12,z);}
  }
  box(7.9,.2,1.1,0,3.78,-6.3,roof);
  // Thin timber ribs leave daylight and the canopy visible overhead.
  for(let i=0;i<8;i++)box(7.6,.1,.1,0,3.85,3.5-i*1.4,wood);
  // Clerestory caps, recessed skirting and warm brass trim frame the existing aisle.
  const brass=material('#c5ab73',.35,.55,'metal');
  for(const x of [-3.75,3.75]){
    box(.26,.16,10.5,x,.17,-1.25,wood);
    box(.29,.055,10.5,x,3.38,-1.25,brass);
    for(const z of [-6.4,-3.8,-1.3,1.2,3.7])box(.42,.18,.42,x,3.48,z,stone);
  }
  box(7.55,.14,.25,0,.18,-6.36,wood);
  const slots=kind==='photography'?
    [...Array.from({length:4},(_,i)=>({x:-2.7+i*1.8,z:-6.32,angle:0})),...Array.from({length:5},(_,i)=>({x:-3.6,z:-5.4+i*1.85,angle:Math.PI/2})),...Array.from({length:5},(_,i)=>({x:3.6,z:-5.4+i*1.85,angle:-Math.PI/2}))]:
    [{x:-3.6,z:-1.8,angle:Math.PI/2},{x:-2.35,z:-6.32,angle:0},{x:0,z:-6.32,angle:0},{x:2.35,z:-6.32,angle:0},{x:3.6,z:-1.8,angle:-Math.PI/2}];
  const textures:T.Texture[]=[];
  pictures.forEach((p,i)=>{
    const slot=slots[i];if(!slot)return;const frame=new T.Group();frame.position.set(slot.x,2.1,slot.z);frame.rotation.y=slot.angle;root.add(frame);
    artworks.push({id:`work-${i}`,label:p.title,position:[slot.x,slot.z],approach:[slot.x+Math.sin(slot.angle)*1.3,slot.z+Math.cos(slot.angle)*1.3],action:p.action});
    const aspect=(p.width??1)/(p.height??1),max=kind==='albums'?1.9:1.45,w=aspect>1?max:max*aspect,h=aspect>1?max/aspect:max;
    mesh(frame,softBox(w+.22,h+.22,.09),wood);
    mesh(frame,new T.PlaneGeometry(w+.09,h+.09),material('#fffaf1'),0,0,.049);
    const texture=regionTexture(p.src,region);textures.push(texture);
    mesh(frame,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture,toneMapped:false}),0,0,.056).castShadow=false;
    const caption=sign(frame,p.title,p.subtitle??'摄影原作',accent,Math.min(kind==='photography'?1.12:1.6,w),.20);caption.position.set(0,-h/2-.20,.025);
    frame.userData.artworkId=`work-${i}`;frame.userData.dynamic=true; // Preserve hit identity through static batching.
    const lamp=new T.MeshStandardMaterial({color:'#ffedcc',emissive:'#ffdb9d',emissiveIntensity:.2});lamp.userData.nightGlow=true;
    mesh(frame,softBox(.6,.035,.05),lamp,0,h/2+.21,.08).castShadow=false;
  });
  // An upholstered bench, offset from the entrance and the viewing wall.
  for(const x of [-1.1,1.1]){box(1.25,.16,.58,x,.52,-2.8,wood);box(1.15,.08,.56,x,.64,-2.8,material('#c4b5a0'));for(const side of [-.6,.6])box(.09,.44,.4,x+side,.26,-2.8,wood);colliders.push({x,z:-2.8,radius:0,halfX:.64,halfZ:.31,height:.72});}
  const release=batchStatic(root);
  return {root,colliders,artworks,dispose(){release();textures.forEach(t=>t.dispose());}};
}
