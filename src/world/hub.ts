import * as T from 'three';
import {material,mesh} from './architecture';
export function nightLight(color:string){const m=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.12,roughness:.6});m.userData.nightGlow=true;return m;}
/** An open celestial fountain, visible from every arrival direction. */
export function buildHub(){
  const hub=new T.Group();hub.name='celestial-hub';
  const cream=material('#f5e6cb',.85,.03,'stone'),mint=material('#a5d1c4',.45,.18),brass=material('#d6b982',.38,.4),glow=nightLight('#c4eef3');
  mesh(hub,new T.CylinderGeometry(1.65,1.95,.22,64),cream,0,.11);
  mesh(hub,new T.CylinderGeometry(1.45,1.7,.28,64),mint,0,.34);
  mesh(hub,new T.CylinderGeometry(1.35,1.35,.035,64),material('#91cbd9',.2,.25),0,.50);
  const rim=mesh(hub,new T.TorusGeometry(1.46,.055,8,72),brass,0,.49);rim.rotation.x=Math.PI/2;
  const profile=[[.7,.48],[.56,.67],[.3,1.03],[.2,1.65],[.34,1.9],[.55,2.03]].map(([x,y])=>new T.Vector2(x,y));
  mesh(hub,new T.LatheGeometry(profile,40),cream);
  for(let i=0;i<3;i++){const arc=mesh(hub,new T.TorusGeometry(1.12+i*.12,.035,8,96),i===1?glow:brass,0,2.8);arc.rotation.set(.4+i*.7,i*Math.PI/3,.25);}
  mesh(hub,new T.IcosahedronGeometry(.42,1),new T.MeshPhysicalMaterial({color:'#bceae3',metalness:.22,roughness:.14}),0,2.8);
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const dot=mesh(hub,new T.SphereGeometry(.075,12,8),glow,Math.cos(a)*1.2,2.8+Math.sin(a)*.65,Math.sin(a)*.85);dot.castShadow=false;}
  for(const radius of [2.3,5.4,7.9]){const ring=mesh(hub,new T.TorusGeometry(radius,.023,6,96),glow,0,.04);ring.rotation.x=-Math.PI/2;ring.castShadow=false;}
  for(let i=0;i<16;i++){const a=i*Math.PI/8;const tick=mesh(hub,new T.BoxGeometry(.045,.025,i%4===0?.65:.25),brass,Math.sin(a)*5,.03,Math.cos(a)*5);tick.rotation.y=a;tick.castShadow=false;}
  return hub;
}
