import * as T from 'three';
import {material,mesh} from './architecture';
export {animalModel} from './animal-models';

const clay=(color:string)=>material(color,.92,0,'plaster');
const cream=clay('#fff3dd'),ink=clay('#303a37'),jade=clay('#82ad98'),wood=clay('#90775b');
const sphere=new T.SphereGeometry(1,14,10);
function oval(g:T.Object3D,m:T.Material,x:number,y:number,z:number,sx:number,sy:number,sz:number){
  const o=mesh(g,sphere,m,x,y,z);o.scale.set(sx,sy,sz);return o;
}
function rod(g:T.Object3D,m:T.Material,a:number[],b:number[],r:number,tip=r){
  const from=new T.Vector3(...a),to=new T.Vector3(...b),o=mesh(g,new T.CylinderGeometry(tip,r,from.distanceTo(to),8),m);
  o.position.copy(from).add(to).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),to.sub(from).normalize());return o;
}
function curl(g:T.Object3D,m:T.Material,points:number[][],r:number){
  return mesh(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),20,r,6,false),m);
}
function eyes(g:T.Object3D,x:number,y:number,z:number,r=.038){
  for(const s of [-1,1]){
    oval(g,ink,x*s,y,z,r,r*1.12,r*.65);
    oval(g,cream,x*s-r*.2,y+r*.3,z+r*.56,r*.26,r*.26,r*.2);
  }
}

/** Portable objects use the same ceramic, bamboo and carved-stone language as the islands. */
export function seasonalModel(kind:string){
  const root=new T.Group();root.name=`portable-${kind}`;const coral=clay('#d69988'),blue=clay('#a4cccf'),gold=clay('#d7b978');
  const pot=(m:T.Material,r=.18,h=.35)=>{mesh(root,new T.CylinderGeometry(r,r*.68,h,16),m,0,h/2);mesh(root,new T.TorusGeometry(r,.022,6,24),m,0,h).rotation.x=Math.PI/2;};
  const basket=(tea:boolean)=>{
    pot(wood,.25,.24);
    for(let i=0;i<5;i++)mesh(root,new T.TorusGeometry(.19+i*.012,.013,5,24),gold,0,.035+i*.042).rotation.x=Math.PI/2;
    curl(root,wood,[[-.23,.2,0],[-.2,.4,0],[0,.49,0],[.2,.4,0],[.23,.2,0]],.022);
    for(let i=0;i<7;i++){const a=i*2.4,r=.13*Math.sqrt(i/7);oval(root,tea?jade:gold,Math.sin(a)*r,.27,Math.cos(a)*r,.065,tea?.045:.07,.049);}
  };
  if(kind==='peach-pot'){
    pot(blue,.14,.3);curl(root,wood,[[0,.22,0],[-.06,.48,0],[.05,.69,0]],.012);
    for(let i=0;i<5;i++){const x=Math.sin(i*3)*.12,y=.41+i*.056;rod(root,wood,[0,y-.02,0],[x,y,.01],.008);
      for(let j=0;j<5;j++)oval(root,coral,x+Math.cos(j*1.257)*.028,y+Math.sin(j*1.257)*.028,.014,.028,.025,.012);}
  }else if(kind==='pinwheel'){
    pot(cream,.12,.12);rod(root,wood,[0,.08,0],[0,.69,0],.016);
    const rotor=new T.Group();rotor.name='pinwheel-rotor';rotor.position.set(0,.62,.02);root.add(rotor);
    for(let i=0;i<4;i++){const petal=mesh(rotor,new T.ConeGeometry(.075,.23,3),i%2?coral:jade);petal.position.set(Math.sin(i*Math.PI/2)*.1,Math.cos(i*Math.PI/2)*.1,0);petal.rotation.z=-i*Math.PI/2;}
    oval(rotor,gold,0,0,.05,.028,.028,.025);
  }else if(kind.endsWith('basket'))basket(kind==='tea-basket');
  else if(kind==='inkstone'){
    const stone=clay('#688b85');oval(root,stone,0,.065,0,.27,.065,.19);oval(root,ink,0,.112,.025,.16,.015,.1);
    rod(root,wood,[-.2,.14,-.08],[.17,.14,-.08],.015);rod(root,ink,[.17,.14,-.08],[.23,.13,-.08],.014,.002);
  }else if(kind==='conch'){
    for(let i=0;i<7;i++){const a=i*.7,r=.13*(1-i/9);oval(root,i%2?cream:coral,Math.cos(a)*r,.12+i*.026,Math.sin(a)*r,.12-i*.011,.08-i*.006,.1-i*.009);}
    oval(root,coral,.17,.095,.04,.1,.07,.075);
  }else if(kind==='watering-can'){
    pot(jade,.17,.28);curl(root,wood,[[-.13,.23,0],[-.29,.34,0],[-.29,.07,0],[-.13,.08,0]],.023);
    rod(root,jade,[.12,.08,0],[.29,.3,0],.039,.055);oval(root,gold,.3,.315,0,.066,.025,.063);
  }else if(kind.includes('lantern')){
    const warm=new T.MeshStandardMaterial({color:kind==='sea-lantern'?'#d6eddf':'#f3cf9c',emissive:'#d6a575',emissiveIntensity:.18,roughness:.85});
    if(kind==='maple-lantern')oval(root,warm,0,.27,0,.22,.24,.21);else mesh(root,new T.CylinderGeometry(.17,.17,.36,8),warm,0,.24);
    for(const y of [.065,.45])mesh(root,new T.CylinderGeometry(.18,.18,.035,8),wood,0,y);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;rod(root,wood,[Math.sin(a)*.175,.08,Math.cos(a)*.175],[Math.sin(a)*.175,.44,Math.cos(a)*.175],.012);}
    curl(root,wood,[[-.13,.46,0],[-.12,.59,0],[0,.62,0],[.12,.59,0],[.13,.46,0]],.017);
  }else if(kind==='shell-bowl'){
    oval(root,blue,0,.06,0,.26,.06,.2);
    for(let i=0;i<5;i++)oval(root,i%2?cream:coral,Math.sin(i*2.4)*.13,.13,Math.cos(i*2.4)*.12,.058,.043,.07);
  }else if(kind==='pumpkin'){
    for(let i=0;i<9;i++){const a=i*Math.PI*2/9;oval(root,clay(i%2?'#d8a064':'#e2af73'),Math.sin(a)*.13,.2,Math.cos(a)*.13,.145,.19,.145);}
    curl(root,wood,[[0,.32,0],[0,.42,0],[.055,.45,.01]],.029);oval(root,jade,.09,.38,0,.095,.014,.042);
  }else if(kind==='scroll-box'){
    mesh(root,new T.BoxGeometry(.54,.15,.3),wood,0,.075);mesh(root,new T.BoxGeometry(.56,.04,.32),jade,0,.17);
    for(const z of [-.08,.08]){const scroll=mesh(root,new T.CylinderGeometry(.046,.046,.43,10),cream,0,.226,z);scroll.rotation.z=Math.PI/2;}
  }else if(kind==='snow-bunny'){
    oval(root,cream,0,.17,0,.22,.17,.24);oval(root,cream,0,.26,.14,.14,.12,.13);
    for(const s of [-1,1])oval(root,jade,s*.066,.405,.09,.035,.12,.025);eyes(root,.067,.275,.249,.017);
  }else if(kind==='snow-globe'){
    mesh(root,new T.CylinderGeometry(.22,.24,.1,16),wood,0,.05);
    const glass=new T.MeshStandardMaterial({color:'#b9dfe3',transparent:true,opacity:.22,roughness:.2,depthWrite:false});
    oval(root,glass,0,.31,0,.23,.23,.23);oval(root,cream,0,.13,0,.19,.045,.17);
    mesh(root,new T.ConeGeometry(.1,.27,7),jade,0,.27);oval(root,cream,.1,.16,.05,.04,.04,.04);
  }else if(kind==='ice-crystal'){
    for(let i=0;i<3;i++){const crystal=mesh(root,new T.ConeGeometry(.105,.5-i*.08,5),i%2?blue:jade,(i-1)*.12,.25-i*.04,0);crystal.rotation.z=(i-1)*-.18;}
    oval(root,cream,0,.035,0,.24,.035,.16);
  }else{
    pot(coral,.125,.4);mesh(root,new T.CylinderGeometry(.13,.13,.09,16),cream,0,.45);
    curl(root,wood,[[-.1,.32,0],[-.2,.31,0],[-.2,.13,0],[-.1,.13,0]],.023);
  }
  return root;
}
