import {catSculpture} from './cat-sculpture';
import {worldMirror} from './mirror';
import * as T from 'three';
import {surfaceMaterial} from './surfaces';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { artwork } from './artwork';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
type Palette={main:T.MeshStandardMaterial;dark:T.MeshStandardMaterial;glow:T.MeshStandardMaterial;stone:T.MeshStandardMaterial};
export const material=surfaceMaterial;
export function mesh(parent:T.Object3D,geo:T.BufferGeometry,mat:T.Material,x=0,y=0,z=0) {
  const m=new T.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
export function softBox(w:number,h:number,d:number){
  const edge=Math.min(w,h,d);return edge<.12?new T.BoxGeometry(w,h,d):new RoundedBoxGeometry(w,h,d,edge>.5?3:2,Math.min(.12,edge*.22));
}
const box=(g:T.Object3D,p:Palette,w:number,h:number,d:number,x=0,y=0,z=0,mat=p.main)=>mesh(g,softBox(w,h,d),mat,x,y,z);
function ring(g:T.Object3D,r:number,y:number,mat:T.Material) {const m=mesh(g,new T.TorusGeometry(r,0.06,12,80),mat,0,y,0);m.rotation.x=Math.PI/2;return m;}
const foliageGeometry=new T.SphereGeometry(1,24,16);
{const p=foliageGeometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),r=1+.045*Math.sin(x*9+y*5)*Math.cos(z*8-y*3);p.setXYZ(i,x*r,y*r,z*r);}foliageGeometry.computeVertexNormals();}
const woodGeometry=(()=>{
  const parts:T.BufferGeometry[]=[new T.CylinderGeometry(.11,.19,1.8,12).translate(0,.9,0)];
  for(const side of [-1,1]){
    parts.push(new T.CylinderGeometry(.045,.09,.8,10).rotateZ(-side*.6).translate(side*.2,1.55,0));
    parts.push(new T.SphereGeometry(.2,12,8).scale(1,.45,1.3).translate(side*.12,.065,.06));
  }
  return mergeGeometries(parts)!;
})();
const barkMaterial=material('#bba08a',.85,.02,'wood');
const foliageMaterials=new Map<string,T.MeshStandardMaterial>();
export function tree(g:T.Object3D,x:number,z:number,scale=1,color='#b0d9be') {
  mesh(g,woodGeometry,barkMaterial,x,0,z).scale.setScalar(scale);
  if(!foliageMaterials.has(color))foliageMaterials.set(color,material(color,.92,0,'foliage'));
  const leaves=foliageMaterials.get(color)!;
  for(const [dx,dy,dz,sx,sy,sz] of [[-.44,2.12,0,.85,.85,.8],[.43,2.25,.12,.85,.83,.8],[0,2.83,-.12,.85,.81,.8],[0,2.18,.4,.9,.85,.76]]){
    const leaf=mesh(g,foliageGeometry,leaves,x+dx*scale,dy*scale,z+dz*scale);leaf.scale.set(sx*scale,sy*scale,sz*scale);
  }
}
const builders:Record<string,(g:T.Group,p:Palette)=>void>={
  tower(g,p) {
    const bronze=material('#a99168',.38,.55,'metal'),glass=material('#527e83',.25,.3,'metal');
    box(g,p,4.65,.5,4.65,0,.31,0,p.stone);
    for(let i=0;i<7;i++){
      const w=4.6-i*0.38;box(g,p,w,0.4,w,0,0.7+i*1.35,0,p.stone);
      box(g,p,w-0.6,1.05,w-0.6,0,1.4+i*1.35,0,i%2?p.main:p.dark);
      box(g,p,0.13,1.05,w-0.5,0,1.4+i*1.35,0,p.glow);
      // Fine window mullions and a recessed balcony rail at each storey.
      for(const x of [-1,1])box(g,p,.045,.86,.055,x*(w-.8)*.28,1.38+i*1.35,(w-.6)/2+.035,p.stone);
      box(g,p,w-.4,.055,.06,0,1.03+i*1.35,w/2-.03,p.main);
      for(const x of [-1,1])box(g,p,.045,.3,.045,x*(w/2-.3),.9+i*1.35,w/2-.03,p.stone);
      for(const side of [-1,1]){
        box(g,p,w-.95,.65,.03,0,1.43+i*1.35,side*((w-.6)/2+.012),glass);
        for(let n=-2;n<=2;n++)box(g,p,.035,.93,.07,n*(w-.9)/5,1.4+i*1.35,side*((w-.6)/2+.06),bronze);
        box(g,p,.075,.1,w-.2,side*(w/2-.14),1.06+i*1.35,0,bronze);
      }
    }
    mesh(g,new T.OctahedronGeometry(0.8),p.glow,0,11,0);ring(g,2.7,9.8,p.glow);
    for(const x of [-2.05,2.05])for(const z of [-2.05,2.05])box(g,p,.14,1.95,.14,x,1.035,z,p.stone);
    for(let n=0;n<12;n++){const a=n*Math.PI/6;mesh(g,new T.SphereGeometry(.085,8,6),p.glow,Math.cos(a)*2.7,9.8,Math.sin(a)*2.7);}
    const crown=mesh(g,new T.TorusGeometry(.95,.025,6,64),bronze,0,11,0);crown.rotation.x=.45;
  },
  forest(g,p) {
    [[-2,-1],[2,-1],[0,-2.5]].forEach(([x,z],i)=>tree(g,x,z,1.2+i*0.15));
    g.add(catSculpture());
  },
  mirror(g,p) {
    box(g,p,4.5,0.4,3,0,0.2,0,p.stone);box(g,p,4,5,0.35,0,2.9,0,p.dark);
    const mirror=worldMirror(3.5,4.3);mirror.position.set(0,2.9,.25);g.add(mirror);
    for(const x of [-2,2])box(g,p,0.12,5.1,0.5,x,2.9,0,p.glow);
    ring(g,0.6,5.8,p.glow);
    for(const x of [-2.35,2.35])for(let i=0;i<8;i++)box(g,p,.25,.07,.7,x,1+i*.48,0,p.stone);
    mesh(g,new T.SphereGeometry(.16,12,8),p.glow,0,5.7,.25);
  },
  garden(g,p) {
    for(const x of [-2,2])box(g,p,0.25,3.7,0.25,x,1.85,0,p.stone);
    const arch=mesh(g,new T.TorusGeometry(2,0.15,8,32,Math.PI),p.stone,0,3.7,0);arch.rotation.z=0;
    box(g,p,2.8,0.2,1.5,0,1.4,0,p.stone);
    for(const x of [-.95,.95])box(g,p,.16,1.24,.9,x,.69,0,p.stone);
    const page=box(g,p,1.5,0.05,0.9,0,1.6,0,material('#eee7c7'));page.rotation.z=-0.1;
    for(const [x,z] of [[-2.65,-.7],[2.65,-.7],[0,-2.55]]){mesh(g,new T.CylinderGeometry(.28,.21,.31,24),p.stone,x,.235,z);mesh(g,new T.CylinderGeometry(.24,.24,.03,24),p.dark,x,.39,z);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh(g,new T.SphereGeometry(.11,12,8),p.main,x+Math.cos(a)*.13,.47,z+Math.sin(a)*.13);}}

    for(const x of [-.38,.38]){const page=box(g,p,.72,.045,.87,x,1.68,0,p.stone);page.rotation.z=x*.16;
      for(let i=0;i<5;i++)box(g,p,.48,.012,.018,x,1.72,.28-i*.12,p.dark);}
    for(const x of [-2,2]){box(g,p,.025,.75,.025,x,3.6,.65,p.dark);mesh(g,new T.SphereGeometry(.22,12,8),p.glow,x,3.1,.65);}
    const vine=material('#a7c9ad'),blossom=material('#edb8c9');
    for(let i=0;i<15;i++){
      const a=i*Math.PI/14,x=Math.cos(a)*2,y=3.7+Math.sin(a)*2;
      const leaf=mesh(g,new T.SphereGeometry(.15,12,8),vine,x,y,.14);leaf.scale.set(1.5,.6,1);leaf.rotation.z=a;
      if(i%3===0)mesh(g,new T.SphereGeometry(.12,12,8),blossom,x+.12,y+.1,.23);
    }
    for(const x of [-1.65,1.65]){for(const side of [-1,1])box(g,p,.09,.82,.45,x+side*.31,.485,1.25,p.stone);box(g,p,.95,.13,.65,x,.95,1.25,p.main);}
  },
  gift(g,p) {
    box(g,p,2.8,2.4,2.8,0,1.2,0);box(g,p,3.1,0.4,3.1,0,2.5,0,p.stone);
    box(g,p,0.35,2.5,2.85,0,1.25,0,p.glow);box(g,p,2.85,2.5,0.35,0,1.25,0,p.glow);
    for(const x of [-0.45,0.45]){const r=mesh(g,new T.TorusGeometry(0.48,0.1,6,20),p.glow,x,3.1,0);r.rotation.y=x;}
  },
  bubble(g,p) {
    mesh(g,new T.CylinderGeometry(3.5,3.5,0.5,48),p.stone,0,0.25);
    mesh(g,new T.CylinderGeometry(2.6,2.6,0.15,64),material('#abd7e5',0.28,0.15),0,0.6);
    const glass=new T.MeshPhysicalMaterial({color:'#d8eaf0',roughness:.15,transparent:true,opacity:.15,depthWrite:false,side:T.DoubleSide});
    mesh(g,new T.CylinderGeometry(2.15,2.15,2.8,48,1,true),glass,0,2.1).castShadow=false;
    mesh(g,new T.CylinderGeometry(2.04,2.04,2.45,48),new T.MeshPhysicalMaterial({color:'#9ecedc',roughness:.23,transparent:true,opacity:.22,depthWrite:false}),0,1.94).castShadow=false;
    const bubble=mesh(g,new T.SphereGeometry(.45,24,16),new T.MeshPhysicalMaterial({color:'#c7e7f1',metalness:.1,roughness:.12,transparent:true,opacity:.48,clearcoat:1}),0,1.4);bubble.name='pulse';
    ring(g,3,0.8,p.glow);for(const x of [-3,3])box(g,p,0.3,3,0.3,x,1.5,0,p.dark);
    for(let i=0;i<40;i++){
      const a=i*Math.PI/20,tick=box(g,p,.025,.018,i%5===0?.28:.13,Math.sin(a)*2.83,.695,Math.cos(a)*2.83,p.dark);tick.rotation.y=a;
    }
    for(const y of [.76,3.46])ring(g,2.16,y,p.dark);
    for(const x of [-3,3]){box(g,p,.44,.12,.44,x,3.02,0,p.stone);box(g,p,.06,2.4,.34,x,1.68,.03,p.glow);}
  },
  light(g,p) {
    builders.bubble(g,p);g.getObjectByName('pulse')!.scale.setScalar(0.65);g.getObjectByName('pulse')!.position.y=3.1;
    mesh(g,new T.IcosahedronGeometry(0.5,1),p.glow,0,3.1);
    const orbit=ring(g,2.8,3.1,p.glow);orbit.rotation.x=0.4;
  },
  gallery(g,p) {
    box(g,p,7,0.5,5,0,0.25,0,p.stone);box(g,p,7,4.5,0.35,0,2.5,-2,p.stone);
    box(g,p,0.35,4.5,4,-3.3,2.5,0,p.stone);
    for(let i=0;i<3;i++){
      box(g,p,1.75,2.7,0.15,-2.2+i*2.2,2.8,-1.75,p.dark);
      box(g,p,1.4,2.35,0.18,-2.2+i*2.2,2.8,-1.65,p.stone);
      const painting=mesh(g,new T.PlaneGeometry(1.34,2.29),artwork(i),-2.2+i*2.2,2.8,-1.548);painting.castShadow=false;painting.name=`gallery-art-${i}`;
      box(g,p,.6,.16,.025,-2.2+i*2.2,1.25,-1.75,p.stone);
    }
    box(g,p,3,0.3,0.8,0,1,1,p.dark);
    box(g,p,7.6,.2,2.6,0,5,-.9,p.stone);
    for(let i=0;i<3;i++){const x=-2.2+i*2.2;box(g,p,1.3,.06,.2,x,4.8,-.8,p.glow);
      const spot=mesh(g,new T.CylinderGeometry(.12,.17,.3,20),p.dark,x,4.65,-.65);spot.rotation.x=-.45;}
  },
  music(g,p) {
    mesh(g,new T.CylinderGeometry(3.6,3.6,0.5,40),p.stone,0,0.25);
    box(g,p,3.6,1.8,1.5,0,1.6,0,p.dark);
    for(let i=0;i<12;i++)box(g,p,0.25,0.12,0.6,-1.5+i*0.27,1.85,1, i%3===0?p.dark:p.stone);
    for(let i=0;i<11;i++)if(i%7!==2&&i%7!==6)box(g,p,.12,.12,.35,-1.365+i*.27,1.95,.86,p.dark);
    const lid=box(g,p,3.55,.1,1.55,0,2.65,-.05,p.main);lid.rotation.x=-.12;
    box(g,p,1.25,.85,.08,0,2.4,.6,p.stone);
    for(let i=0;i<5;i++)box(g,p,1.02,.015,.012,0,2.16+i*.105,.65,p.dark);
    for(const x of [-1.4,1.4])box(g,p,0.25,1.2,0.25,x,0.7,0,p.dark);
    for(let i=0;i<9;i++)box(g,p,0.2,1+Math.sin(i)*0.7,0.2,-2+i*0.5,4,-1.5,p.glow);
  },
  studio(g,p) {
    box(g,p,8,0.5,6,0,0.25,0,p.stone);box(g,p,8,5,0.4,0,2.75,-2,p.dark);
    const screen=box(g,p,6.7,3.4,0.12,0,3,-1.75,p.main);screen.name='studio-screen-housing';
    const play=mesh(g,new T.ConeGeometry(0.7,1.1,3),p.glow,0,3,-1.5);play.name='studio-play-placeholder';play.rotation.z=-Math.PI/2;play.rotation.y=Math.PI/2;
    for(let i=0;i<7;i++)box(g,p,0.1,0.7+Math.abs(Math.sin(i))*1.5,0.1,-3+i,0.8,1.7,p.glow);
    for(const x of [-4,4])box(g,p,0.3,6,0.3,x,3,-2,p.stone);
    const timber=material('#ac9271',.86,.02,'wood'),trim=material('#b9a67c',.4,.45,'metal');
    box(g,p,8.35,.18,2.6,0,6,-1.05,p.stone);
    for(let i=0;i<17;i++)box(g,p,.11,.14,2.5,-3.8+i*.475,5.78,-1.05,timber);
    box(g,p,8.05,.06,.065,0,5.7,.22,trim);
    for(const x of [-3.75,3.75])for(let i=0;i<8;i++)box(g,p,.12,.075,.26,x,1.3+i*.47,-1.74,timber);
    for(let i=0;i<23;i++)box(g,p,.16,4.45,.045,-3.74+i*.34,2.75,-2.225,timber);
    for(const y of [.55,4.98])box(g,p,7.9,.065,.07,0,y,-2.25,trim);
    for(const x of [-3.2,3.2]){box(g,p,.8,1.5,.65,x,1.1,.9,p.dark);for(const y of [.8,1.4]){const speaker=mesh(g,new T.CircleGeometry(.23,20),p.main,x,y,1.235);speaker.castShadow=false;}}
    mesh(g,new T.CylinderGeometry(.04,.06,1.6,8),p.dark,-1.5,1.1,1.3);mesh(g,new T.CapsuleGeometry(.1,.22,4,8),p.stone,-1.5,2,1.3);
    box(g,p,1.3,.12,.95,2,1.9,1.1,p.stone);box(g,p,.1,1.15,.1,2,1.28,1.1,p.dark);
    const record=mesh(g,new T.CylinderGeometry(.4,.4,.035,48),p.dark,2,1.99,1.1);
    mesh(g,new T.CylinderGeometry(.13,.13,.04,32),p.main,2,2.01,1.1);
    for(const radius of [.23,.29,.35]){const groove=mesh(g,new T.TorusGeometry(radius,.005,4,48),p.main,2,2.015,1.1);groove.rotation.x=Math.PI/2;groove.castShadow=false;}
    record.castShadow=false;box(g,p,.035,.035,.55,2.46,2.08,1.12,p.dark);
  }
};
export function buildExhibit(kind:string,color:string) {
  const group=new T.Group();
  const p:Palette={main:material(color,.55,.08),dark:material('#748e91',.48,.12),stone:material('#fff0da',.7,0),glow:new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.18,roughness:.5})};
  mesh(group,new T.CylinderGeometry(3.7,4.05,.32,80),p.stone,0,-.09);
  ring(group,3.87,.07,p.main);
  (builders[kind]??builders.gallery)(group,p);
  return group;
}
