import * as T from 'three';
import {harbor,harborHeight} from '../../shared/harbor.mjs';
import {material,mesh,softBox} from './architecture';
import {sign,type Obstacle} from './scenery';
import {batchStatic} from './optimizer';
import {kit,place,roof,beam as paintedBeam,lantern} from './vernacular';

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
 const boat=new T.Group();boat.name='harbor-launch';boat.position.set(.65,-5.38,35);boat.scale.setScalar(1.18);scene.add(boat);
 const hullWood=material('#654331',.82,.02,'wood'),hullDark=material('#352f2b',.9,.01,'wood'),trim=material('#a34d38',.86,.01,'wood'),seam=material('#8c6845',.92,0,'wood'),cut=Math.acos(.58);
 const hull=mesh(boat,new T.SphereGeometry(1,48,20,0,Math.PI*2,cut,Math.PI-cut),hullWood);hull.scale.set(1.55,.78,3.7);
 const lowerHull=mesh(boat,new T.SphereGeometry(1,40,16,0,Math.PI*2,cut+.18,Math.PI-cut-.36),hullDark,0,-.08);lowerHull.scale.set(1.42,.72,3.55);
 const outline=new T.Shape();outline.absellipse(0,0,1.3,3.08,0,Math.PI*2,false,0);
 const deck=mesh(boat,new T.ExtrudeGeometry(outline,{depth:.14,bevelEnabled:false,curveSegments:56}),wood,0,.48);deck.rotation.x=-Math.PI/2;deck.name='launch-oval-deck';
 for(let z=-2.8;z<=2.8;z+=.3){const w=2.58*Math.sqrt(Math.max(0,1-(z/3.08)**2));mesh(boat,new T.BoxGeometry(w,.009,.018),seam,0,.626,z);}
 const gunwale=mesh(boat,new T.TorusGeometry(1,.045,7,72),trim,0,.65);gunwale.rotation.x=Math.PI/2;gunwale.scale.set(1.34,3.16,1);
 for(const side of [-1,1]){
  for(const z of [-2.15,-1.35,-.55,.25,1.05,1.85])mesh(boat,new T.CylinderGeometry(.026,.032,.54,6),post,side*1.22,.9,z);
  for(const h of [.8,1.13])mesh(boat,new T.BoxGeometry(.055,.045,4.55),h>.9?trim:post,side*1.22,h,-.12);
 }
 for(const s of [-1,1]){const end=mesh(boat,softBox(1.08,.62,.88),hullWood,0,.82,s*3.05);end.rotation.x=-s*.31;mesh(boat,new T.BoxGeometry(.96,.08,.5),trim,0,1.06,s*3.17).rotation.x=-s*.31;}
 // A glazed stern cabin carries a shallow tiled roof.
 mesh(boat,softBox(2.05,.92,1.28),kit.plaster(),0,1.11,-1.7);
 for(const z of [-2.35,-1.05])for(const x of [-.66,0,.66])mesh(boat,new T.BoxGeometry(.5,.48,.028),kit.lattice(),x,1.18,z).castShadow=false;
 roof(boat,{width:2.35,depth:1.55,height:.45,overhang:.28,lift:.17,thickness:.07,y:1.62,z:-1.7});
 for(const x of [-.88,.88])lantern(boat,x,-2.25,.28,.78);
 const sailCanvas=material('#b96843',.95,0,'plaster');sailCanvas.side=T.DoubleSide;
 const sail=(z:number,height:number,width:number,lean:number,color:T.Material)=>{
  mesh(boat,new T.CylinderGeometry(.043,.065,height+.6,8),post,0,.72+(height+.6)/2,z);
  const rig=new T.Group();rig.position.set(0,1.05,z);rig.rotation.y=Math.PI/2+lean;boat.add(rig);
  const shape=new T.Shape();shape.moveTo(0,0);shape.lineTo(width,.08);shape.quadraticCurveTo(width*1.08,height*.55,width*.82,height);shape.lineTo(0,height*.92);shape.closePath();
  mesh(rig,new T.ShapeGeometry(shape,12),color,0,0,.07).castShadow=false;
  for(let i=0;i<6;i++){const h=.06+i*height/5.5,w=width*(1-.03*i);mesh(rig,new T.BoxGeometry(w,.032,.032),post,w/2,h,.1);}
 };
 sail(.85,3,1.95,-.2,sailCanvas);sail(-.8,2.25,1.35,.18,material('#d2a65d',.96,0,'plaster'));
 const oar=mesh(boat,new T.BoxGeometry(.07,.05,1.55),post,.65,.78,-3);oar.rotation.x=-.44;
 const tender=new T.Group();tender.name='harbor-tender';tender.position.set(-3,-5.39,32.4);tender.scale.setScalar(1.08);scene.add(tender);
 const tenderHull=mesh(tender,new T.SphereGeometry(1,28,12,0,Math.PI*2,Math.acos(.58),Math.PI-Math.acos(.58)),material('#78523b',.86,.01,'wood'));tenderHull.scale.set(.72,.42,1.75);
 mesh(tender,new T.BoxGeometry(1.08,.1,2.65),kit.timberLight(),0,.31);
 const awning=material('#d8c08b',.96,0,'wood');awning.side=T.DoubleSide;
 const canopy=mesh(tender,new T.CylinderGeometry(.52,.52,1.35,14,1,true,0,Math.PI),awning,0,.44,-.15);canopy.rotation.x=-Math.PI/2;
 for(const z of [-.78,-.42,-.06,.3])mesh(tender,new T.TorusGeometry(.53,.025,5,18,Math.PI),post,0,.44,z);
 for(const side of [-1,1]){const o=mesh(tender,new T.BoxGeometry(.045,.035,1.8),post,side*.58,.42,.25);o.rotation.x=side*.12;}
 mesh(tender,new T.BoxGeometry(.32,.07,.65),kit.timber(),0,.48,1.16);
 boat.updateMatrixWorld(true);
 for(const side of [-1,1]){
  const end=boat.localToWorld(new T.Vector3(side*1.08,.72,-3));
  const curve=new T.CatmullRomCurve3([new T.Vector3(side*2.9,y+.3,27.6),new T.Vector3(side*3.1,-5.08,29.4),end]);
  mesh(root,new T.TubeGeometry(curve,12,.018,5,false),rope).castShadow=false;
 }
 tender.updateMatrixWorld(true);
 const tenderEnd=tender.localToWorld(new T.Vector3(.45,.38,-1.25)),tenderLine=new T.CatmullRomCurve3([new T.Vector3(-2.9,y+.3,27.6),new T.Vector3(-3.35,-5.12,29.3),tenderEnd]);
 mesh(root,new T.TubeGeometry(tenderLine,12,.018,5,false),rope).castShadow=false;
 const boatRelease=batchStatic(boat),tenderRelease=batchStatic(tender);let time=0;
 return {root,boat,tender,update(dt:number){time+=dt;boat.position.y=-5.38+Math.sin(time*.64)*.05;boat.rotation.z=Math.sin(time*.5)*.012;tender.position.y=-5.39+Math.sin(time*.78+.8)*.065;tender.rotation.z=Math.sin(time*.62+.5)*.022;},dispose(){release();boatRelease();tenderRelease();}};
}
