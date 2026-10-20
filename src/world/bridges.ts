import * as T from 'three';
import {bridgeLightSpan} from '../../shared/bridge-joints.mjs';
import {kit,place,balustrade} from './vernacular';
import {nightLight} from './hub';
import type {Region} from '../core/types';

const DECK_TOP=-.04,DECK=.36,HALF=2.8,WATER=-5.65;
/** A flat stone causeway carried on arches. The walking plane (y=0) and corridor width are unchanged. */
export function buildBridge(region:Region){
  const [x,z]=region.position,distance=Math.hypot(x,z),start=8.4,end=distance-region.radius+.6,length=end-start,mid=(start+end)/2;
  const root=new T.Group();root.name=`bridge-${region.id}`;root.position.set(x/distance*mid,0,z/distance*mid);root.rotation.y=Math.atan2(x,z);
  const stone=kit.stone(),marble=kit.marble(),dark=kit.stoneDark();
  // Deck: paved slab with a moulded fascia.
  const deck=place(root,new T.BoxGeometry(HALF*2,DECK,length),kit.stone(),0,DECK_TOP-DECK/2,0);deck.name='bridge-deck';
  for(const s of [-1,1]){place(root,new T.BoxGeometry(.16,.2,length),marble,s*(HALF+.02),DECK_TOP-.1,0);place(root,new T.BoxGeometry(.1,.12,length),dark,s*(HALF-.02),DECK_TOP-DECK-.06,0);}
  const seams=kit.stoneDark();for(let p=-length/2+.9;p<length/2-.6;p+=1.8)place(root,new T.BoxGeometry(HALF*2-.4,.008,.035),seams,0,DECK_TOP+.002,p).castShadow=false;
  // Spandrel walls with arch openings; abutments sink into each island's cliff.
  const abutment=1.5,pier=1.05,span=length-abutment*2,count=Math.max(1,Math.round(span/5.4)),arch=(span-pier*(count-1))/count,radius=arch/2;
  const crown=DECK_TOP-DECK-.5,spring=crown-radius,bottom=WATER-1.4;
  const wall=new T.Shape();wall.moveTo(-length/2,bottom);wall.lineTo(length/2,bottom);wall.lineTo(length/2,DECK_TOP-DECK);wall.lineTo(-length/2,DECK_TOP-DECK);wall.closePath();
  const centres:number[]=[];
  for(let i=0;i<count;i++){
    const c=-span/2+radius+i*(arch+pier);centres.push(c);
    const hole=new T.Path();hole.moveTo(c-radius,bottom+.4);hole.lineTo(c-radius,spring);hole.absarc(c,spring,radius,Math.PI,0,true);hole.lineTo(c+radius,bottom+.4);hole.closePath();wall.holes.push(hole);
  }
  const wallGeometry=new T.ExtrudeGeometry(wall,{depth:.5,bevelEnabled:false,curveSegments:24});wallGeometry.rotateY(Math.PI/2);
  for(const s of [-1,1])place(root,wallGeometry,stone,s>0?HALF-.5:-HALF,0,0);
  // Barrel vaults and a voussoir ring proud of each face.
  const vault=kit.stoneDark().clone();vault.side=T.DoubleSide;
  for(const c of centres){
    const barrel=place(root,new T.CylinderGeometry(radius,radius,HALF*2-.9,24,1,true,0,Math.PI),vault,0,spring,c);barrel.rotation.z=Math.PI/2;barrel.castShadow=false;
    const ring=new T.Shape();ring.absarc(0,0,radius+.32,0,Math.PI,false);ring.lineTo(-radius,0);ring.absarc(0,0,radius,Math.PI,0,true);ring.closePath();
    const voussoir=new T.ExtrudeGeometry(ring,{depth:.06,bevelEnabled:false,curveSegments:20});voussoir.rotateY(Math.PI/2);
    for(const s of [-1,1])place(root,voussoir,marble,s>0?HALF+.005:-HALF-.065,spring,c);
    // Keystone.
    for(const s of [-1,1])place(root,new T.BoxGeometry(.12,.46,.34),marble,s*(HALF+.04),crown+.16,c);
  }
  // Cutwaters split the current at every pier.
  for(let i=0;i<count-1;i++){
    const pz=centres[i]+radius+pier/2;
    for(const s of [-1,1]){
      const cut=place(root,new T.BoxGeometry(.78,spring-WATER+.9,.78),stone,s*(HALF+.12),(spring+WATER-.9)/2-.15,pz);cut.rotation.y=Math.PI/4;
      const cap=place(root,new T.ConeGeometry(.6,.5,4),marble,s*(HALF+.12),spring-.15+.25,pz);cap.rotation.y=Math.PI/4;
    }
  }
  // Balustrades stop short of both landings; lamp pillars stand in line with them, outside the 2.5 m walking corridor.
  const line=bridgeLightSpan(distance,region.radius),run=line.length,offset=line.mid-mid,glow=nightLight('#f3c77a');
  for(const s of [-1,1]){
    balustrade(root,run,{x:s*2.74,y:DECK_TOP,z:offset,rotation:Math.PI/2,spacing:1.55});
    for(const t of [0,1])pillar(root,s*2.76,offset-run/2+t*run,glow);
    for(let p=offset-run/2+5.2;p<offset+run/2-2.5;p+=5.2)pillar(root,s*2.76,p,glow);
  }
  return root;
}
function pillar(root:T.Object3D,x:number,z:number,glow:T.Material){
  const s=kit.marble();
  place(root,new T.BoxGeometry(.34,1.32,.34),s,x,DECK_TOP+.66,z);
  place(root,new T.BoxGeometry(.42,.08,.42),s,x,DECK_TOP+1.36,z);
  place(root,new T.BoxGeometry(.24,.3,.24),glow,x,DECK_TOP+1.55,z).castShadow=false;
  for(const [dx,dz] of [[-.12,-.12],[.12,-.12],[-.12,.12],[.12,.12]])place(root,new T.BoxGeometry(.04,.32,.04),s,x+dx,DECK_TOP+1.55,z+dz);
  place(root,new T.ConeGeometry(.3,.26,4),kit.stoneDark(),x,DECK_TOP+1.84,z).rotation.y=Math.PI/4;
  place(root,new T.SphereGeometry(.06,8,6),s,x,DECK_TOP+2,z);
}
