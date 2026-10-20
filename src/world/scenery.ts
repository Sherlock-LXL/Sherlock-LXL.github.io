import * as T from 'three';
import { material,mesh,tree,softBox } from './architecture';
import type { Exhibit,Region } from '../core/types';
import {onRegionRoute} from '../../shared/region-routes.mjs';
import { shoreLayout } from '../../shared/shore-layout.mjs';
import {flowerDrifts,type FlowerPoint} from './garden-details';
import {seasonalColors,palm} from './season-style';
import {kit,place,beam,roof,lantern,paifang,drumStone,drumStool,fenceSection,scholarRock,paintedTree} from './vernacular';
import {pigmentAccent} from './ink';
export type Obstacle={x:number;z:number;radius:number;halfX?:number;halfZ?:number;height?:number;segment?:[number,number,number,number]};
const cube=(g:T.Object3D,m:T.Material,w:number,h:number,d:number,x=0,y=0,z=0)=>mesh(g,softBox(w,h,d),m,x,y,z);
const serif='"Songti SC","STSong","Noto Serif CJK SC","Source Han Serif SC","SimSun","Times New Roman",serif';
const sans='"PingFang SC","Microsoft YaHei UI","Microsoft YaHei","Segoe UI",sans-serif';
/** Every island stamps its signs with its season. */
const seals:Record<string,string>={'#ebbdcf':'春','#cbdde9':'冬','#e3c385':'秋','#acd9c5':'夏'};
let frameMaterial:T.Material|undefined;
const frame=()=>frameMaterial??=material('#3d3029',.72,.02,'wood');

/** A title slip: aged paper in a lacquered frame, ruled in the island's pigment and sealed in cinnabar. */
export function sign(g:T.Object3D,title:string,subtitle:string,color:string,width=2.3,height=0.8){
  const canvas=document.createElement('canvas');const w=1536;canvas.width=w;canvas.height=Math.max(192,Math.round(w*height/width));
  const ctx=canvas.getContext('2d')!,h=canvas.height,accent=pigmentAccent(color),seal=seals['#'+new T.Color(color).getHexString()];
  ctx.fillStyle='#f1e8d4';ctx.fillRect(0,0,w,h);
  let seed=title.length*131+h;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
  for(let i=0;i<240;i++){ctx.strokeStyle=`rgba(122,96,58,${.025+random()*.04})`;ctx.lineWidth=1+random()*2.2;const x=random()*w,y=random()*h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+24+random()*70,y+(random()-.5)*5);ctx.stroke();}
  const inset=Math.min(h*.075,w*.018);
  ctx.strokeStyle=accent;ctx.lineWidth=Math.max(3,h*.02);ctx.strokeRect(inset,inset,w-inset*2,h-inset*2);
  ctx.lineWidth=Math.max(1.5,h*.007);ctx.strokeRect(inset*1.75,inset*1.75,w-inset*3.5,h-inset*3.5);
  const stamp=seal&&w/h>2.4&&height>=.5?h*.34:0,left=inset*1.75+w*.035,room=w-left-inset*1.75-(stamp?stamp+w*.05:w*.03);
  ctx.textAlign='left';ctx.textBaseline='middle';
  const write=(text:string,size:number,y:number,weight:number,fill:string,font:string)=>{ctx.font=`${weight} ${size}px ${font}`;size*=Math.min(1,room/Math.max(1,ctx.measureText(text).width));ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=fill;ctx.fillText(text,left,y);};
  write(title,h*(subtitle?.3:.43),h*(subtitle?.4:.52),600,'#2b2824',serif);
  if(subtitle)write(subtitle,h*.165,h*.735,400,'#5d5447',sans);
  if(stamp){
    const x=w-inset*1.75-w*.03-stamp,y=(h-stamp)/2;ctx.fillStyle='#b23e2c';ctx.fillRect(x,y,stamp,stamp);
    ctx.strokeStyle='#f1e8d4';ctx.lineWidth=stamp*.05;ctx.strokeRect(x+stamp*.1,y+stamp*.1,stamp*.8,stamp*.8);
    ctx.fillStyle='#f6eedc';ctx.textAlign='center';ctx.font=`700 ${stamp*.6}px ${serif}`;ctx.fillText(seal,x+stamp/2,y+stamp*.53);
  }
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;texture.minFilter=T.LinearMipmapLinearFilter;
  texture.name='clear-sign-text';
  const plaque=new T.Group();plaque.name='solid-sign';plaque.userData={title,subtitle};g.add(plaque);
  cube(plaque,frame(),width+.10,height+.10,.14);
  const ink=new T.MeshBasicMaterial({map:texture,toneMapped:false});
  for(const side of [-1,1]){
    const face=mesh(plaque,new T.PlaneGeometry(width,height),ink,0,0,side*.076);face.rotation.y=side===1?0:Math.PI;face.castShadow=false;
  }
  return plaque;
}
/** A notice board: one timber post on a stone footing, braced crossbeam and small roof, the slip hung in front. */
export function terminal(title:string,color:string,subtitle='F  /  OPEN EXPERIENCE'){
  const g=new T.Group();
  place(g,new T.BoxGeometry(.66,.22,.46),kit.stone(),0,.11,-.14);
  place(g,new T.BoxGeometry(.74,.06,.54),kit.marble(),0,.25,-.14);
  const post=place(g,new T.BoxGeometry(.15,1.615,.15),kit.timber(),0,.28+1.615/2,-.145);post.name='terminal-post';
  for(const s of [-1,1]){const strut=place(g,new T.BoxGeometry(.56,.07,.07),kit.timber(),s*.24,1.76,-.145);strut.rotation.z=s*.55;}
  beam(g,2,0,1.97,-.12,0,.15,.16);
  roof(g,{width:1.9,depth:.26,height:.22,overhang:.22,lift:.08,thickness:.05,y:2.045,z:-.12});
  for(const s of [-1,1])place(g,new T.CylinderGeometry(.014,.014,.18,5),kit.bronze(),s*.62,1.805,-.05).castShadow=false;
  const board=sign(g,title,subtitle,color,1.7,.69);board.position.y=1.32;
  return g;
}
function flowerBed(g:T.Group,color:string){
  const bed=new T.Group();bed.position.set(-5,0,11);bed.rotation.y=Math.PI/8;g.add(bed);
  // An octagonal stone planter; coping and soil overlap so no two caps share a plane.
  mesh(bed,new T.CylinderGeometry(1.25,1.35,.28,8),kit.stone(),0,.14);
  mesh(bed,new T.CylinderGeometry(1.31,1.31,.05,8),kit.marble(),0,.295);
  mesh(bed,new T.CylinderGeometry(1.13,1.13,.04,8),kit.soil(),0,.33);
  const petals=new T.InstancedMesh(new T.SphereGeometry(1,10,8),material('#ffffff',.8,0),88);
  const stems=new T.InstancedMesh(new T.CylinderGeometry(.016,.023,1,6),material('#5f7f5c'),11);
  const transform=new T.Object3D();let index=0;
  for(let i=0;i<11;i++){
    const a=i*2.4,r=.22+Math.sqrt(i)*.22,x=Math.cos(a)*r,z=Math.sin(a)*r,h=.35+(i%3)*.1;
    transform.position.set(x,.35+h/2,z);transform.scale.set(1,h,1);transform.rotation.set(0,0,0);transform.updateMatrix();stems.setMatrixAt(i,transform.matrix);
    for(let n=0;n<8;n++){
      const theta=n*Math.PI*2/5;
      if(n<5){transform.position.set(x+Math.cos(theta)*.115,.35+h,z+Math.sin(theta)*.115);transform.scale.set(.14,.055,.09);transform.rotation.set(0,-theta,0);}
      else if(n===5){transform.position.set(x,.38+h,z);transform.scale.set(.07,.06,.07);}
      else{const side=n===6?-1:1;transform.position.set(x+side*.095,.44,z);transform.scale.set(.16,.035,.06);transform.rotation.set(0,side*.6,side*.4);}
      transform.updateMatrix();petals.setMatrixAt(index,transform.matrix);petals.setColorAt(index++,new T.Color(n===5?'#dcb04c':n>5?'#6f9a6c':i%3===0?'#e6a0ad':i%3===1?'#f3ead6':pigmentAccent(color)));
    }
  }
  petals.castShadow=true;petals.receiveShadow=true;bed.add(petals,stems);
}
/** A garden rest: timber seat with a leaning back rail on stone blocks, a planter behind, a book and tea left out. */
function restCorner(g:T.Group,x:number,flowers:FlowerPoint[]){
  for(const leg of [-.8,.8])place(g,new T.BoxGeometry(.5,.47,.58),kit.stone(),x+leg,.235,9);
  place(g,new T.BoxGeometry(2.4,.1,.62),kit.timberLight(),x,.52,9);
  for(let i=0;i<10;i++){const spindle=place(g,new T.BoxGeometry(.035,.42,.035),kit.timber(),x-1.08+i*.24,.78,9.33);spindle.rotation.x=-.25;}
  place(g,new T.BoxGeometry(2.4,.07,.08),kit.timber(),x,.99,9.42);
  for(const side of [-1,1])place(g,new T.BoxGeometry(.08,.46,.08),kit.timber(),x+side*1.16,.78,9.36).rotation.x=-.25;
  const planter=place(g,new T.BoxGeometry(1.6,.5,1.2),kit.stone(),x,.25,11);planter.castShadow=false;
  place(g,new T.BoxGeometry(1.72,.09,1.32),kit.marble(),x,.52,11);place(g,new T.BoxGeometry(1.45,.04,1.05),kit.soil(),x,.57,11);
  for(let n=0;n<18;n++)flowers.push({x:x+Math.sin(n*2.4)*(.15+Math.sqrt(n)*.12),y:.60,z:11+Math.cos(n*2.4)*.4});
  // Thread-bound volumes: indigo boards around paper blocks.
  const indigo=material('#34495a',.85,0,'wood');
  for(let page=0;page<3;page++){const book=place(g,new T.BoxGeometry(.46,.045,.32),page%2?kit.paper():indigo,x-.65,.5925+page*.045,9);book.rotation.y=.12+page*.05;}
  const cup=teacup();cup.position.set(x+.8,.57,9);g.add(cup);
}
export function dressRegion(region:Region,exhibits:Exhibit[],obstacles:Obstacle[]){
  const g=new T.Group();const [rx,rz]=region.position;g.position.set(rx,0,rz);
  const gardenFlowers:FlowerPoint[]=[];
  const block=(x:number,z:number,radius:number,height=Infinity)=>obstacles.push({x:rx+x,z:rz+z,radius,height});
  const onPath=(x:number,z:number,margin=0)=>onRegionRoute(x,z,region,exhibits,margin);
  const nearDiscovery=(x:number,z:number)=>!!region.discovery&&Math.hypot(x-region.discovery.position[0],z-region.discovery.position[1])<3.1;
  if(region.season!=='winter'&&!onPath(-5,11,1.5)){flowerBed(g,region.color);block(-5,11,1.25,.85);}
  // An optional route of carved drum stones behind the arrival garden.
  for(const [i,x,z,h] of [[0,-3.8,13.1,.28],[1,-1.8,14.2,.5],[2,.4,14.5,.76],[3,2.6,13.8,.46]]){
    if(onPath(x,z,1))continue;
    drumStool(g,x,z,.72,h+.035,i%2?kit.marble():kit.stone());block(x,z,.8,h+.035);
  }
  // Paths are painted by terrain.ts; this group contains only raised furnishings.
  for(const x of [-3.2,3.2]){if(onPath(x,10,.4)||nearDiscovery(x,10))continue;lantern(g,x,10);block(x,10,.25);}
  if(!region.arrivalPath){
    const distance=Math.hypot(rx,rz),gx=-rx/distance*(region.radius-2),gz=-rz/distance*(region.radius-2),rotation=Math.atan2(-rx,-rz);
    const arch=paifang(g,6.2,4.2,{x:gx,z:gz,rotation,tiles:region.season==='winter'?kit.tileSnow():kit.tile()});
    const entrance=sign(arch.group,region.title,region.scenery==='laboratory'?'观察 · 建模 · 探索':'',region.color,3,.62);entrance.position.set(0,arch.plaqueY,0);
    for(const x of [-3.1,3.1])for(const z of [0,-.58,.58]){const p=new T.Vector3(x,0,z).applyAxisAngle(new T.Vector3(0,1,0),rotation).add(new T.Vector3(gx,0,gz));block(p.x,p.z,z?.26:.3,z?1:Infinity);}
  }
  const fence=region.season==='winter'?'stone':region.season==='summer'?'bamboo':'timber';
  // Perimeter planting, lanterns and fence runs leave the radial bridges open.
  for(const entry of shoreLayout(region,exhibits)){
    const {angle:a,fence:{x,z},plant,index:i}=entry;
    if(plant&&!onPath(plant.x,plant.z,1.6)&&!nearDiscovery(plant.x,plant.z)){
      if(entry.kind==='lamp'){lantern(g,plant.x,plant.z,.9);block(plant.x,plant.z,.25);}
      else {const foliage=region.season?seasonalColors[region.season].trees[i%3]:i%5===0?'#edc2ce':'#5d8d63';if(region.season==='summer')palm(g,plant.x,plant.z,.9+(i%3)*.12);else tree(g,plant.x,plant.z,.8+(i%3)*.24,foliage);block(plant.x,plant.z,.25);}
    }
    if(!entry.fenceClear||onPath(x,z,1.1))continue;
    const run=fenceSection(g,1.5,fence);run.position.set(x,0,z);run.rotation.y=-a;
  }
  for(const x of [-10,10]){
    if(onPath(x,9,1.7)||onPath(x,11,1.7))continue;
    restCorner(g,x,gardenFlowers);
    obstacles.push({x:rx+x,z:rz+9,radius:0,halfX:1.25,halfZ:.4,height:.72});
    obstacles.push({x:rx+x,z:rz+11,radius:0,halfX:.8,halfZ:.6,height:.95});
  }
  g.add(flowerDrifts(gardenFlowers));
  const themes:Record<string,()=>void>={
    woodland:()=>{
      // Flowering trees and upright scholar's rocks: a garden, not a forest.
      for(let i=0;i<16;i++){const x=Math.sin(i*4)*13,z=Math.cos(i*4)*12;if(exhibits.some(m=>Math.hypot(x-m.position[0],z-m.position[1])<5)||Math.abs(x)<3||onPath(x,z,1.2))continue;
        if(i%3===0){scholarRock(g,x,z,1.2+(i%2)*.4);block(x,z,.45);}else{paintedTree(g,x,z,.85,i%2?'blossom':'pine');block(x,z,.25);}}
    },
    laboratory:()=>{
      // The observatory is built by region-landmarks; keep this forecourt open.
    },
    museum:()=>{
      // A pair of drum stones marks the forecourt threshold.
      for(const x of [-3,3]){drumStone(g,x,7,Math.PI/2);block(x,7,.35,1);}
    },
    studio:()=>{}
  };
  (themes[region.scenery]??themes.woodland)();return g;
}
export function teacup(){
  const cup=new T.Group();cup.name='teacup';const ceramic=kit.celadon();
  const profile=[[0,.012],[.06,.012],[.068,.02],[.087,.18],[.084,.195],[.073,.195],[.07,.18],[.055,.034],[0,.034]].map(([x,y])=>new T.Vector2(x,y));
  mesh(cup,new T.LatheGeometry(profile,32),ceramic);
  // The C-shaped handle lies in the XY plane; both ends penetrate the sidewall.
  const curve=new T.CatmullRomCurve3([[.079,.164,0],[.15,.17,0],[.176,.105,0],[.144,.049,0],[.068,.052,0]].map(p=>new T.Vector3(...p)));
  mesh(cup,new T.TubeGeometry(curve,24,.013,8,false),ceramic).name='cup-handle';
  const tea=mesh(cup,new T.CircleGeometry(.071,32),material('#8a7a44',.25,0),0,.159);tea.rotation.x=-Math.PI/2;tea.castShadow=false;
  mesh(cup,new T.CylinderGeometry(.125,.11,.012,32),ceramic,0,.006);
  return cup;
}

export function clouds(){
  const cloud=new T.InstancedMesh(new T.SphereGeometry(1,16,12),material('#fff6ee',1,0),48);
  const transform=new T.Object3D();let index=0;
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6,r=70+(i%3)*9;
    for(let n=0;n<4;n++){
      transform.position.set(Math.cos(a)*r+n*2.2,18+(i%4)*4+(n%2)*.9,Math.sin(a)*r);
      transform.scale.set(3.6,1.1+(n%2)*.7,2.4);transform.updateMatrix();cloud.setMatrixAt(index++,transform.matrix);
    }
  }
  cloud.instanceMatrix.needsUpdate=true;return cloud;
}
