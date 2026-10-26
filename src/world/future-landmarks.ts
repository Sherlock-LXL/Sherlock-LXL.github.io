import * as T from 'three';
import {material,mesh,softBox} from './architecture';
import {sign,type Obstacle} from './scenery';
import {distantIslands,distantGround} from '../../shared/distant-islands.mjs';
import {kit,roof,roundRoof,hallFrame,podium,column,beam,lantern,paintedTree,paifang} from './vernacular';
const box=(g:T.Object3D,w:number,h:number,d:number,x:number,y:number,z:number,m:T.Material=kit.stone())=>mesh(g,softBox(w,h,d),m,x,y,z);
function link(g:T.Object3D,a:number[],b:number[],radius:number,m:T.Material){const start=new T.Vector3(...a as [number,number,number]),end=new T.Vector3(...b as [number,number,number]),v=end.clone().sub(start);const o=mesh(g,new T.CylinderGeometry(radius,radius,v.length(),10),m);o.position.copy(start).add(end).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
const GROUND=.31;
/** A hall: podium, timber frame, plaster and lattice infill, double-eave roof. */
function hall(g:T.Object3D,width:number,depth:number,x:number,z:number,{height=3.2,tiles=kit.tile(),eaves=2,podiumHeight=.5}={}){
  const h=new T.Group();h.name='horizon-hall';h.position.set(x,GROUND,z);g.add(h);
  podium(h,width+.9,depth+.9,podiumHeight);
  const {xs}=hallFrame(h,width,depth,height,{columnsX:Math.max(3,Math.round(width/2.2)+1),columnsZ:2,radius:.18,y:podiumHeight});
  for(let i=0;i<xs.length-1;i++){const cx=(xs[i]+xs[i+1])/2,span=xs[i+1]-xs[i]-.36;
    box(h,span,height*.62,.1,cx,podiumHeight+height*.31,-depth/2,kit.plaster());
    box(h,span,height*.62,.1,cx,podiumHeight+height*.31,depth/2-.06,i===Math.floor((xs.length-1)/2)?kit.lacquer():kit.lattice());
    box(h,span,height*.3,.08,cx,podiumHeight+height*.8,depth/2-.06,kit.lattice());}
  for(const s of [-1,1])box(h,.1,height,depth-.36,s*width/2,podiumHeight+height/2,0,kit.plaster());
  const top=podiumHeight+height+.4;
  if(eaves>1){
    roof(h,{width:width+.4,depth:depth+.4,height:.5,overhang:.8,lift:.3,y:top,material:tiles});
    // The clerestory emerges through the lower tiles and meets the upper eave.
    box(h,width*.74,1.3,depth*.64,0,top+.73,0,kit.lattice()).name='horizon-clerestory';
    box(h,width*.76,.12,depth*.66,0,top+1.32,0,kit.beam());
    roof(h,{width:width*.82,depth:depth*.72,height:1.3,overhang:.7,lift:.4,y:top+1.35,material:tiles});
  }
  else roof(h,{width,depth,height:1.25,overhang:.8,lift:.35,y:top,material:tiles});
  return h;
}
function island(name:string,x:number,z:number,rx:number,rz:number,season:'pine'|'blossom'|'maple'){
 const root=new T.Group();root.name=name;root.position.set(x,-4.1,z);
 // An ochre cliff ring with a malachite top, rocks at the tide line: the same painted strata as the home islands.
 const cliff=mesh(root,new T.CylinderGeometry(1,1.12,3.4,64),material('#b5b498',.95,0,'cliff'),0,-1.4);cliff.name='horizon-cliff';cliff.scale.set(rx+.4,1,rz+.4);
 const land=mesh(root,new T.CylinderGeometry(1,1.02,.68,80),material('#90b99a',.95,0,'grass'),0,-.03);land.name='horizon-land';land.scale.set(rx,1,rz);
 for(let i=0;i<22;i++){const a=i*Math.PI*2/22+Math.sin(i)*.1;const rock=mesh(root,new T.DodecahedronGeometry(1,0),material(i%3?'#8d6f4d':'#5e6f66',.95,0,'stone'),Math.cos(a)*(rx+1.2),-2.9+(i%3)*.2,Math.sin(a)*(rz+1.2));rock.scale.set(1+(i%3)*.35,.7+(i%2)*.3,.9);rock.rotation.set(i,i*.7,0);}
 // Keep the whole crown behind the buildings and inside the elliptical shore.
 for(let i=0;i<6;i++){
   const x=-9+i*3.6,z=-(rz-3.2)*Math.sqrt(1-(x/(rx-3.2))**2);
   const tree=paintedTree(root,x,z,.8+i%3*.04,i%2?season:'pine',GROUND);tree.name='horizon-tree';
 }
 // Descend outside the cliff, then meet a pier whose piles extend below the seabed.
 const deckTop=GROUND+.04-5*.205,dockStart=rz+2.6,dockZ=dockStart+1.6;
 box(root,3.4,.08,1,0,GROUND+.02,rz-.3,kit.stone()).name='horizon-shore-landing';
 for(let i=0;i<6;i++){
   const h=GROUND+.04-i*.205,bottom=deckTop-.32;
   box(root,3.4,h-bottom,.44,0,(h+bottom)/2,rz+.31+i*.42,kit.stone()).name='horizon-shore-step';
 }
 const dock=new T.Group();dock.name='horizon-dock';root.add(dock);
 box(dock,4,.28,3.2,0,deckTop-.14,dockZ,kit.timberLight()).name='horizon-dock-deck';
 for(const x of [-1.7,1.7]){
   box(dock,.2,.17,3.4,x,deckTop-.31,dockZ,kit.timber());
   link(root,[x,GROUND-.12,rz-.7],[x,deckTop-.23,dockStart+.18],.1,kit.timber());
   for(const z of [dockStart+.35,dockStart+2.85]){
     const bottom=-3.4,top=deckTop+.4;
     mesh(dock,new T.CylinderGeometry(.12,.17,top-bottom,10),kit.timber(),x,(top+bottom)/2,z).name='horizon-dock-pile';
   }
 }
 return root;
}
function approach(root:T.Group,width:number,end:number,title:string,color:string){
 const shore=distantIslands.find(s=>s.name===root.name)!.rz-.65;
 box(root,width,.09,shore+1,0,.355,(shore-1)/2,kit.marble());
 for(const side of [-1,1])for(const fraction of [.5,.67,.9]){
   const lamp=lantern(root,side*(width/2+.65),shore*fraction,.8,GROUND);lamp.name='horizon-lantern';
 }
 const label=sign(root,title,'未开放 · 敬请期待',color,6,.85);label.position.set(0,1.2,end-1.7);
 for(const x of [-2.6,2.6])box(root,.12,.8,.12,x,.68,end-1.7,kit.timber());
}
/** Quant exchange: a waterside counting hall behind a colonnade, a candlestick sculpture, an open round pavilion. */
export function exchangeIsland(){
 const root=island('future-quant-exchange',-116,55,21,16,'maple');
 hall(root,15,7.5,0,-3.4,{height:3.4,tiles:kit.tileGreen()});
 for(const side of [-1,1])hall(root,4.4,5.6,side*12,-4,{height:2.6,eaves:1});
 // The colonnade fronts the hall: a single row of lacquered columns under a long lean-to eave.
 const veranda=new T.Group();veranda.name='horizon-colonnade';root.add(veranda);
 podium(veranda,15.4,1.5,.48,0,1.6,GROUND);
 for(let i=0;i<8;i++)column(veranda,-7+i*2,1.6,3,.16,kit.lacquer(),GROUND+.48);
 beam(veranda,15,0,GROUND+3.68,1.6);roof(veranda,{width:14.6,depth:.6,height:.35,overhang:.6,lift:.2,y:GROUND+3.83,z:1.6,material:kit.tileGreen()});
 // Candlestick chart: cinnabar (up) and malachite (down) bodies with bronze wicks, on a long stone plinth.
 const chart=new T.Group();chart.position.set(0,GROUND,4.6);root.add(chart);podium(chart,9.2,1.4,.5);
 for(let i=0;i<7;i++){const x=(i-3)*1.25,low=.85+(i%3)*.32,h=.9+(i*3%5)*.45;box(chart,.62,h,.62,x,low+h/2,0,i%3?kit.malachite():kit.lacquer());link(chart,[x,.5,0],[x,low+h+.4,0],.04,kit.bronze());}
 const ticker=sign(root,'量化研究 · 数据中庭','','#e3c385',7,.75);ticker.position.set(0,GROUND+2.7,2.07);
 for(const x of [-2.6,2.6])link(root,[x,GROUND+3.68,1.6],[x,GROUND+3.125,2.07],.024,kit.bronze());
 const rotunda=new T.Group();rotunda.name='horizon-pavilion';rotunda.position.set(-11,GROUND,5.3);root.add(rotunda);podium(rotunda,4.8,4.8,.3);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;column(rotunda,Math.cos(a)*1.9,Math.sin(a)*1.9,2.6,.11,kit.lacquer(),.3);}
 mesh(rotunda,new T.CylinderGeometry(2.1,2.1,.24,8),kit.beam(),0,3.04);
 roundRoof(rotunda,{radius:2.6,height:1.5,y:3.1,material:kit.tileGreen()});
 approach(root,4.6,13,'量化投资交易所岛','#e3c385');return root;
}
/** An automaton arm: bronze links and patina joints, a three-finger gripper. */
function roboticArm(root:T.Group,x:number,z:number,mirror=1){
 const a=new T.Group();a.name='horizon-robotic-arm';a.position.set(x,GROUND,z);a.scale.x=mirror;root.add(a);
 mesh(a,new T.CylinderGeometry(.9,1.2,.55,24),kit.stone(),0,.275);
 mesh(a,new T.CylinderGeometry(.46,.55,.22,16),kit.patina(),0,.56);
 const points=[[0,.6,0],[0,2,0],[1.3,3.8,0],[2.8,3.4,0]];
 for(let i=0;i<points.length-1;i++){link(a,points[i],points[i+1],i===0?.27:.21,kit.bronze());mesh(a,new T.SphereGeometry(.34,18,12),kit.patina(),...points[i+1] as [number,number,number]);}
 link(a,[2.8,3.4,0],[2.8,2.9,0],.12,kit.bronze());for(const side of [-1,1]){link(a,[2.8,2.9,0],[2.8+side*.25,2.7,0],.065,kit.bronze());link(a,[2.8+side*.25,2.7,0],[2.8+side*.25,2.4,0],.065,kit.bronze());}
 link(a,[2.8,2.9,0],[2.8,2.7,-.25],.065,kit.bronze());link(a,[2.8,2.7,-.25],[2.8,2.4,-.25],.065,kit.bronze());return a;
}
/** Robot island: two timber workshops, an assembly line and a bronze automaton between them. */
export function robotDistrict(){
 const root=island('future-robot-island',155,76,20,16,'blossom');
 for(const side of [-1,1])hall(root,6,7,side*8.5,-4,{height:3.6,eaves:1,tiles:kit.tile()});
 const robot=new T.Group();robot.name='horizon-automaton';robot.position.set(0,GROUND,-4);root.add(robot);mesh(robot,new T.CylinderGeometry(3,3.2,.4,32),kit.stone(),0,.2);
 const bronze=kit.bronze(),patina=kit.patina(),lacquer=kit.lacquer();
 for(const side of [-1,1]){box(robot,1.1,.5,1.7,side*.85,.65,.3,bronze);link(robot,[side*.85,.88,0],[side*.85,2.4,0],.34,patina);mesh(robot,new T.SphereGeometry(.43,18,12),bronze,side*.85,1.75,0);}
 box(robot,2.8,2.1,1.65,0,3.25,0,lacquer);box(robot,3.45,2.2,2.1,0,5.5,0,bronze);box(robot,2.8,1.15,.13,0,5.65,1.09,kit.ink());
 mesh(robot,new T.CylinderGeometry(.5,.5,.42,12),patina,0,4.35);
 const light=kit.lamp('#f3c77a');for(const side of [-1,1]){
   mesh(robot,new T.SphereGeometry(.18,16,10),light,side*.65,5.7,1.2);
   link(robot,[side*1.25,3.9,0],[side*1.7,3.9,0],.2,bronze);
   mesh(robot,new T.SphereGeometry(.38,18,12),patina,side*1.7,3.9,0);link(robot,[side*1.7,3.9,0],[side*2.15,2.7,.25],.26,bronze);mesh(robot,new T.SphereGeometry(.33,18,12),patina,side*2.15,2.5,.25);
 }
 roof(robot,{width:3.15,depth:1.8,height:.5,overhang:.3,lift:.18,y:6.62,material:kit.tileGold()});
 roboticArm(root,-8,5);roboticArm(root,8,5,-1);box(root,7,.35,1.9,0,.85,5.5,kit.timber());
 for(const x of [-2.8,0,2.8])for(const z of [4.8,6.2])box(root,.14,.675-GROUND,.14,x,(.675+GROUND)/2,z,kit.bronze());
 for(let i=0;i<11;i++){const roller=mesh(root,new T.CylinderGeometry(.13,.13,1.7,10),kit.stoneDark(),-3+i*.6,1.07,5.5);roller.rotation.x=Math.PI/2;}
 for(const x of [-1.5,1.5])box(root,.7,.7,.7,x,1.52,5.5,kit.lacquer());
 approach(root,4.2,13.5,'机器人岛','#acd9c5');return root;
}
/** AI institute: a round hall on a triple terrace under three blue roofs, two research wings and a bronze neural crown. */
export function researchInstitute(){
 const root=island('future-ai-institute',100,-90,23,18,'pine');
 const centre=new T.Group();centre.name='horizon-institute';centre.position.set(0,GROUND,-3);root.add(centre);
 let y=0;for(const [r,h] of [[8,.45],[7,.45],[6,.45]]){mesh(centre,new T.CylinderGeometry(r,r+.1,h,48),kit.marble(),0,y+h/2);y+=h;}
 for(let i=0;i<16;i++){const a=i*Math.PI/8;column(centre,Math.cos(a)*4.6,Math.sin(a)*4.6,3.2,.2,kit.lacquer(),y);}
 mesh(centre,new T.CylinderGeometry(4.3,4.3,3.2,32,1,true),kit.lattice(),0,y+1.6);
 mesh(centre,new T.CylinderGeometry(4.85,4.85,.22,32),kit.beam(),0,y+3.25);
 roundRoof(centre,{radius:5.6,height:1.2,y:y+3.35,finial:false});
 roundRoof(centre,{radius:4.6,height:1.1,y:y+5.7,finial:false});
 roundRoof(centre,{radius:3.6,height:1.7,y:y+7.8});
 for(const [r,h,base,count] of [[3.7,2.16,y+3.52,12],[2.9,1.94,y+5.86,10]]){
   const storey=new T.Group();storey.name='horizon-institute-storey';centre.add(storey);
   mesh(storey,new T.CylinderGeometry(r,r,h,32,1,true),kit.lattice(),0,base+h/2);
   for(let i=0;i<count;i++){const a=i*Math.PI*2/count;mesh(storey,new T.CylinderGeometry(.11,.13,h,10),kit.lacquer(),Math.cos(a)*(r+.06),base+h/2,Math.sin(a)*(r+.06));}
   for(const bandY of [base+.08,base+h-.08])mesh(storey,new T.CylinderGeometry(r+.18,r+.18,.16,32),kit.beam(),0,bandY);
 }
 // The neural crown: six gilded nodes linked in a ring and across, raised above the finial on a bronze mast.
 const orbit=new T.Group();orbit.position.set(0,y+12.4,0);orbit.scale.setScalar(1.25);centre.add(orbit);const light=kit.lamp('#f6d48c');
 const nodes=Array.from({length:6},(_,i)=>[Math.cos(i*Math.PI/3)*2.1,Math.sin(i*Math.PI/3)*1.4,Math.sin(i*Math.PI*2/3)*.8]);
 for(let i=0;i<6;i++){mesh(orbit,new T.SphereGeometry(.24,16,10),light,...nodes[i] as [number,number,number]);link(orbit,nodes[i],nodes[(i+1)%6],.025,kit.gold());link(orbit,nodes[i],nodes[(i+2)%6],.02,kit.bronze());}
 link(centre,[0,y+10,0],[0,y+12.4,0],.08,kit.bronze());
 mesh(orbit,new T.SphereGeometry(.16,12,8),kit.bronze());for(const i of [1,4])link(orbit,[0,0,0],nodes[i],.035,kit.bronze());
 for(const side of [-1,1])hall(root,6.2,6,side*13,-2,{height:3,eaves:1,tiles:kit.tileBlue()});
 const entry=paifang(root,7.8,4.6,{z:5.8,tiles:kit.tileBlue()});entry.group.name='horizon-institute-gate';entry.group.position.y=GROUND;
 const plaque=sign(entry.group,'AI 研究院','模型 · 科学 · 下一段探索','#cbdde9',6.5,.8);plaque.position.y=entry.plaqueY;
 // Two bronze sundials flank the approach.
 for(const x of [-6,6]){
   const sundial=new T.Group();sundial.name='horizon-sundial';sundial.position.set(x,GROUND,8);root.add(sundial);
   mesh(sundial,new T.CylinderGeometry(1.2,1.35,.8,8),kit.stone(),0,.4);
   link(sundial,[0,.76,0],[0,1.5,0],.12,kit.bronze());
   link(sundial,[0,.76,-.55],[0,1.92,-.53],.08,kit.bronze());
   const dial=new T.Group();dial.name='horizon-dial-face';dial.position.y=1.54;dial.rotation.x=.7;sundial.add(dial);
   mesh(dial,new T.CylinderGeometry(1,1,.1,32),kit.bronze());
   link(dial,[0,.045,0],[0,.65,-.45],.04,kit.gold());
   for(let i=0;i<12;i++){const a=i*Math.PI/6,tick=box(dial,.025,.016,.13,Math.sin(a)*.83,.057,Math.cos(a)*.83,kit.gold());tick.rotation.y=a;}
 }
 approach(root,4.6,15,'AI 研究院','#cbdde9');return root;
}

/** Capture real vertical bounds before the scenery is merged into static batches. */
export function distantColliders(root:T.Group):Obstacle[]{
 const spec=distantIslands.find(s=>s.name===root.name)!;
 const colliders:Obstacle[]=[{x:spec.x,z:spec.z,radius:0,halfX:spec.rx,halfZ:spec.rz,ellipse:true,surface:true,base:-7.2,height:distantGround}];
 root.updateMatrixWorld(true);
 root.traverse(o=>{
   if(!(o instanceof T.Mesh))return;
   // The first two meshes are the elliptical cliff/land, already represented above.
   if(o===root.children[0]||o===root.children[1])return;
   const bounds=new T.Box3().setFromObject(o),size=bounds.getSize(new T.Vector3()),centre=bounds.getCenter(new T.Vector3());
   if(size.x<.012||size.y<.012||size.z<.012)return;
   colliders.push({x:centre.x,z:centre.z,radius:0,halfX:size.x/2,halfZ:size.z/2,base:bounds.min.y,height:bounds.max.y});
 });
 return colliders;
}
