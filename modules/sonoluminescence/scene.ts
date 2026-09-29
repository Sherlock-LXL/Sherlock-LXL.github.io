import * as T from 'three';
import {material,mesh,softBox} from '../../src/world/architecture';
import {batchStatic} from '../../src/world/optimizer';
import {confinedBubble} from '../../shared/science-cycles.mjs';
import type {SceneFactory} from '../../src/world/module-contract';
export default {version:1,create(){
  const root=new T.Group(),metal=material('#8facbc',.38,.35),stone=material('#dce8ec',.75,.08);
  mesh(root,new T.CylinderGeometry(2.2,2.4,.35,48),stone,0,.175);
  mesh(root,new T.CylinderGeometry(.7,1.2,.5,24),metal,0,.6);
  const center=new T.Group();center.position.y=2.8;root.add(center);
  mesh(center,new T.SphereGeometry(1.87,48,32),new T.MeshPhysicalMaterial({color:'#acd6ea',transparent:true,opacity:.14,roughness:.08,depthWrite:false,side:T.DoubleSide}));
  for(const angle of [-.62,.62]){const ring=mesh(center,new T.TorusGeometry(1.9,.04,8,80),metal);ring.rotation.y=angle;ring.rotation.x=.15;}
  for(const side of [-1,1]){
    const driver=mesh(center,new T.CylinderGeometry(.42,.42,.38,24),metal,side*1.99);driver.rotation.z=Math.PI/2;
    mesh(root,softBox(.14,2.9,.5),metal,side*2.23,1.55);
  }
  const animation=new T.Group();animation.userData.dynamic=true;center.add(animation);
  const bubble=mesh(animation,new T.SphereGeometry(1,28,20),new T.MeshPhysicalMaterial({color:'#d8f2ff',roughness:.12,metalness:.08,transparent:true,opacity:.64}));bubble.castShadow=false;
  const halo=mesh(animation,new T.SphereGeometry(1,20,16),new T.MeshBasicMaterial({color:'#d0ecff',transparent:true,opacity:0,depthWrite:false}));halo.castShadow=false;
  const waves:T.Mesh[]=[];
  for(const side of [-1,1])for(let i=0;i<3;i++){const wave=mesh(animation,new T.TorusGeometry(.55,.018,5,40),new T.MeshBasicMaterial({color:'#acd8ec',transparent:true,opacity:.2,depthWrite:false}));wave.rotation.y=Math.PI/2;wave.userData.side=side;wave.userData.phase=i/3;wave.castShadow=false;waves.push(wave);}
  let time=0;const release=batchStatic(root);
  return {root,colliders:[{x:0,z:0,radius:2.45,height:4.75}],update(dt){time+=dt;const b=confinedBubble(time);bubble.scale.setScalar(b.radius);halo.scale.setScalar(.09+b.flash*.27);(halo.material as T.MeshBasicMaterial).opacity=b.flash*.85;waves.forEach(w=>{const p=(time*.45+w.userData.phase)%1;w.position.x=w.userData.side*(1.7-p*1.5);w.scale.setScalar(1-.55*p);(w.material as T.MeshBasicMaterial).opacity=Math.sin(p*Math.PI)*.18;});},dispose:release};
}} satisfies SceneFactory;
