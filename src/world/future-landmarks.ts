import * as T from 'three';
import {material,mesh,softBox,tree} from './architecture';
import {sign} from './scenery';
const palette={stone:material('#ede5d5',.82,0,'stone'),mint:material('#9abeb7',.65,.1),glass:material('#789fa9',.25,.3,'metal'),metal:material('#99aaa9',.4,.35,'metal'),rose:material('#d8afbb'),lavender:material('#b9b8d0')};
const box=(g:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material=palette.stone)=>mesh(g,softBox(w,h,d),m,x,y,z);
function link(g:T.Object3D,a:number[],b:number[],radius:number,m:T.Material){const start=new T.Vector3(...a as [number,number,number]),end=new T.Vector3(...b as [number,number,number]),v=end.clone().sub(start);const o=mesh(g,new T.CylinderGeometry(radius,radius,v.length(),12),m);o.position.copy(start).add(end).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
function ring(g:T.Object3D,r:number,y:number,m:T.Material){const o=mesh(g,new T.TorusGeometry(r,.065,8,64),m,0,y);o.rotation.x=Math.PI/2;return o;}
function glow(color:string){const m=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.24});m.userData.nightGlow=true;return m;}
function island(name:string,x:number,z:number,rx:number,rz:number,tint:string){
 const root=new T.Group();root.name=name;root.position.set(x,-4.1,z);
 // The buildings share a flat supported terrace. Hills stay behind their footprints.
 const shore=mesh(root,new T.SphereGeometry(1,48,24),material('#e4d4b3',.9,0,'sand'),0,-.75,0);shore.scale.set(rx+1.2,1.15,rz+1.2);
 const land=mesh(root,new T.CylinderGeometry(1,1.04,.68,80),material(tint,.95,0,'grass'),0,-.03);land.scale.set(rx,1,rz);
 const quay=mesh(root,new T.CylinderGeometry(1,1.05,.34,80),palette.stone,0,-.42);quay.scale.set(rx*.96,1,rz*.96);
 for(let i=0;i<15;i++){const a=i*Math.PI*2/15;const rock=mesh(root,new T.SphereGeometry(1,16,12),palette.stone,Math.cos(a)*(rx+.5),-.6,Math.sin(a)*(rz+.5));rock.scale.set(.8+(i%3)*.28,.4,.65);}
 for(const side of [-1,1])for(let i=0;i<3;i++)tree(root,side*(rx-3-i*.25),-rz+3+i*3,.85+i*.12,i%2?'#aac7b0':'#91b8a8');
 const planted=material('#8fb399',.94,0,'foliage');
 for(const side of [-1,1])for(let i=0;i<5;i++){const shrub=mesh(root,new T.SphereGeometry(1,16,12),planted,side*(rx-4.5),.65,-3+i*2.7);shrub.scale.set(.6,.38,.52);}
 for(const side of [-1,1])for(let i=0;i<4;i++){const y=.3+i*.035;box(root,.9,.07,2.2,side*3,y,rz-3+i*.55,palette.stone);}
 const dockZ=rz+1.4;box(root,4,.28,3.8,0,-.52,dockZ,material('#c6b092',.8,0,'wood'));
 for(const x of [-1.75,1.75])for(const z of [dockZ-1.4,dockZ+1.4]){mesh(root,new T.CylinderGeometry(.1,.14,1,12),palette.metal,x,-.1,z);}
 return root;
}
function approach(root:T.Group,width:number,end:number,title:string,color:string){
 box(root,width,.09,end,0,.355,end/2-1,palette.stone);
 for(const side of [-1,1])for(let i=0;i<4;i++){const x=side*(width/2+.65),z=2+i*2;box(root,.11,.65,.11,x,.65,z,palette.metal);mesh(root,new T.SphereGeometry(.12,12,8),glow('#f5dfaf'),x,1.03,z);}
 const label=sign(root,title,'未开放 · 敬请期待',color,6,.85);label.position.set(0,1.2,end-1.7);
 for(const x of [-2.6,2.6])box(root,.09,.8,.09,x,.68,end-1.7,palette.metal);
}
function windows(root:T.Group,x:number,z:number,w:number,h:number,y:number){
 box(root,w,h,.1,x,y,z,palette.glass);
 for(let i=1;i<Math.ceil(w);i++)box(root,.045,h,.06,x-w/2+i,y,z+.07,palette.stone);
 for(let i=1;i<Math.ceil(h);i++)box(root,w,.045,.06,x,y-h/2+i,z+.07,palette.stone);
}
export function exchangeIsland(){
 const root=island('future-quant-exchange',-116,55,21,16,'#b8cabc'),p=palette;
 box(root,18,.42,10,0,.56,-3);box(root,15.6,7,7.8,0,4.1,-3,p.glass);
 for(const x of [-7,-3.5,0,3.5,7])box(root,.3,7.5,.38,x,4.2,1.15,p.stone);
 for(const y of [1.15,3.5,5.8,7.9])box(root,16.2,.14,8.3,0,y,-3,p.stone);
 box(root,18,.5,10,0,8.35,-3);box(root,17,.16,9,0,8.7,-3,p.mint);
 for(const side of [-1,1]){box(root,3.5,4.7,6.2,side*9.5,2.75,-4,p.mint);windows(root,side*9.5,-.85,2.8,3.5,2.9);box(root,4.1,.18,6.7,side*9.5,5.2,-4);}
 // A large candlestick frieze and open data rotunda read clearly from the mainland.
 const chart=new T.Group();chart.position.set(0,9.05,-3);root.add(chart);
 for(let i=0;i<7;i++){const x=(i-3)*1.5,low=.35+(i%3)*.32,h=1+(i*3%5)*.52;box(chart,.7,h,.6,x,low+h/2,0,i%3?p.mint:p.rose);link(chart,[x,low-.3,0],[x,low+h+.45,0],.035,p.metal);}
 box(root,3,.18,2.2,0,.89,1.9);windows(root,0,1.23,2.5,2.8,2.35);
 const rotunda=new T.Group();rotunda.position.set(-11,.32,5.3);root.add(rotunda);mesh(rotunda,new T.CylinderGeometry(2.6,2.7,.24,40),p.stone,0,.12);ring(rotunda,2.5,3.4,p.mint);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;link(rotunda,[Math.cos(a)*2.4,.2,Math.sin(a)*2.4],[Math.cos(a)*2.4,3.4,Math.sin(a)*2.4],.075,p.metal);const h=.55+(i%4)*.4;box(rotunda,.26,h,.26,Math.cos(a)*1.25,.3+h/2,Math.sin(a)*1.25,i%2?p.mint:p.rose);}
 const ticker=sign(root,'量化研究 · 数据中庭','', '#719f9b',7,.75);ticker.position.set(0,6.8,1.3);
 approach(root,4.6,13,'量化投资交易所岛','#729b94');return root;
}
function roboticArm(root:T.Group,x:number,z:number,mirror=1){
 const a=new T.Group();a.position.set(x,.43,z);a.scale.x=mirror;root.add(a);
 const p=palette;mesh(a,new T.CylinderGeometry(.9,1.2,.55,32),p.metal,0,.275);const points=[[0,.6,0],[0,2,0],[1.3,3.8,0],[2.8,3.4,0]];
 for(let i=0;i<points.length-1;i++){link(a,points[i],points[i+1],i===0?.27:.21,p.stone);mesh(a,new T.SphereGeometry(.34,24,16),p.lavender,...points[i+1] as [number,number,number]);}
 link(a,[2.8,3.4,0],[2.8,2.9,0],.12,p.metal);for(const side of [-1,1]){link(a,[2.8,2.9,0],[2.8+side*.25,2.7,0],.065,p.metal);link(a,[2.8+side*.25,2.7,0],[2.8+side*.25,2.4,0],.065,p.metal);}return a;
}
export function robotDistrict(){
 const root=island('future-robot-island',155,76,20,16,'#bcc9c2'),p=palette;
 for(const side of [-1,1]){
  const x=side*8.5;box(root,6.4,4.8,8,x,2.8,-4,p.lavender);box(root,6.9,.35,8.5,x,5.4,-4);
  windows(root,x,.06,5.4,3.5,2.8);for(const z of [-7,-4,-1])box(root,.16,4.9,.2,x+side*3.25,2.8,z,p.stone);
  for(let i=0;i<4;i++)box(root,1,.16,2.1,x-2+i*1.3,5.65,-3,p.glass).rotation.x=.15;
 }
 const robot=new T.Group();robot.position.set(0,.35,-4);root.add(robot);mesh(robot,new T.CylinderGeometry(3,3.2,.4,48),p.stone,0,.2);
 for(const side of [-1,1]){box(robot,1.1,.5,1.7,side*.85,.67,.3,p.metal);link(robot,[side*.85,.9,0],[side*.85,2.4,0],.34,p.lavender);mesh(robot,new T.SphereGeometry(.43,24,16),p.metal,side*.85,1.75,0);}
 box(robot,2.8,2.1,1.65,0,3.25,0,p.stone);box(robot,3.45,2.2,2.1,0,5.5,0,p.lavender);box(robot,2.8,1.15,.13,0,5.65,1.09,p.glass);
 const light=glow('#b6e5d9');for(const side of [-1,1]){mesh(robot,new T.SphereGeometry(.18,20,12),light,side*.65,5.7,1.2);mesh(robot,new T.SphereGeometry(.38,24,16),p.metal,side*1.7,3.9,0);link(robot,[side*1.7,3.9,0],[side*2.15,2.7,.25],.26,p.stone);mesh(robot,new T.SphereGeometry(.33,24,16),p.lavender,side*2.15,2.5,.25);}
 box(robot,.9,.07,.08,0,5.29,1.2,light);link(robot,[0,6.6,0],[0,7.3,0],.065,p.metal);mesh(robot,new T.SphereGeometry(.2,20,12),light,0,7.4);
 roboticArm(root,-8,5);roboticArm(root,8,5,-1);box(root,7,.35,1.9,0,.85,5.5,p.metal);
 for(let i=0;i<11;i++){const roller=mesh(root,new T.CylinderGeometry(.13,.13,1.7,12),p.stone,-3+i*.6,1.07,5.5);roller.rotation.x=Math.PI/2;}
 for(const x of [-1.5,1.5])box(root,.7,.7,.7,x,1.52,5.5,p.mint);
 approach(root,4.2,13.5,'机器人岛','#9293b5');return root;
}
export function researchInstitute(){
 const root=island('future-ai-institute',100,-90,23,18,'#b7cdbf'),p=palette;
 mesh(root,new T.CylinderGeometry(7.5,8,.6,64),p.stone,0,.64,-3);mesh(root,new T.CylinderGeometry(6.8,6.8,4.6,64),p.glass,0,3.15,-3);
 const dome=mesh(root,new T.SphereGeometry(6.9,48,24,0,Math.PI*2,0,Math.PI/2),p.mint,0,5.5,-3);dome.scale.y=.65;
 for(let i=0;i<16;i++){const a=i*Math.PI/8;box(root,.13,4.7,.13,Math.cos(a)*6.9,3.2,-3+Math.sin(a)*6.9,p.stone);}
 const orbit=new T.Group();orbit.position.set(0,12,-3);orbit.scale.setScalar(1.25);root.add(orbit);const light=glow('#d2dbf3');
 const nodes=Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3)*2.1,Math.sin(i*Math.PI/3)*1.4,Math.sin(i*Math.PI*2/3)*.8]);
 for(let i=0;i<6;i++){mesh(orbit,new T.SphereGeometry(.24,20,12),light,...nodes[i] as [number,number,number]);link(orbit,nodes[i],nodes[(i+1)%6],.025,p.metal);link(orbit,nodes[i],nodes[(i+2)%6],.02,p.metal);}link(root,[0,9.2,-3],[0,12,-3],.08,p.metal);
 for(const side of [-1,1]){box(root,6.2,3.8,6,side*12,2.35,-2,p.mint);box(root,6.7,.25,6.5,side*12,4.35,-2);windows(root,side*12,1.05,5.2,2.5,2.4);box(root,5,.16,2.7,side*12,4.65,-2,p.glass).rotation.x=.15;box(root,5,.3,2,side*8.3,1.1,-2);}
 const entry=sign(root,'AI 研究院','模型 · 科学 · 下一段探索','#7faca0',7.2,.9);entry.position.set(0,4,3.96);
 box(root,3,.22,2.1,0,1,4.5);windows(root,0,3.95,2.6,2.5,2.3);
 for(const x of [-6,6]){mesh(root,new T.CylinderGeometry(1.6,1.7,.3,32),p.stone,x,.5,8);const lens=mesh(root,new T.SphereGeometry(1,24,16),p.glass,x,1.4,8);lens.scale.set(1.2,.8,1.2);}
 approach(root,4.6,15,'AI 研究院','#83a89b');return root;
}
