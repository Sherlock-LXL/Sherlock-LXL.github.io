import * as T from 'three';
import {material,mesh,softBox} from './architecture';
import {sign} from './scenery';
import {kit,roof,roundRoof,hallFrame,podium,column,beam,lantern,paintedTree} from './vernacular';
const box=(g:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material=kit.stone())=>mesh(g,softBox(w,h,d),m,x,y,z);
function link(g:T.Object3D,a:number[],b:number[],radius:number,m:T.Material){const start=new T.Vector3(...a as [number,number,number]),end=new T.Vector3(...b as [number,number,number]),v=end.clone().sub(start);const o=mesh(g,new T.CylinderGeometry(radius,radius,v.length(),10),m);o.position.copy(start).add(end).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
const GROUND=.31;
/** A hall: podium, timber frame, plaster and lattice infill, double-eave roof. */
function hall(g:T.Object3D,width:number,depth:number,x:number,z:number,{height=3.2,tiles=kit.tile(),eaves=2,podiumHeight=.5}={}){
  const h=new T.Group();h.position.set(x,GROUND,z);g.add(h);
  podium(h,width+.9,depth+.9,podiumHeight);
  const {xs}=hallFrame(h,width,depth,height,{columnsX:Math.max(3,Math.round(width/2.2)+1),columnsZ:2,radius:.18,y:podiumHeight});
  for(let i=0;i<xs.length-1;i++){const cx=(xs[i]+xs[i+1])/2,span=xs[i+1]-xs[i]-.36;
    box(h,span,height*.62,.1,cx,podiumHeight+height*.31,-depth/2,kit.plaster());
    box(h,span,height*.62,.1,cx,podiumHeight+height*.31,depth/2-.06,i===Math.floor((xs.length-1)/2)?kit.lacquer():kit.lattice());
    box(h,span,height*.3,.08,cx,podiumHeight+height*.8,depth/2-.06,kit.lattice());}
  for(const s of [-1,1])box(h,.1,height,depth-.36,s*width/2,podiumHeight+height/2,0,kit.plaster());
  const top=podiumHeight+height+.4;
  if(eaves>1){roof(h,{width:width+.4,depth:depth+.4,height:.5,overhang:.8,lift:.3,y:top});box(h,width-.4,1,depth-.6,0,top+.9,0,kit.plaster());roof(h,{width:width*.82,depth:depth*.72,height:1.3,overhang:.7,lift:.4,y:top+1.35,material:tiles});}
  else roof(h,{width,depth,height:1.25,overhang:.8,lift:.35,y:top,material:tiles});
  return h;
}
function island(name:string,x:number,z:number,rx:number,rz:number,season:'pine'|'blossom'|'maple'){
 const root=new T.Group();root.name=name;root.position.set(x,-4.1,z);
 // An ochre cliff ring with a malachite top, rocks at the tide line: the same painted strata as the home islands.
 const cliff=mesh(root,new T.CylinderGeometry(1,1.12,3.4,64),material('#b48c5a',.95,0,'cliff'),0,-1.4);cliff.scale.set(rx+.4,1,rz+.4);
 const land=mesh(root,new T.CylinderGeometry(1,1.02,.68,80),material('#6f9a66',.95,0,'grass'),0,-.03);land.scale.set(rx,1,rz);
 for(let i=0;i<22;i++){const a=i*Math.PI*2/22+Math.sin(i)*.1;const rock=mesh(root,new T.DodecahedronGeometry(1,0),material(i%3?'#8d6f4d':'#5e6f66',.95,0,'stone'),Math.cos(a)*(rx+1.2),-2.9+(i%3)*.2,Math.sin(a)*(rz+1.2));rock.scale.set(1+(i%3)*.35,.7+(i%2)*.3,.9);rock.rotation.set(i,i*.7,0);}
 for(const side of [-1,1])for(let i=0;i<3;i++)paintedTree(root,side*(rx-3-i*.25),-rz+3+i*3,.95+i*.12,i%2?season:'pine',GROUND);
 const dockZ=rz+1.4;box(root,4,.28,3.8,0,-.52,dockZ,kit.timberLight());
 for(const x of [-1.75,1.75])for(const z of [dockZ-1.4,dockZ+1.4])mesh(root,new T.CylinderGeometry(.1,.14,1,10),kit.timber(),x,-.1,z);
 return root;
}
function approach(root:T.Group,width:number,end:number,title:string,color:string){
 box(root,width,.09,end,0,.355,end/2-1,kit.marble());
 for(const side of [-1,1])for(let i=0;i<3;i++)lantern(root,side*(width/2+.65),2+i*3,.8,.4);
 const label=sign(root,title,'未开放 · 敬请期待',color,6,.85);label.position.set(0,1.2,end-1.7);
 for(const x of [-2.6,2.6])box(root,.12,.8,.12,x,.68,end-1.7,kit.timber());
}
/** Quant exchange: a waterside counting hall behind a colonnade, a candlestick sculpture, an open round pavilion. */
export function exchangeIsland(){
 const root=island('future-quant-exchange',-116,55,21,16,'maple');
 hall(root,15,7.5,0,-3.4,{height:3.4,tiles:kit.tileGreen()});
 for(const side of [-1,1])hall(root,4.4,5.6,side*10.2,-4,{height:2.6,eaves:1});
 // The colonnade fronts the hall: a single row of lacquered columns under a long lean-to eave.
 for(let i=0;i<8;i++)column(root,-7+i*2,1.15,3,.16,kit.lacquer(),GROUND+.5);
 beam(root,15,0,GROUND+3.7,1.15);roof(root,{width:14.6,depth:.6,height:.35,overhang:.6,lift:.2,y:GROUND+3.85,z:1.15});
 // Candlestick chart: cinnabar (up) and malachite (down) bodies with bronze wicks, on a long stone plinth.
 const chart=new T.Group();chart.position.set(0,GROUND,4.6);root.add(chart);podium(chart,9.2,1.4,.5);
 for(let i=0;i<7;i++){const x=(i-3)*1.25,low=.85+(i%3)*.32,h=.9+(i*3%5)*.45;box(chart,.62,h,.62,x,low+h/2,0,i%3?kit.malachite():kit.lacquer());link(chart,[x,low-.32,0],[x,low+h+.4,0],.04,kit.bronze());}
 const ticker=sign(root,'量化研究 · 数据中庭','','#e3c385',7,.75);ticker.position.set(0,GROUND+2.7,1.62);
 const rotunda=new T.Group();rotunda.position.set(-11,GROUND,5.3);root.add(rotunda);podium(rotunda,4.8,4.8,.3);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;column(rotunda,Math.cos(a)*1.9,Math.sin(a)*1.9,2.6,.11,kit.lacquer(),.3);}
 roundRoof(rotunda,{radius:2.6,height:1.5,y:3.1,material:kit.tileGreen()});
 approach(root,4.6,13,'量化投资交易所岛','#e3c385');return root;
}
/** An automaton arm: bronze links and patina joints, a three-finger gripper. */
function roboticArm(root:T.Group,x:number,z:number,mirror=1){
 const a=new T.Group();a.position.set(x,.43,z);a.scale.x=mirror;root.add(a);
 mesh(a,new T.CylinderGeometry(.9,1.2,.55,24),kit.stone(),0,.275);const points=[[0,.6,0],[0,2,0],[1.3,3.8,0],[2.8,3.4,0]];
 for(let i=0;i<points.length-1;i++){link(a,points[i],points[i+1],i===0?.27:.21,kit.bronze());mesh(a,new T.SphereGeometry(.34,18,12),kit.patina(),...points[i+1] as [number,number,number]);}
 link(a,[2.8,3.4,0],[2.8,2.9,0],.12,kit.bronze());for(const side of [-1,1]){link(a,[2.8,2.9,0],[2.8+side*.25,2.7,0],.065,kit.bronze());link(a,[2.8+side*.25,2.7,0],[2.8+side*.25,2.4,0],.065,kit.bronze());}return a;
}
/** Robot island: two timber workshops, an assembly line and a bronze automaton between them. */
export function robotDistrict(){
 const root=island('future-robot-island',155,76,20,16,'blossom');
 for(const side of [-1,1])hall(root,6,7,side*8.5,-4,{height:3.6,eaves:1,tiles:kit.tile()});
 const robot=new T.Group();robot.position.set(0,.35,-4);root.add(robot);mesh(robot,new T.CylinderGeometry(3,3.2,.4,32),kit.stone(),0,.2);
 const bronze=kit.bronze(),patina=kit.patina(),lacquer=kit.lacquer();
 for(const side of [-1,1]){box(robot,1.1,.5,1.7,side*.85,.67,.3,bronze);link(robot,[side*.85,.9,0],[side*.85,2.4,0],.34,patina);mesh(robot,new T.SphereGeometry(.43,18,12),bronze,side*.85,1.75,0);}
 box(robot,2.8,2.1,1.65,0,3.25,0,lacquer);box(robot,3.45,2.2,2.1,0,5.5,0,bronze);box(robot,2.8,1.15,.13,0,5.65,1.09,kit.ink());
 const light=kit.lamp('#f3c77a');for(const side of [-1,1]){mesh(robot,new T.SphereGeometry(.18,16,10),light,side*.65,5.7,1.2);mesh(robot,new T.SphereGeometry(.38,18,12),patina,side*1.7,3.9,0);link(robot,[side*1.7,3.9,0],[side*2.15,2.7,.25],.26,bronze);mesh(robot,new T.SphereGeometry(.33,18,12),patina,side*2.15,2.5,.25);}
 roof(robot,{width:2.4,depth:1.4,height:.5,overhang:.35,lift:.18,y:6.62,material:kit.tileGold()});
 roboticArm(root,-8,5);roboticArm(root,8,5,-1);box(root,7,.35,1.9,0,.85,5.5,kit.timber());
 for(let i=0;i<11;i++){const roller=mesh(root,new T.CylinderGeometry(.13,.13,1.7,10),kit.stoneDark(),-3+i*.6,1.07,5.5);roller.rotation.x=Math.PI/2;}
 for(const x of [-1.5,1.5])box(root,.7,.7,.7,x,1.52,5.5,kit.lacquer());
 approach(root,4.2,13.5,'机器人岛','#acd9c5');return root;
}
/** AI institute: a round hall on a triple terrace under three blue roofs, two research wings and a bronze neural crown. */
export function researchInstitute(){
 const root=island('future-ai-institute',100,-90,23,18,'pine');
 const centre=new T.Group();centre.position.set(0,GROUND,-3);root.add(centre);
 let y=0;for(const [r,h] of [[8,.45],[7,.45],[6,.45]]){mesh(centre,new T.CylinderGeometry(r,r+.1,h,48),kit.marble(),0,y+h/2);y+=h;}
 for(let i=0;i<16;i++){const a=i*Math.PI/8;column(centre,Math.cos(a)*4.6,Math.sin(a)*4.6,3.2,.2,kit.lacquer(),y);}
 mesh(centre,new T.CylinderGeometry(4.3,4.3,3.2,32,1,true),kit.lattice(),0,y+1.6);
 roundRoof(centre,{radius:5.6,height:1.2,y:y+3.35,finial:false});
 mesh(centre,new T.CylinderGeometry(3.7,3.7,1.4,32),kit.beam(),0,y+5);
 roundRoof(centre,{radius:4.6,height:1.1,y:y+5.7,finial:false});
 mesh(centre,new T.CylinderGeometry(2.9,2.9,1.2,32),kit.beam(),0,y+7.2);
 roundRoof(centre,{radius:3.6,height:1.7,y:y+7.8});
 // The neural crown: six gilded nodes linked in a ring and across, raised above the finial on a bronze mast.
 const orbit=new T.Group();orbit.position.set(0,y+12.4,0);orbit.scale.setScalar(1.25);centre.add(orbit);const light=kit.lamp('#f6d48c');
 const nodes=Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3)*2.1,Math.sin(i*Math.PI/3)*1.4,Math.sin(i*Math.PI*2/3)*.8]);
 for(let i=0;i<6;i++){mesh(orbit,new T.SphereGeometry(.24,16,10),light,...nodes[i] as [number,number,number]);link(orbit,nodes[i],nodes[(i+1)%6],.025,kit.gold());link(orbit,nodes[i],nodes[(i+2)%6],.02,kit.bronze());}
 link(centre,[0,y+10,0],[0,y+12.4,0],.08,kit.bronze());
 for(const side of [-1,1])hall(root,6.2,6,side*13,-2,{height:3,eaves:1,tiles:kit.tileBlue()});
 const entry=sign(root,'AI 研究院','模型 · 科学 · 下一段探索','#cbdde9',7.2,.9);entry.position.set(0,GROUND+5.2,5.3);
 for(const x of [-3.9,3.9])column(root,x,5.3,5.2,.18,kit.lacquer(),GROUND);
 // Two bronze sundials flank the approach.
 for(const x of [-6,6]){mesh(root,new T.CylinderGeometry(1.2,1.35,.8,8),kit.stone(),x,GROUND+.4,8);const dial=mesh(root,new T.CylinderGeometry(1,1,.1,32),kit.bronze(),x,GROUND+1.25,8);dial.rotation.x=.7;link(root,[x,GROUND+1,8],[x,GROUND+1.9,8.6],.04,kit.gold());}
 approach(root,4.6,15,'AI 研究院','#cbdde9');return root;
}
