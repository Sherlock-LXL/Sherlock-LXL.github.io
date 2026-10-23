import * as T from 'three';
import {harbor,harborHeight} from '../../shared/harbor.mjs';
import {material,mesh,softBox} from './architecture';
import {sign,type Obstacle} from './scenery';
import {batchStatic} from './optimizer';
import {kit,place,roof,beam as paintedBeam,lantern} from './vernacular';
import {buildBoat} from './boats';

/** A timber landing stage below the hub: rope-railed ramp, a roofed ticket kiosk and a moored sail junk. */
export function buildHarbor(scene:T.Scene,obstacles:Obstacle[]){
 const root=new T.Group();root.name='harbor';scene.add(root);
 const wood=kit.timberLight(),post=kit.timber(),cap=kit.stoneDark(),rope=material('#b59a6c',.92,0,'wood');
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material=wood)=>mesh(root,softBox(w,h,d),m,x,y,z);
 const beam=(a:T.Vector3,b:T.Vector3,r:number,m:T.Material)=>{const v=b.clone().sub(a),o=mesh(root,new T.CylinderGeometry(r,r,v.length(),6),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;};
 // Short sloped planks follow the exact walking surface instead of forming floating steps.
 for(let z=harbor.rampStart;z<harbor.deckEnd;z+=.32){const end=Math.min(z+.318,harbor.deckEnd),a=harborHeight(0,z)!,b=harborHeight(0,end)!,plank=box(z<22?3.6:7.4,.16,Math.hypot(end-z,b-a),0,(a+b)/2-.085,(z+end)/2,Math.round(z/.32)%5?wood:post);plank.rotation.x=-Math.atan2(b-a,end-z);}
 for(const side of [-1,1]){
  for(const z of [9.2,11,12.8,14.6,16.4,18.2,20,22]){const y=harborHeight(0,z)!;const p=box(.13,1.08,.13,side*1.68,y+.48,z,post);p.name=z===22?'harbor-ramp-end-post':'harbor-ramp-post';box(.17,.07,.17,side*1.68,y+1.06,z,cap);}
  for(const h of [.38,.92])beam(new T.Vector3(side*1.68,h,9.2),new T.Vector3(side*1.68,harbor.level+h,22),.03,rope);
  obstacles.push({x:side*1.68,z:15.6,radius:.025,segment:[side*1.68,9.2,side*1.68,22],height:1.3});
  for(const z of [22.2,24.2,26.2,28.6]){box(.18,1.08,.18,side*3.52,harbor.level+.48,z,post);box(.28,.1,.28,side*3.52,harbor.level+1.05,z,cap);box(.24,2.8,.24,side*3.3,-6,z,post);}
  for(const h of [.4,.95])beam(new T.Vector3(side*3.52,harbor.level+h,22.2),new T.Vector3(side*3.52,harbor.level+h,28.6),.03,rope);
  obstacles.push({x:side*3.52,z:25.5,radius:.04,segment:[side*3.52,22,side*3.52,29],height:harbor.level+1.3});
 }
 // Ticket kiosk: lacquered posts under a small tiled roof; the counter faces back up the ramp.
 const y=harbor.level;
 for(const x of [-1.4,1.4])for(const z of [26.3,27.9]){place(root,new T.CylinderGeometry(.13,.15,.12,10),kit.stone(),x,y+.06,z);place(root,new T.CylinderGeometry(.08,.09,2.38,10),kit.lacquer(),x,y+1.31,z);obstacles.push({x,z,radius:.15,height:y+2.5});}
 paintedBeam(root,3.1,0,y+2.5,26.3,0,.2,.14);paintedBeam(root,3.1,0,y+2.5,27.9,0,.2,.14);
 roof(root,{width:3,depth:1.7,height:.62,overhang:.42,lift:.22,y:y+2.6,z:27.1});
 box(2.5,.88,.8,0,y+.44,26.7,post);box(2.8,.12,1,0,y+.94,26.7,wood);
 for(let i=0;i<5;i++)box(.36,.6,.03,-1+i*.5,y+.45,26.29,kit.lattice());
 const name=sign(root,'海风港口','等下一次，向海出发','#acd9c5',2.7,.55);name.position.set(0,y+1.9,27.1);name.rotation.y=Math.PI;
 obstacles.push({x:0,z:26.7,radius:0,halfX:1.35,halfZ:.5,height:y+1.06});
 box(7.25,.09,.09,0,y+.95,28.75,rope);obstacles.push({x:0,z:28.75,radius:.04,segment:[-3.6,28.75,3.6,28.75],height:y+1.3});
 // Stone bollards and coiled lines stay outside the clear walking strip.
 for(const x of [-2.9,2.9])for(const z of [23,27.6]){place(root,new T.CylinderGeometry(.12,.15,.3,10),kit.stone(),x,y+.15,z);place(root,new T.SphereGeometry(.13,10,6),kit.stone(),x,y+.33,z).scale.y=.6;}
 for(let i=0;i<3;i++){const coil=mesh(root,new T.TorusGeometry(.22-i*.05,.03,5,20),rope,-3.1,y+.04+i*.05,25.2);coil.rotation.x=Math.PI/2;}
 lantern(root,3.05,25.2,.62,y);obstacles.push({x:3.05,z:25.2,radius:.25,height:y+1.2});
 const release=batchStatic(root);
 // A full-size double-masted junk and a small covered tender point out to sea.
 const boat=buildBoat('junk');boat.name='harbor-launch';boat.position.set(.65,-5.5,35);boat.scale.setScalar(1.18);scene.add(boat);
 const tender=buildBoat('sampan');tender.name='harbor-tender';tender.position.set(-3,-5.48,32.4);tender.scale.setScalar(1.08);scene.add(tender);
 // Keep a slack catenary attached to the moving cleat without reallocating geometry each frame.
 const lines=[{vessel:boat,side:0,x:-2.9},{vessel:boat,side:1,x:2.9},{vessel:tender,side:1,x:-2.9}].map(({vessel,side,x})=>{
  const start=new T.Vector3(x,y+.3,27.6),anchor=(vessel.userData.mooring as T.Vector3[])[side],end=new T.Vector3();
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(new Float32Array(25*3),3));
  const line=new T.Line(geometry,new T.LineBasicMaterial({color:'#bca77c'}));line.frustumCulled=false;root.add(line);
  return {vessel,start,anchor,end,geometry};
 });
 const boatRelease=batchStatic(boat),tenderRelease=batchStatic(tender);let time=0;
 const update=(dt:number)=>{
  time+=dt;boat.position.y=-5.5+Math.sin(time*.64)*.045;boat.rotation.z=Math.sin(time*.5)*.012;tender.position.y=-5.48+Math.sin(time*.78+.8)*.055;tender.rotation.z=Math.sin(time*.62+.5)*.022;
  for(const {vessel,start,anchor,end,geometry} of lines){
   vessel.updateMatrixWorld(true);end.copy(anchor);vessel.localToWorld(end);const p=geometry.attributes.position;
   for(let i=0;i<25;i++){const t=i/24;p.setXYZ(i,T.MathUtils.lerp(start.x,end.x,t),T.MathUtils.lerp(start.y,end.y,t)-.3*Math.sin(Math.PI*t),T.MathUtils.lerp(start.z,end.z,t));}p.needsUpdate=true;
  }
 };
 update(0);
 return {root,boat,tender,update,dispose(){release();boatRelease();tenderRelease();for(const {geometry} of lines)geometry.dispose();}};
}
