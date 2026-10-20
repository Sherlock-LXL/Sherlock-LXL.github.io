import * as T from 'three';
import {kit,place,roof,column,beam,balustrade,lantern,paintedTree} from './vernacular';
import type {Region} from '../core/types';
import type {Obstacle} from './scenery';

export type RegionLandmark={root:T.Group;colliders:Obstacle[]};

/** Optional supporting architecture. Project exhibits remain each island's primary landmarks. */
export function regionLandmark(region:Region):RegionLandmark|null{
  const root=new T.Group();root.name=`landmark-${region.id}`;
  if(region.id==='science-valley')return {root,colliders:scienceLandmark(root)};
  if(region.id==='personal-museum')return {root,colliders:museumLandmark(root)};
  return null;
}
/** Square frustum: a 4-sided cylinder turned to face the axes; halves are measured face to face. */
const frustum=(top:number,bottom:number,height:number)=>new T.CylinderGeometry(top*Math.SQRT2,bottom*Math.SQRT2,height,4,1).rotateY(Math.PI/4);
/** Bell profile cast in bronze: shoulder, waist and a flared lip. */
const bell=new T.LatheGeometry([[0,.9],[.2,.9],[.3,.82],[.33,.6],[.36,.3],[.44,.06],[.46,0],[.4,0],[0,.02]].map(([r,h])=>new T.Vector2(r,h)),20);

/** The star-gazing terrace: a battered brick tower with a measuring slot, bronze instruments on its roof deck. */
function scienceLandmark(root:T.Group):Obstacle[]{
  const tower=new T.Group();tower.position.set(0,0,-10.8);root.add(tower);
  const brick=kit.brick(),stone=kit.stone(),snow=kit.paper(),bronze=kit.bronze(),patina=kit.patina();
  place(tower,frustum(2.75,2.85,.3),stone,0,.15);
  // Two battered halves leave the meridian slot open on the island-facing side.
  for(const s of [-1,1]){const half=new T.Group();half.position.x=s*1.27;tower.add(half);
    place(half,frustum(2.15,2.3,4.1),brick,0,.3+2.05).scale.x=.5;
    for(let k=0;k<5;k++){const y=1.05+k*.75,t=(y-.3)/4.1;place(half,new T.BoxGeometry(2*(1.15-.075*t)+.06,.06,2*(2.3-.15*t)+.06),stone,0,y).castShadow=false;}}
  place(tower,new T.BoxGeometry(.4,4.1,4),kit.stoneDark(),0,2.35,-.3);
  // Roof deck with a low parapet and snow resting along every ledge.
  place(tower,new T.BoxGeometry(5.1,.18,4.9),stone,0,4.49);
  place(tower,new T.BoxGeometry(5.06,.05,4.86),snow,0,4.6);
  for(const [x,z,w,d] of [[0,2.38,5.1,.18],[0,-2.38,5.1,.18],[2.48,0,.18,4.6],[-2.48,0,.18,4.6]])place(tower,new T.BoxGeometry(w,.5,d),brick,x,4.83,z);
  // A small watch room keeps the instruments' records; its eaves carry snow.
  const room=new T.Group();room.position.set(-1.25,4.62,-1.1);tower.add(room);
  for(const x of [-.7,.7])for(const z of [-.55,.55])column(room,x,z,1.4,.08,kit.lacquer());
  place(room,new T.BoxGeometry(1.3,1.1,.06),kit.lattice(),0,.75,.52);
  place(room,new T.BoxGeometry(1.4,1.2,.06),kit.plaster(),0,.75,-.55);
  beam(room,1.7,0,1.62,.55,0,.16,.12);beam(room,1.7,0,1.62,-.55,0,.16,.12);
  roof(room,{width:1.6,depth:1.3,height:.55,overhang:.35,lift:.18,y:1.7,material:kit.tileSnow()});
  // Simplified armillary (jianyi): an equatorial ring and a declination ring on dragon-legged bronze trestles.
  const inst=new T.Group();inst.position.set(1.15,4.62,.35);tower.add(inst);
  for(const s of [-1,1]){place(inst,new T.BoxGeometry(.14,.12,1.6),bronze,s*.6,.06,0);const leg=place(inst,new T.CylinderGeometry(.04,.06,1.15,8),patina,s*.6,.6,-.55);leg.rotation.x=.35;}
  const polar=new T.Group();polar.position.y=1.05;polar.rotation.x=-0.7;inst.add(polar);
  for(const [r,rot] of [[.62,0],[.55,Math.PI/2]] as [number,number][]){const ring=place(polar,new T.TorusGeometry(r,.035,6,40),bronze);ring.rotation.y=rot;}
  place(polar,new T.CylinderGeometry(.025,.025,1.5,6),kit.gold());
  // Celestial globe on a four-legged stand.
  const globe=new T.Group();globe.position.set(-1.2,4.62,1.15);tower.add(globe);
  for(let i=0;i<4;i++){const a=i*Math.PI/2+Math.PI/4;const leg=place(globe,new T.CylinderGeometry(.035,.05,.7,6),patina,Math.cos(a)*.35,.35,Math.sin(a)*.35);leg.rotation.set(Math.sin(a)*.25,0,-Math.cos(a)*.25);}
  place(globe,new T.TorusGeometry(.48,.04,6,32),bronze,0,.72).rotation.x=Math.PI/2;
  place(globe,new T.SphereGeometry(.42,24,16),kit.azurite(),0,.82);
  const meridian=place(globe,new T.TorusGeometry(.47,.025,6,32),kit.gold(),0,.82);meridian.rotation.y=.4;
  // A warm timber instrument door replaces the old ink-black recess.
  place(tower,new T.BoxGeometry(1.26,1.86,.14),stone,0,1.2,2.31);
  for(const side of [-1,1]){
    place(tower,new T.BoxGeometry(.48,1.58,.08),kit.timberLight(),side*.255,1.16,2.42);
    for(const y of [.68,1.16,1.64])place(tower,new T.BoxGeometry(.42,.035,.025),kit.gold(),side*.255,y,2.47).castShadow=false;
    place(tower,new T.SphereGeometry(.035,8,6),bronze,side*.08,1.16,2.48).castShadow=false;
  }
  place(tower,new T.BoxGeometry(1.42,.16,.2),stone,0,2.09,2.36);
  place(tower,new T.BoxGeometry(1.32,.12,.34),kit.marble(),0,.31,2.39);
  for(const x of [-1.1,1.1])lantern(tower,x,3.15,.8);
  return [{x:0,z:-10.8,radius:3.55,height:5.8}];
}

/** The museum's bell tower: a brick base with blind arches, a timber bell storey and a double-eave roof. */
function museumLandmark(root:T.Group):Obstacle[]{
  const tower=new T.Group();tower.position.set(0,0,-13);root.add(tower);
  const brick=kit.brick(),stone=kit.stone();
  place(tower,new T.CylinderGeometry(2.42,2.55,.16,8),stone,0,.08).rotation.y=Math.PI/8;
  place(tower,frustum(1.3,1.38,3),brick,0,.16+1.5);
  place(tower,new T.BoxGeometry(2.72,.12,2.72),stone,0,3.12);
  // Blind arches: an ink-dark recess with a round head on every face; the battered brick swallows their backs.
  const dark=kit.ink(),head=new T.CylinderGeometry(.45,.45,.14,16,1,false,-Math.PI/2,Math.PI).rotateX(-Math.PI/2);
  for(let i=0;i<4;i++){const face=new T.Group();face.rotation.y=i*Math.PI/2;tower.add(face);
    place(face,new T.BoxGeometry(.9,1.2,.14),dark,0,.76,1.36);
    place(face,head,dark,0,1.36,1.36);
    place(face,new T.BoxGeometry(1.14,.1,.1),stone,0,.12,1.4);}
  // Skirt eave between brick and timber; the bell storey's plastered base rises through it.
  roof(tower,{width:2.6,depth:2.6,height:.42,overhang:.5,lift:.22,y:3.24,thickness:.1});
  place(tower,new T.BoxGeometry(2.2,.46,2.2),kit.plaster(),0,3.4);
  // The bell storey: lacquered posts, a balustrade and a bronze bell visible through open bays.
  const storey=new T.Group();storey.position.y=3.62;tower.add(storey);
  place(storey,new T.BoxGeometry(2.3,.14,2.3),kit.timber(),0,.07);
  for(const x of [-.95,.95])for(const z of [-.95,.95])column(storey,x,z,1.9,.1,kit.lacquer(),.14);
  for(const [x,z,r] of [[0,1.02,0],[0,-1.02,0],[1.02,0,Math.PI/2],[-1.02,0,Math.PI/2]] as [number,number,number][]){
    balustrade(storey,1.5,{x,z,y:.14,rotation:r,height:.5,spacing:.75,material:kit.timber()});
    beam(storey,2.2,x,2.12,z,r,.2,.14);}
  place(storey,new T.BoxGeometry(.08,.5,.08),kit.timber(),0,1.85,0);
  place(storey,bell,kit.bronze(),0,.95,0);
  place(storey,new T.BoxGeometry(1.9,.08,.08),kit.timber(),0,1.9,0);
  roof(storey,{width:2.1,depth:2.1,height:1.1,overhang:.55,lift:.32,y:2.24,material:kit.tileGold(),finial:true});
  for(const x of [-3.4,3.4])paintedTree(root,x,-13,1,'maple');
  return [
    {x:0,z:-13,radius:0,halfX:1.35,halfZ:1.35,height:10.3},
    {x:-3.4,z:-13,radius:.3,height:3.8},
    {x:3.4,z:-13,radius:.3,height:3.8},
  ];
}
