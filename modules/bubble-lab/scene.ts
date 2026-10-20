import * as T from 'three';
import {mesh} from '../../src/world/architecture';
import {kit,place,beam,podium} from '../../src/world/vernacular';
import {batchStatic} from '../../src/world/optimizer';
import {risingBubble} from '../../shared/science-cycles.mjs';
import type {SceneFactory} from '../../src/world/module-contract';
/** A glass water tank in a timber frame on a carved stone base; six bronze nozzles release bubbles that break at the surface. */
export default {version:1,create(){
  const root=new T.Group(),timber=kit.timber(),bronze=kit.bronze();
  podium(root,4.3,3.5,.45);
  place(root,new T.BoxGeometry(3.9,.09,3.1),kit.stoneDark(),0,.495);
  // Carved panels on the base's long faces.
  for(const s of [-1,1])for(let i=0;i<3;i++)place(root,new T.BoxGeometry(1.05,.24,.03),kit.marble(),-1.25+i*1.25,.2,s*1.765).castShadow=false;
  const water=new T.MeshPhysicalMaterial({color:'#8fbcae',transparent:true,opacity:.14,roughness:.2,side:T.DoubleSide,depthWrite:false});
  mesh(root,new T.BoxGeometry(3.3,3.26,2.5),water,0,2.2);
  for(const x of [-1.8,1.8])for(const z of [-1.45,1.45]){place(root,new T.BoxGeometry(.12,4.1,.12),timber,x,2.5,z);place(root,new T.BoxGeometry(.2,.12,.2),bronze,x,4.6,z);}
  for(const y of [.62,3.95]){for(const s of [-1,1]){place(root,new T.BoxGeometry(3.72,.1,.1),timber,0,y,s*1.45);place(root,new T.BoxGeometry(.1,.1,2.98),timber,s*1.8,y,0);}}
  // The top rim carries a painted beam on each long side.
  for(const s of [-1,1])beam(root,3.8,0,4.47,s*1.48,0,.16,.14);
  for(const s of [-1,1])place(root,new T.BoxGeometry(.14,.12,3.1),timber,s*1.82,4.47,0);
  const surface=mesh(root,new T.PlaneGeometry(3.3,2.5),new T.MeshStandardMaterial({color:'#bfe0d4',transparent:true,opacity:.27,roughness:.25,side:T.DoubleSide,depthWrite:false}),0,3.83);surface.rotation.x=-Math.PI/2;
  const animated=new T.Group();animated.userData.dynamic=true;root.add(animated);
  const bubbles:Array<{orb:T.Mesh;ring:T.Mesh}>=[];
  for(let i=0;i<6;i++){
    const x=(i%3-1)*.83,z=(Math.floor(i/3)-.5)*1.1;
    place(root,new T.CylinderGeometry(.09,.14,.09,12),bronze,x,.66,z);
    const orb=mesh(animated,new T.SphereGeometry(1,20,12),new T.MeshPhysicalMaterial({color:'#f2f7f2',metalness:.12,roughness:.08,transparent:true,opacity:.48}),x,.7,z);orb.castShadow=false;
    const ring=mesh(animated,new T.TorusGeometry(1,.035,6,32),new T.MeshBasicMaterial({color:'#f6f1e2',transparent:true,opacity:0,depthWrite:false}),x,3.85,z);ring.rotation.x=-Math.PI/2;ring.castShadow=false;bubbles.push({orb,ring});
  }
  const release=batchStatic(root);let time=0;
  return {root,colliders:[{x:0,z:0,radius:0,halfX:2.15,halfZ:1.75,height:4.6}],update(dt){time+=dt;bubbles.forEach(({orb,ring},i)=>{const b=risingBubble(time,i);orb.visible=b.visible;orb.position.y=b.y;orb.scale.setScalar(b.radius);ring.visible=!b.visible;ring.scale.setScalar(.12+b.ripple*.65);(ring.material as T.MeshBasicMaterial).opacity=(1-b.ripple)*.45;});},dispose:release};
}} satisfies SceneFactory;
