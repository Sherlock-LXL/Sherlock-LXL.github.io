import {researchCamp} from './research-camp';
import * as T from 'three';
import { material,mesh,tree,softBox } from './architecture';
import type { Exhibit,Region } from '../core/types';
import {onRegionRoute} from '../../shared/region-routes.mjs';
import { shoreLayout } from '../../shared/shore-layout.mjs';
import {flowerDrifts,type FlowerPoint} from './garden-details';
import {seasonalColors,palm} from './season-style';
export type Obstacle={x:number;z:number;radius:number;halfX?:number;halfZ?:number;height?:number;segment?:[number,number,number,number]};
const cube=(g:T.Object3D,m:T.Material,w:number,h:number,d:number,x=0,y=0,z=0)=>mesh(g,softBox(w,h,d),m,x,y,z);

export function sign(g:T.Object3D,title:string,subtitle:string,color:string,width=2.3,height=0.8){
  const canvas=document.createElement('canvas');const w=1536;canvas.width=w;canvas.height=Math.max(192,Math.round(w*height/width));
  const ctx=canvas.getContext('2d')!,h=canvas.height;
  ctx.fillStyle='#f2f3ec';ctx.fillRect(0,0,w,h);
  ctx.fillStyle=color;ctx.fillRect(w*.045,h*.17,w*.008,h*.66);
  const stack='"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif';
  ctx.textAlign='left';ctx.textBaseline='middle';
  const write=(text:string,size:number,y:number,weight:number,color:string)=>{ctx.font=`${weight} ${size}px ${stack}`;const room=w*.85;size*=Math.min(1,room/Math.max(1,ctx.measureText(text).width));ctx.font=`${weight} ${size}px ${stack}`;ctx.fillStyle=color;ctx.fillText(text,w*.085,y);};
  write(title,h*(subtitle?.29:.42),h*(subtitle?.4:.5),600,'#354d4e');
  if(subtitle)write(subtitle,h*.17,h*.74,400,'#647a79');
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;texture.minFilter=T.LinearMipmapLinearFilter;
  texture.name='clear-sign-text';
  const plaque=new T.Group();plaque.name='solid-sign';plaque.userData={title,subtitle};g.add(plaque);
  cube(plaque,material('#b4bbaa',.55,.12),width+.10,height+.10,.14);
  const ink=new T.MeshBasicMaterial({map:texture,toneMapped:false});
  for(const side of [-1,1]){
    const face=mesh(plaque,new T.PlaneGeometry(width,height),ink,0,0,side*.076);face.rotation.y=side===1?0:Math.PI;face.castShadow=false;
  }
  return plaque;
}
export function terminal(title:string,color:string,subtitle='F  /  OPEN EXPERIENCE'){
  const g=new T.Group(),dark=material('#91aaa7',.5,.08),edge=material(color,.4,.1);
  mesh(g,new T.CylinderGeometry(0.55,0.7,0.12,24),dark,0,0.06);
  const post=cube(g,dark,.34,.78,.32,0,.5);post.name='terminal-post';
  cube(g,edge,.055,.65,.34,.2,.49);
  cube(g,dark,.5,.03,.18,0,.905,.055);
  const head=new T.Group();head.position.set(0,1.32,0);head.rotation.x=-0.18;g.add(head);
  sign(head,title,subtitle,color,1.7,0.69);
  const led=mesh(g,new T.TorusGeometry(0.6,0.028,6,40),new T.MeshBasicMaterial({color}),0,0.14);led.rotation.x=Math.PI/2;
  return g;
}
function lamp(g:T.Object3D,x:number,z:number,color:string){
  const post=material('#9ca99c',.5,.15),light=new T.MeshStandardMaterial({color:'#fff3d7',emissive:color,emissiveIntensity:.25});
  light.userData.nightGlow=true;
  mesh(g,new T.CylinderGeometry(.045,.075,2.6,12),post,x,1.3,z);
  mesh(g,new T.SphereGeometry(.24,16,12),light,x,2.68,z).castShadow=false;
  const cap=mesh(g,new T.SphereGeometry(.29,16,8,0,Math.PI*2,0,Math.PI/2),post,x,2.77,z);cap.scale.y=.38;
  mesh(g,new T.CylinderGeometry(.17,.21,.12,16),post,x,.06,z);
}
function flowerBed(g:T.Group,color:string){
  const bed=new T.Group();bed.position.set(-5,0,11);g.add(bed);
  mesh(bed,new T.CylinderGeometry(1.25,1.35,.3,48),material('#fff0dc'),0,.15);
  mesh(bed,new T.CylinderGeometry(1.13,1.13,.04,48),material('#a4b99b'),0,.33);
  const petals=new T.InstancedMesh(new T.SphereGeometry(1,10,8),material('#ffffff',.8,0),88);
  const stems=new T.InstancedMesh(new T.CylinderGeometry(.016,.023,1,6),material('#86aa8b'),11);
  const transform=new T.Object3D();let index=0;
  for(let i=0;i<11;i++){
    const a=i*2.4,r=.22+Math.sqrt(i)*.22,x=Math.cos(a)*r,z=Math.sin(a)*r,h=.35+(i%3)*.1;
    transform.position.set(x,.35+h/2,z);transform.scale.set(1,h,1);transform.rotation.set(0,0,0);transform.updateMatrix();stems.setMatrixAt(i,transform.matrix);
    for(let n=0;n<8;n++){
      const theta=n*Math.PI*2/5;
      if(n<5){transform.position.set(x+Math.cos(theta)*.115,.35+h,z+Math.sin(theta)*.115);transform.scale.set(.14,.055,.09);transform.rotation.set(0,-theta,0);}
      else if(n===5){transform.position.set(x,.38+h,z);transform.scale.set(.07,.06,.07);}
      else{const side=n===6?-1:1;transform.position.set(x+side*.095,.44,z);transform.scale.set(.16,.035,.06);transform.rotation.set(0,side*.6,side*.4);}
      transform.updateMatrix();petals.setMatrixAt(index,transform.matrix);petals.setColorAt(index++,new T.Color(n===5?'#efd59e':n>5?'#9bb99b':i%3===0?'#f4bfd0':i%3===1?'#fff1d2':color));
    }
  }
  petals.castShadow=true;petals.receiveShadow=true;bed.add(petals,stems);

}
export function dressRegion(region:Region,exhibits:Exhibit[],obstacles:Obstacle[]){
  const g=new T.Group();const [rx,rz]=region.position;g.position.set(rx,0,rz);
  const stone=material('#fff0dc',.9,.02,'stone'),dark=material('#9cb1a6',.8,.02,'wood'),tint=material(region.color),metal=material('#97b7c6',.4,.18,'metal');
  const gardenFlowers:FlowerPoint[]=[];
  const block=(x:number,z:number,radius:number,height=Infinity)=>obstacles.push({x:rx+x,z:rz+z,radius,height});
  const onPath=(x:number,z:number,margin=0)=>onRegionRoute(x,z,region,exhibits,margin);
  const nearDiscovery=(x:number,z:number)=>!!region.discovery&&Math.hypot(x-region.discovery.position[0],z-region.discovery.position[1])<3.1;
  if(region.season!=='winter'&&!onPath(-5,11,1.5)){flowerBed(g,region.color);block(-5,11,1.25,.85);}
  // A small, optional stepping-stone route behind the arrival gate.
  for(const [i,x,z,h] of [[0,-3.8,13.1,.28],[1,-1.8,14.2,.5],[2,.4,14.5,.76],[3,2.6,13.8,.46]]){
    if(onPath(x,z,1))continue;
    const plinth=mesh(g,new T.CylinderGeometry(.7,.8,h,48),i%2?stone:tint,x,h/2,z);
    const cap=mesh(g,new T.CylinderGeometry(.57,.57,.035,48),i%2?tint:stone,x,h+.018,z);cap.castShadow=false;
    plinth.receiveShadow=true;block(x,z,.8,h+.035);
  }

  // Paths are painted by terrain.ts; this group contains only raised furnishings.
  for(const x of [-3.2,3.2]){if(onPath(x,10,.4)||nearDiscovery(x,10))continue;lamp(g,x,10,region.color);block(x,10,.15);}
  if(!region.arrivalPath){
  const distance=Math.hypot(rx,rz),gateway=new T.Group();gateway.position.set(-rx/distance*(region.radius-2),0,-rz/distance*(region.radius-2));gateway.rotation.y=Math.atan2(-rx,-rz);g.add(gateway);
  const entrance=sign(gateway,region.title,region.scenery==='laboratory'?'观察 · 建模 · 探索':region.english,region.color,3.4,.8);entrance.position.set(0,4.1,.13);
  for(const x of [-3.1,3.1]){cube(gateway,stone,.55,.25,.55,x,.125,0);cube(gateway,dark,.22,4.48,.24,x,2.46,0);const p=new T.Vector3(x,0,0).applyAxisAngle(new T.Vector3(0,1,0),gateway.rotation.y).add(gateway.position);block(p.x,p.z,.3);}
  cube(gateway,tint,6.55,.2,.5,0,4.64,0);
  cube(gateway,stone,6.75,.09,.66,0,4.785,0);
  for(const x of [-1.45,1.45])cube(gateway,dark,.07,.18,.08,x,4.56,.13);
  if(region.scenery==='laboratory'){
    for(const x of [-3.1,3.1]){cube(gateway,tint,.34,.1,.37,x,3.25,0);cube(gateway,metal,.04,2.5,.04,x,1.65,.145);}
  }
  }
  // Perimeter seating, plants and rails leave the radial bridges open.
  for(const entry of shoreLayout(region,exhibits)){
    const {angle:a,fence:{x,z},plant,index:i}=entry;
    if(plant&&!onPath(plant.x,plant.z,1.6)&&!nearDiscovery(plant.x,plant.z)){
      if(entry.kind==='lamp'){lamp(g,plant.x,plant.z,region.color);block(plant.x,plant.z,.15);}
      else {const foliage=region.season?seasonalColors[region.season].trees[i%3]:i%5===0?'#edc2ce':new T.Color(region.color).lerp(new T.Color('#aed5ba'),.4).getStyle();if(region.season==='summer')palm(g,plant.x,plant.z,.9+(i%3)*.12);else tree(g,plant.x,plant.z,.8+(i%3)*.24,foliage);block(plant.x,plant.z,.25);}
    }
    // Short fence sections punctuate the shoreline without sealing entrances.
    if(!entry.fenceClear||onPath(x,z,1.1))continue;
    const fence=new T.Group();fence.position.set(x,0,z);fence.rotation.y=-a;g.add(fence);
    for(const b of [-.7,.7])cube(fence,dark,.06,.85,.06,0,.42,b);
    cube(fence,tint,.055,.045,1.5,0,.8);
  }
  for(const x of [-10,10]){
    if(onPath(x,9,1.7)||onPath(x,11,1.7))continue;
    cube(g,stone,2.5,.17,.75,x,.55,9);for(const leg of [-.85,.85])cube(g,dark,.15,.5,.6,x+leg,.25,9);
    obstacles.push({x:rx+x,z:rz+9,radius:0,halfX:1.25,halfZ:.4,height:.72});
    const planter=cube(g,dark,1.6,.5,1.2,x,.25,11);planter.castShadow=false;
    for(let n=0;n<18;n++)gardenFlowers.push({x:x+Math.sin(n*2.4)*(.15+Math.sqrt(n)*.12),y:.60,z:11+Math.cos(n*2.4)*.4});
    cube(g,stone,1.72,.09,1.32,x,.52,11);cube(g,material('#938a72',1,0,'stone'),1.45,.04,1.05,x,.57,11);
    cube(g,dark,2.5,.38,.12,x,1.04,9.34);for(const side of [-1,1])cube(g,dark,.08,.54,.08,x+side*1.05,.79,9.3);
    for(let slat=0;slat<4;slat++)cube(g,tint,2.3,.075,.11,x,.675,8.73+slat*.18);
    // A book and cup make the resting corners feel inhabited.
    for(let page=0;page<3;page++){const book=cube(g,page%2?stone:tint,.48,.045,.34,x-.65,.76+page*.045,9);book.rotation.y=.12;}
    const cup=teacup();cup.position.set(x+.8,.714,9);g.add(cup);
    obstacles.push({x:rx+x,z:rz+11,radius:0,halfX:.8,halfZ:.6,height:.95});
  }
  g.add(flowerDrifts(gardenFlowers));
  const themes:Record<string,()=>void>={
    woodland:()=>{
      // Rounded hills and cloud-like tree canopies give the AI district a garden silhouette.
      for(let i=0;i<7;i++){
        const x=-16+i*5.5,z=-region.radius-3-(i%2)*3,h=7+(i%3)*3;
        const peak=mesh(g,new T.SphereGeometry(1,24,18),material(i%2?'#b1cfcb':'#c6d9bb'),x,-2,z);peak.scale.set(4.7,h,4.2);
        const crest=mesh(g,new T.SphereGeometry(1,20,14),stone,x,h-2.55,z);crest.scale.set(1.7,.85,1.5);
      }
      for(const x of [-11.5,11.5]){cube(g,stone,.24,4,.24,x,2,2);cube(g,tint,2.2,.13,1.2,x,4,2);block(x,2,.2);}
      for(let i=0;i<16;i++){const x=Math.sin(i*4)*13,z=Math.cos(i*4)*12;if(exhibits.some(m=>Math.hypot(x-m.position[0],z-m.position[1])<5)||Math.abs(x)<3)continue;
        for(let n=0;n<3;n++){mesh(g,new T.CylinderGeometry(.018,.018,.4,6),dark,x+n*.22,.2,z);mesh(g,new T.SphereGeometry(.14,12,8),material('#efb7c4'),x+n*.22,.46,z);}}
    },
    laboratory:()=>{
      g.add(researchCamp());
      for(let i=0;i<5;i++)block(-9+i*4.5,-12,1.1);
      for(const x of [-10.5,10.5])block(x,-12.8,.3);

    },
    museum:()=>{
      // Both galleries own their architecture; this shared forecourt stays open.
      for(const x of [-3,3]){cube(g,stone,.36,.5,.36,x,.25,7);mesh(g,new T.SphereGeometry(.17,12,8),tint,x,.6,7);}
    },
    studio:()=>{}
  };
  (themes[region.scenery]??themes.woodland)();return g;
}
export function teacup(){
  const cup=new T.Group();cup.name='teacup';const ceramic=material('#fff0dc',.32,.04);
  const profile=[[0,.012],[.06,.012],[.068,.02],[.087,.18],[.084,.195],[.073,.195],[.07,.18],[.055,.034],[0,.034]].map(([x,y])=>new T.Vector2(x,y));
  mesh(cup,new T.LatheGeometry(profile,32),ceramic);
  // The C-shaped handle lies in the XY plane; both ends penetrate the sidewall.
  const curve=new T.CatmullRomCurve3([[.079,.164,0],[.15,.17,0],[.176,.105,0],[.144,.049,0],[.068,.052,0]].map(p=>new T.Vector3(...p)));
  mesh(cup,new T.TubeGeometry(curve,24,.013,8,false),ceramic).name='cup-handle';
  const tea=mesh(cup,new T.CircleGeometry(.071,32),material('#957051',.25,0),0,.159);tea.rotation.x=-Math.PI/2;tea.castShadow=false;
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
