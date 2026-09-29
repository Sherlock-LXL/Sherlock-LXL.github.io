import * as T from 'three';
import {material,mesh,softBox} from './architecture';
const colors=['#b7d8c5','#e7bacd','#d6c397','#abc7e2','#c6b5de'];
export function pocketWonder(kind:string,g:T.Group,stone:T.Material,metal:T.Material,glow:T.Material){
 const parts:T.Object3D[]=[];
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m=metal)=>mesh(g,softBox(w,h,d),m,x,y,z);
 const sphere=(radius:number,x:number,y:number,z:number,m=stone)=>mesh(g,new T.SphereGeometry(radius,16,12),m,x,y,z);
 const floating=(x:number,y:number,z:number)=>{const p=new T.Group();p.position.set(x,y,z);g.add(p);parts.push(p);return p;};
 let animate=(time:number,energy:number,dt:number)=>{};
 let lastTime=0;
 switch(kind){
  case 'tokenloom':{
   for(const x of [-.62,.62])box(.055,1.45,.055,x,1.42,0);box(1.35,.08,.08,0,2.14,0);
   for(let i=0;i<6;i++){const p=floating(0,1.02+i*.17,0);mesh(p,softBox(.25,.12,.12),material(colors[i%5]),0,0,0);}
   animate=(t,e)=>parts.forEach((p,i)=>{p.position.x=Math.sin(t*.55+i*.8)*(.15+e*.38);p.position.z=Math.cos(t*.55+i*.8)*(.04+e*.15);p.rotation.y=e*Math.sin(t+i)*.4;});break;
  }
  case 'cloudbell':{
   const arc=mesh(g,new T.TorusGeometry(.72,.045,8,32,Math.PI),metal,0,1.68,0);arc.rotation.z=0;
   for(const x of [-.72,.72])box(.06,1,.06,x,1.2,0);
   for(let i=0;i<3;i++){const p=floating((i-1)*.35,1.72,0);mesh(p,new T.CylinderGeometry(.008,.008,.3,6),metal,0,-.15);mesh(p,new T.ConeGeometry(.17,.25,16,1,true),material(colors[i]),0,-.4);mesh(p,new T.SphereGeometry(.035,8,6),glow,0,-.5);}
   for(let i=0;i<3;i++){const cloud=sphere(.23,(i-1)*.25,2.27+(i===1?.07:0),0);cloud.scale.set(1.2,.7,.65);}
   animate=(t,e)=>parts.forEach((p,i)=>p.rotation.z=Math.sin(t*2.3+i)*(.025+e*.38));break;
  }
  case 'snowglobe':{
   const glass=new T.MeshPhysicalMaterial({color:'#c7e0ee',transparent:true,opacity:.22,roughness:.1,depthWrite:false});sphere(.7,0,1.47,0,glass);
   const hill=sphere(.38,0,.94,0);hill.scale.y=.25;
   mesh(g,new T.ConeGeometry(.25,.65,12),material('#afcfc5'),0,1.2,0);sphere(.055,0,1.55,0,glow);
   const flakes=new T.InstancedMesh(new T.SphereGeometry(.025,6,4),stone,36);flakes.userData.dynamic=true;g.add(flakes);const pose=new T.Object3D();parts.push(flakes);
   let fall=0,swirl=0;animate=(t,e,dt)=>{fall+=dt*(.05+e*.25);swirl+=dt*e*.5;for(let i=0;i<36;i++){const y=.95+((i*.193-fall)%1+1)%1,rr=Math.sqrt(Math.max(0,.58**2-(y-1.47)**2))*.8,a=i*2.4+swirl;pose.position.set(Math.cos(a)*rr,y,Math.sin(a)*rr);pose.updateMatrix();flakes.setMatrixAt(i,pose.matrix);}flakes.instanceMatrix.needsUpdate=true;};break;
  }
  case 'pendulum':{
   for(const x of [-.8,.8])for(const z of [-.23,.23])box(.045,1.45,.045,x,1.45,z);box(1.65,.065,.55,0,2.17,0);
   for(let i=0;i<5;i++){const p=floating((i-2)*.29,2.12,0);for(const z of [-.2,.2]){const line=mesh(p,new T.CylinderGeometry(.006,.006,.7,5),metal,0,-.35,z/2);line.rotation.x=z*.65;}mesh(p,new T.SphereGeometry(.145,16,12),material(colors[i],.25,.25),0,-.78);}
   animate=(t,e)=>parts.forEach((p,i)=>p.rotation.z=i===0?-Math.max(0,Math.sin(t*3))*e*.65:i===4?-Math.min(0,Math.sin(t*3))*e*.65:0);break;
  }
  case 'kaleidoscope':{
   box(.18,.7,.22,0,1.02,0);const frame=mesh(g,new T.TorusGeometry(.65,.1,6,8),metal,0,1.9,0);frame.rotation.z=Math.PI/8;
   const petals=floating(0,1.9,.03);for(let i=0;i<8;i++){const a=i*Math.PI/4,p=mesh(petals,new T.ConeGeometry(.16,.5,3),material(colors[i%5]),Math.sin(a)*.3,Math.cos(a)*.3,0);p.rotation.z=-a;p.scale.z=.3;}
   mesh(petals,new T.OctahedronGeometry(.16),glow);animate=(t,e)=>{petals.rotation.z=t*.08+e*Math.sin(t*.55)*1.6;};break;
  }
  case 'vinyl':{
   box(1.35,.2,1.05,0,.89,0,material('#bc9f8b',.8,0,'wood'));const record=floating(-.12,1.01,0);mesh(record,new T.CylinderGeometry(.44,.44,.025,40),material('#53686b'));mesh(record,new T.CylinderGeometry(.14,.14,.03,24),material('#deb6c2'));
   for(const r of [.24,.3,.37]){const groove=mesh(record,new T.TorusGeometry(r,.006,4,40),metal);groove.rotation.x=Math.PI/2;groove.position.y=.02;}mesh(record,new T.SphereGeometry(.025,8,6),glow,.08,.045,0);
   box(.035,.035,.58,.49,1.12,.06);sphere(.055,.49,1.12,-.24,metal);
   animate=(t,e,dt)=>{record.rotation.y+=dt*(.15+e*1.1);};break;
  }
  case 'shell':{
   const base=sphere(.62,0,.91,0,material('#edc6b4'));base.scale.set(1,.22,.8);
   const lid=floating(0,.98,-.44),top=mesh(lid,new T.SphereGeometry(1,24,12),material('#f1dacc'),0,0,.42);top.scale.set(.62,.1,.5);
   for(let i=0;i<9;i++){const a=(i-4)*.3,points=[];for(let j=0;j<14;j++){const u=j/13,r=.15+u*.8;points.push(new T.Vector3(Math.sin(a)*.62*r,.1*Math.sqrt(1-r*r)+.012,.42+Math.cos(a)*.5*r));}mesh(lid,new T.TubeGeometry(new T.CatmullRomCurve3(points),16,.012,5,false),material('#d8b5a6'));}
   sphere(.17,0,1.04,.05,glow);animate=(t,e)=>lid.rotation.x=-.08-e*.95;break;
  }
  case 'lighthouse':{
   mesh(g,new T.CylinderGeometry(.22,.38,1.1,24),stone,0,1.24);mesh(g,new T.CylinderGeometry(.4,.4,.09,24),metal,0,1.82);
   sphere(.15,0,2.08,0,glow);for(let i=0;i<6;i++){const a=i*Math.PI/3;box(.025,.46,.025,Math.cos(a)*.28,2.07,Math.sin(a)*.28);}
   mesh(g,new T.ConeGeometry(.43,.3,24),material('#93bdb9'),0,2.45);
   const beacon=floating(0,2.08,0);const beam=mesh(beacon,new T.ConeGeometry(.2,1.3,20,1,true),new T.MeshBasicMaterial({color:'#f6dfac',transparent:true,opacity:.1,depthWrite:false,side:T.DoubleSide}),0,0,.85);beam.rotation.x=-Math.PI/2;
   animate=(t,e)=>{beacon.rotation.y=t*.3+e*Math.sin(t*.4)*2;(beam.material as T.MeshBasicMaterial).opacity=.06+e*.18;};break;
  }
  default:return undefined;
 }
 return {parts,animate:(time:number,energy:number)=>{const dt=Math.min(.1,Math.max(0,time-lastTime));lastTime=time;animate(time,energy,dt);}};
}
