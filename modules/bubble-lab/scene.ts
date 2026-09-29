import * as T from 'three';
import {material,mesh,softBox} from '../../src/world/architecture';
import {batchStatic} from '../../src/world/optimizer';
import {risingBubble} from '../../shared/science-cycles.mjs';
import type {SceneFactory} from '../../src/world/module-contract';
export default {version:1,create(){
  const root=new T.Group(),body=material('#d9e3e3',.65,.15),trim=material('#8bafb7',.4,.2);
  mesh(root,softBox(4.3,.45,3.5),body,0,.225);
  mesh(root,softBox(3.7,.18,2.9),trim,0,.54);
  const water=new T.MeshPhysicalMaterial({color:'#83c4d1',transparent:true,opacity:.12,roughness:.2,side:T.DoubleSide,depthWrite:false});
  mesh(root,new T.BoxGeometry(3.3,3.26,2.5),water,0,2.2);
  for(const x of [-1.8,1.8])for(const z of [-1.45,1.45])mesh(root,softBox(.09,4.1,.09),trim,x,2.5,z);
  mesh(root,softBox(3.8,.12,3.1),body,0,.55);
  for(const side of [-1,1]){mesh(root,softBox(.14,.12,3.1),body,side*1.82,4.53);mesh(root,softBox(3.8,.12,.14),body,0,4.53,side*1.48);}
  const surface=mesh(root,new T.PlaneGeometry(3.3,2.5),new T.MeshStandardMaterial({color:'#b9e4e8',transparent:true,opacity:.27,roughness:.25,side:T.DoubleSide,depthWrite:false}),0,3.83);surface.rotation.x=-Math.PI/2;
  const animated=new T.Group();animated.userData.dynamic=true;root.add(animated);
  const bubbles:Array<{orb:T.Mesh;ring:T.Mesh}>=[];
  for(let i=0;i<6;i++){
    const x=(i%3-1)*.83,z=(Math.floor(i/3)-.5)*1.1;
    mesh(root,new T.CylinderGeometry(.09,.14,.09,12),trim,x,.66,z);
    const orb=mesh(animated,new T.SphereGeometry(1,20,12),new T.MeshPhysicalMaterial({color:'#e8fbff',metalness:.12,roughness:.08,transparent:true,opacity:.48}),x,.7,z);orb.castShadow=false;
    const ring=mesh(animated,new T.TorusGeometry(1,.035,6,32),new T.MeshBasicMaterial({color:'#edffff',transparent:true,opacity:0,depthWrite:false}),x,3.85,z);ring.rotation.x=-Math.PI/2;ring.castShadow=false;bubbles.push({orb,ring});
  }
  const release=batchStatic(root);let time=0;
  return {root,colliders:[{x:0,z:0,radius:0,halfX:2.15,halfZ:1.75,height:4.6}],update(dt){time+=dt;bubbles.forEach(({orb,ring},i)=>{const b=risingBubble(time,i);orb.visible=b.visible;orb.position.y=b.y;orb.scale.setScalar(b.radius);ring.visible=!b.visible;ring.scale.setScalar(.12+b.ripple*.65);(ring.material as T.MeshBasicMaterial).opacity=(1-b.ripple)*.45;});},dispose:release};
}} satisfies SceneFactory;
