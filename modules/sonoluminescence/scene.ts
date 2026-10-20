import * as T from 'three';
import {mesh} from '../../src/world/architecture';
import {kit,place,drumStool} from '../../src/world/vernacular';
import {batchStatic} from '../../src/world/optimizer';
import {confinedBubble} from '../../shared/science-cycles.mjs';
import type {SceneFactory} from '../../src/world/module-contract';
/** A glass flask held in bronze rings like a small armillary, driven by two drum transducers on a carved stone base. */
export default {version:1,create(){
  const root=new T.Group(),bronze=kit.bronze(),patina=kit.patina();
  drumStool(root,0,0,2.3,.35,kit.stone());
  place(root,new T.CylinderGeometry(2.36,2.36,.05,40),kit.marble(),0,.375);
  // A lotus pedestal of patinated petals carries the flask.
  place(root,new T.CylinderGeometry(.7,1.1,.5,16),bronze,0,.6);
  for(let i=0;i<12;i++){const a=i/12*Math.PI*2,petal=place(root,new T.SphereGeometry(.28,8,6),patina,Math.cos(a)*.78,.82,Math.sin(a)*.78);petal.scale.set(.6,1.1,.35);petal.rotation.set(0,-a,.0);petal.lookAt(Math.cos(a)*3,2.5,Math.sin(a)*3);}
  const center=new T.Group();center.position.y=2.8;root.add(center);
  mesh(center,new T.SphereGeometry(1.87,48,32),new T.MeshPhysicalMaterial({color:'#d8e6df',transparent:true,opacity:.14,roughness:.08,depthWrite:false,side:T.DoubleSide}));
  for(const angle of [-.62,.62]){const ring=place(center,new T.TorusGeometry(1.9,.045,8,80),bronze);ring.rotation.y=angle;ring.rotation.x=.15;}
  const equator=place(center,new T.TorusGeometry(1.92,.04,8,80),kit.gold());equator.rotation.x=Math.PI/2;
  for(const side of [-1,1]){
    const driver=place(center,new T.CylinderGeometry(.42,.42,.38,24),kit.lacquer(),side*1.99);driver.rotation.z=Math.PI/2;
    const face=place(center,new T.CylinderGeometry(.36,.36,.02,24),kit.paper(),side*2.19);face.rotation.z=Math.PI/2;face.castShadow=false;
    // Each transducer stands on a carved timber post with a bronze collar.
    place(root,new T.BoxGeometry(.16,2.9,.5),kit.timber(),side*2.23,1.55);
    place(root,new T.BoxGeometry(.24,.12,.58),bronze,side*2.23,2.95);
  }
  const animation=new T.Group();animation.userData.dynamic=true;center.add(animation);
  const bubble=mesh(animation,new T.SphereGeometry(1,28,20),new T.MeshPhysicalMaterial({color:'#eef4ee',roughness:.12,metalness:.08,transparent:true,opacity:.64}));bubble.castShadow=false;
  const halo=mesh(animation,new T.SphereGeometry(1,20,16),new T.MeshBasicMaterial({color:'#f6dfa6',transparent:true,opacity:0,depthWrite:false}));halo.castShadow=false;
  const waves:T.Mesh[]=[];
  for(const side of [-1,1])for(let i=0;i<3;i++){const wave=mesh(animation,new T.TorusGeometry(.55,.018,5,40),new T.MeshBasicMaterial({color:'#e9dcb4',transparent:true,opacity:.2,depthWrite:false}));wave.rotation.y=Math.PI/2;wave.userData.side=side;wave.userData.phase=i/3;wave.castShadow=false;waves.push(wave);}
  let time=0;const release=batchStatic(root);
  return {root,colliders:[{x:0,z:0,radius:2.45,height:4.75}],update(dt){time+=dt;const b=confinedBubble(time);bubble.scale.setScalar(b.radius);halo.scale.setScalar(.09+b.flash*.27);(halo.material as T.MeshBasicMaterial).opacity=b.flash*.85;waves.forEach(w=>{const p=(time*.45+w.userData.phase)%1;w.position.x=w.userData.side*(1.7-p*1.5);w.scale.setScalar(1-.55*p);(w.material as T.MeshBasicMaterial).opacity=Math.sin(p*Math.PI)*.18;});},dispose:release};
}} satisfies SceneFactory;
