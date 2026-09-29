import * as T from 'three';
import {harbor,harborHeight} from '../../shared/harbor.mjs';
import {material,mesh,softBox} from './architecture';
import {sign,type Obstacle} from './scenery';
import {batchStatic} from './optimizer';
import {nightLight} from './hub';

export function buildHarbor(scene:T.Scene,obstacles:Obstacle[]){
 const root=new T.Group();root.name='harbor';scene.add(root);
 const wood=material('#d9b78f',.78,.02,'wood'),trim=material('#638f95',.48,.25,'metal'),ivory=material('#f9e8c9',.8,0,'plaster'),rope=material('#c8b595',.92,0,'wood'),glow=nightLight('#f5d7a0');
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material=wood)=>mesh(root,softBox(w,h,d),m,x,y,z);
 const beam=(a:T.Vector3,b:T.Vector3,r:number,m:T.Material)=>{const v=b.clone().sub(a),o=mesh(root,new T.CylinderGeometry(r,r,v.length(),8),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;};
 // Short sloped planks follow the exact walking surface instead of forming floating steps.
 for(let z=harbor.rampStart;z<harbor.deckEnd;z+=.32){const end=Math.min(z+.318,harbor.deckEnd),a=harborHeight(0,z)!,b=harborHeight(0,end)!,plank=box(z<22?3.6:7.4,.16,Math.hypot(end-z,b-a),0,(a+b)/2-.085,(z+end)/2);plank.rotation.x=-Math.atan2(b-a,end-z);}
 for(const side of [-1,1]){
  for(const z of [9.2,11,12.8,14.6,16.4,18.2,20,22]){const y=harborHeight(0,z)!;const post=box(.13,1.08,.13,side*1.68,y+.48,z,trim);post.name=z===22?'harbor-ramp-end-post':'harbor-ramp-post';box(.09,.07,.09,side*1.68,y+1.06,z,glow);}
  for(const h of [.38,.92])beam(new T.Vector3(side*1.68,h,9.2),new T.Vector3(side*1.68,harbor.level+h,22),.033,rope);
  obstacles.push({x:side*1.68,z:15.6,radius:.025,segment:[side*1.68,9.2,side*1.68,22],height:1.3});
  for(const z of [22.2,24.2,26.2,28.6]){box(.18,1.08,.18,side*3.52,harbor.level+.48,z,trim);box(.3,.08,.3,side*3.52,harbor.level+1.04,z,ivory);box(.19,2.8,.19,side*3.3,-6,z);}
  for(const h of [.4,.95])beam(new T.Vector3(side*3.52,harbor.level+h,22.2),new T.Vector3(side*3.52,harbor.level+h,28.6),.032,rope);
  obstacles.push({x:side*3.52,z:25.5,radius:.04,segment:[side*3.52,22,side*3.52,29],height:harbor.level+1.3});
 }
 // Sheltered ticket desk: the open face looks back up the ramp toward the central island.
 const y=harbor.level;
 for(const x of [-1.4,1.4])box(.16,2.5,.16,x,y+1.25,27.8,trim);
 box(3.45,.16,2,0,y+2.55,27.1,ivory);box(2.5,.88,.8,0,y+.44,26.7,trim);box(2.8,.12,1,0,y+.94,26.7,wood);
 const name=sign(root,'海风港口','等下一次，向海出发','#7ba3a4',2.7,.55);name.position.set(0,y+1.9,27.1);name.rotation.y=Math.PI;
 obstacles.push({x:0,z:26.7,radius:0,halfX:1.35,halfZ:.5,height:y+1.06});
 box(7.25,.09,.09,0,y+.95,28.75,rope);obstacles.push({x:0,z:28.75,radius:.04,segment:[-3.6,28.75,3.6,28.75],height:y+1.3});
 // Mooring hardware and life rings stay outside the clear walking strip.
 for(const x of [-2.9,2.9])for(const z of [23,27.6]){mesh(root,new T.CylinderGeometry(.09,.13,.28,12),trim,x,y+.14,z);box(.38,.07,.1,x,y+.3,z,trim);}
 const life=mesh(root,new T.TorusGeometry(.34,.095,12,32),ivory,-3.53,y+.5,25.2);life.rotation.y=Math.PI/2;
 for(const z of [23,27.6]){const curve=new T.CatmullRomCurve3([new T.Vector3(2.9,y+.27,z),new T.Vector3(3.85,-5.2,z+.12),new T.Vector3(5.3,-4.82,z+.15)]);mesh(root,new T.TubeGeometry(curve,12,.018,5,false),rope).castShadow=false;}
 const release=batchStatic(root);
 // A moored launch rests at sea level, separate from the accessible pier.
 const boat=new T.Group();boat.name='harbor-launch';boat.position.set(5.65,-5.35,25.5);scene.add(boat);
 // An open-topped shell meets a matching oval deck; a full sphere used to
 // emerge through the rectangular floor at the bow and cabin edges.
 const cut=Math.acos(.6),hull=mesh(boat,new T.SphereGeometry(1,40,18,0,Math.PI*2,cut,Math.PI-cut),trim);hull.scale.set(1.25,.7,3.1);
 const outline=new T.Shape();outline.absellipse(0,0,1.03,2.51,0,Math.PI*2,false,0);
 const deck=mesh(boat,new T.ExtrudeGeometry(outline,{depth:.12,bevelEnabled:false,curveSegments:48}),wood,0,.42);deck.rotation.x=-Math.PI/2;deck.name='launch-oval-deck';
 const seam=material('#b18f6e',.92,0,'wood');
 for(let z=-2.3;z<=2.3;z+=.28){const w=2.04*Math.sqrt(1-(z/2.51)**2);mesh(boat,new T.BoxGeometry(w,.006,.012),seam,0,.544,z);}
 const gunwale=mesh(boat,new T.TorusGeometry(1,.028,8,64),ivory,0,.53);gunwale.rotation.x=Math.PI/2;gunwale.scale.set(1.06,2.55,1);
 mesh(boat,softBox(1.55,1.3,1.8),ivory,0,1.18,-.15);
 mesh(boat,softBox(1.75,.14,2.05),trim,0,1.89,-.15);
 const glass=material('#7fbdc9',.22,.28,'metal');mesh(boat,softBox(1.2,.6,.04),glass,0,1.33,.77);
 for(const side of [-1,1])mesh(boat,softBox(.04,.6,1.15),glass,side*.79,1.33,-.15);
 mesh(boat,new T.CylinderGeometry(.028,.04,1.1,8),trim,0,2.5,-.2);
 for(const side of [-1,1])for(const z of [-1.4,1.5]){const fender=mesh(boat,new T.CapsuleGeometry(.085,.3,4,10),ivory,side*.95,.22,z);fender.rotation.z=side*.16;}
 for(const z of [-2.35,2.25])mesh(boat,new T.CylinderGeometry(.055,.07,.14,10),trim,-.35,.61,z);
 const boatRelease=batchStatic(boat);let time=0;
 return {root,boat,update(dt:number){time+=dt;boat.position.y=-5.35+Math.sin(time*.7)*.055;boat.rotation.z=Math.sin(time*.55)*.018;},dispose(){release();boatRelease();}};
}
