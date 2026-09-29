import * as T from 'three';
import {material,mesh,softBox} from './architecture';
import {sign} from './scenery';

/** Decorative research pavilions. Keep the existing five footprints and the front aisle. */
export function researchCamp(){
 const root=new T.Group();root.name='research-camp';
 const shell=material('#dae4e5',.85,.02,'stone'),metal=material('#89aab4',.45,.24),snow=material('#f3f8fb',.95,0,'snow'),glass=material('#759ba8',.3,.22);
 const box=(parent:T.Object3D,w:number,h:number,d:number,x=0,y=0,z=0,mat:T.Material=shell)=>mesh(parent,softBox(w,h,d),mat,x,y,z);
 const rod=(parent:T.Object3D,a:number[],b:number[],radius=.045,mat:T.Material=metal)=>{const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);const m=mesh(parent,new T.CylinderGeometry(radius,radius,delta.length(),12),mat,...start.add(end).multiplyScalar(.5).toArray() as [number,number,number]);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;};
 const titles=['天文','力学','机器人','计算机','AI'],colors=['#aab9d6','#d3bc9b','#a8c6b6','#a3c7d2','#c5b4d8'];
 for(let i=0;i<5;i++){
  const room=new T.Group();room.name=`research-lab-${i}`;room.position.set(-9+i*4.5,0,-12);root.add(room);
  const accent=material(colors[i],.45,.15);
  box(room,2.2,.16,1.45,0,.08);box(room,2.1,3.64,1.2,0,1.98);
  box(room,2.3,.14,1.45,0,3.87);box(room,2.25,.07,1.4,0,3.975,0,snow);
  box(room,1.64,1.75,.045,0,1.65,.63,glass);
  for(const x of [-.88,.88])box(room,.065,2.05,.09,x,1.65,.64,accent);
  box(room,1.8,.08,.15,0,.72,.67);box(room,1.8,.08,.15,0,2.62,.67);
  const label=sign(room,titles[i],`0${i+1}`,colors[i],1.8,.54);label.position.set(0,3.18,.69);
  const apparatus=new T.Group();apparatus.name=`research-apparatus-${i}`;apparatus.position.y=4.01;room.add(apparatus);
  mesh(apparatus,new T.CylinderGeometry(.7,.78,.1,32),metal,0,.05);
  if(i===0){
   const hub=new T.Vector3(0,.69,0);
   for(let n=0;n<3;n++){const a=n*Math.PI*2/3;rod(apparatus,[Math.cos(a)*.55,.1,Math.sin(a)*.48],hub.toArray(),.045);}
   mesh(apparatus,new T.SphereGeometry(.115,16,12),accent,...hub.toArray() as [number,number,number]);
   const tube=new T.Group();tube.position.copy(hub).add(new T.Vector3(0,.18,0));tube.rotation.x=.88;apparatus.add(tube);
   rod(apparatus,[0,.69,0],[0,.89,0],.09);
   mesh(tube,new T.CylinderGeometry(.22,.19,1.05,32),shell);
   for(const y of [-.4,.4])mesh(tube,new T.CylinderGeometry(.238,.238,.09,32),accent,0,y);
   const lens=mesh(tube,new T.CircleGeometry(.195,32),glass,0,.532);lens.rotation.x=-Math.PI/2;
   mesh(tube,new T.CylinderGeometry(.065,.065,.2,16),metal,0,-.6);
  }else if(i===1){
   for(const z of [-.28,.28]){rod(apparatus,[-.83,.2,z],[.83,.2,z]);rod(apparatus,[-.83,.2,z],[0,.95,z]);rod(apparatus,[0,.95,z],[.83,.2,z]);rod(apparatus,[0,.95,z],[0,.2,z]);}
   for(const x of [-.83,0,.83])rod(apparatus,[x,.2,-.28],[x,.2,.28]);
   box(apparatus,1.85,.12,.75,0,.15,0,accent);
   rod(apparatus,[0,.95,-.28],[0,.95,.28]);
  }else if(i===2){
   mesh(apparatus,new T.CylinderGeometry(.23,.33,.3,24),accent,0,.25);
   const joints=[[0,.4,0],[-.35,1.05,0],[.36,1.36,.02],[.59,.95,.05]];
   joints.forEach((p,n)=>{mesh(apparatus,new T.SphereGeometry(.125,16,12),metal,...p as [number,number,number]);if(n)rod(apparatus,joints[n-1],p,.085,accent);});
   for(const x of [.45,.73]){rod(apparatus,[.59,.95,.05],[x,.77,.05],.035);rod(apparatus,[x,.77,.05],[x,.65,.05],.035);}
  }else if(i===3){
   box(apparatus,.72,.1,.5,0,.15,0,accent);box(apparatus,.12,.45,.12,0,.4,0,metal);
   box(apparatus,1.35,.9,.13,0,.94,0,metal);box(apparatus,1.2,.74,.025,0,.94,.085,glass);
   for(let row=0;row<4;row++)box(apparatus,.35+row*.13,.025,.008,-.2+row*.02,1.16-row*.13,.105,shell);
   box(apparatus,1.15,.06,.34,0,.2,.32,metal);
  }else{
   // Successive feature-map planes and a compact fully-connected output.
   for(let layer=0;layer<3;layer++){
    const x=-.5+layer*.4,size=.64-layer*.1;
    rod(apparatus,[x,.1,0],[x,.6,0],.035);
    for(let map=0;map<3;map++)box(apparatus,.055,size,size,x+map*.07,.85,0,accent);
   }
   for(let n=0;n<3;n++){const y=.55+n*.25;mesh(apparatus,new T.SphereGeometry(.07,12,8),accent,.8,y,0);rod(apparatus,[.46,.85,0],[.8,y,0],.018);}
  }
 }
 // One shallow rear arch: every endpoint meets a full-height pier.
 const curve=new T.CatmullRomCurve3([[-10.5,4.25,-12.8],[-6,5.1,-12.8],[0,5.5,-12.8],[6,5.1,-12.8],[10.5,4.25,-12.8]].map(p=>new T.Vector3(...p)));
 mesh(root,new T.TubeGeometry(curve,64,.09,10,false),metal).name='camp-supported-arch';
 for(const x of [-10.5,10.5]){box(root,.5,.18,.5,x,.09,-12.8);box(root,.22,4.18,.22,x,2.18,-12.8,metal);}
 return root;
}
