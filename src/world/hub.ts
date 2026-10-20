import * as T from 'three';
import {material,mesh} from './architecture';
import {kit,place,lantern} from './vernacular';
import type {Region} from '../core/types';
import type {Obstacle} from './scenery';
export function nightLight(color:string){const m=new T.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.14,roughness:.55});m.userData.nightGlow=true;return m;}

/** Hub proportions shared with the world: altar tiers, sphere centre, guide star, star-chart table. */
export const hubLayout={tiers:[[3.7,.2],[3,.4],[2.3,.6]] as [number,number][],sphere:{y:6.3,radius:3.4},guideY:10.9,atlas:{x:0,z:5.25},rail:8.55};
const LATITUDE=40*Math.PI/180;
/** Flat ring with a rectangular section, revolved about Y. */
const band=(radius:number,width:number,thickness:number,segments=128)=>new T.LatheGeometry([[radius-width/2,-thickness/2],[radius+width/2,-thickness/2],[radius+width/2,thickness/2],[radius-width/2,thickness/2],[radius-width/2,-thickness/2]].map(([x,y])=>new T.Vector2(x,y)),segments);

/** The Altar of the Armillary: round marble tiers (heaven), a square plinth (earth), dragon pillars that
 * face the four island bridges, and rotating rings around the constellation of memories. */
export function buildHub(regions:Region[]){
  const root=new T.Group();root.name='celestial-hub';const colliders:Obstacle[]=[];
  const marble=kit.marble(),stone=kit.stone(),bronze=kit.bronze(),patina=kit.patina(),gold=kit.gold();
  // Three round tiers, each a 20 cm step: visitors may climb straight up from any side.
  let base=0;
  for(const [i,[radius,top]] of hubLayout.tiers.entries()){
    const h=top-base;
    place(root,new T.CylinderGeometry(radius,radius+.05,h-.05,96),stone,0,base+(h-.05)/2);
    place(root,new T.CylinderGeometry(radius+.06,radius+.06,.05,96),marble,0,top-.025);
    // Carved risers: shallow panels between pilasters, every ninth of the circle.
    for(let k=0;k<(i+1)*9;k++){const a=k/((i+1)*9)*Math.PI*2;place(root,new T.BoxGeometry(.1,h-.07,.06),marble,Math.sin(a)*(radius+.04),base+(h-.07)/2,Math.cos(a)*(radius+.04)).rotation.y=a;}
    // The felt edge of an obstacle includes the walker's 0.35 m margin.
    colliders.push({x:0,z:0,radius:radius-.35,height:top});
    base=top;
  }
  // Earth: a square plinth on the top tier with a bronze cross-shaped water level.
  place(root,new T.BoxGeometry(1.9,.95,1.9),stone,0,.6+.475);
  place(root,new T.BoxGeometry(2.05,.08,2.05),marble,0,1.59);
  for(const r of [0,Math.PI/2])place(root,new T.BoxGeometry(2.7,.16,.42),bronze,0,1.71,0).rotation.y=r;
  for(const [x,z] of [[1.35,0],[-1.35,0],[0,1.35],[0,-1.35]]){place(root,new T.CylinderGeometry(.24,.28,.16,12),bronze,x,1.71,z);}
  colliders.push({x:0,z:0,radius:0,halfX:.95,halfZ:.95,height:1.8});
  // Cloud column: a fluted bronze cradle wrapped by one rising scroll; the meridian ring rests in it.
  const shaft=new T.LatheGeometry([[0,0],[.34,0],[.3,.1],[.2,.24],[.22,.57],[.18,.89],[.26,1.01],[.34,1.07],[0,1.07]].map(([x,y])=>new T.Vector2(x,y)),16);
  place(root,shaft,bronze,0,1.79);
  const scroll=Array.from({length:30},(_,k)=>{const t=k/29,a=t*Math.PI*4.5;return new T.Vector3(Math.cos(a)*(.27+.06*Math.sin(t*9)),1.84+t*.96,Math.sin(a)*(.27+.06*Math.sin(t*9)));});
  place(root,new T.TubeGeometry(new T.CatmullRomCurve3(scroll),60,.05,6,false),patina);
  const {y:cy,radius:R}=hubLayout.sphere;
  // Four dragon pillars stand toward the four island bridges and carry the horizon ring.
  for(const region of regions){
    const a=Math.atan2(region.position[0],region.position[1]),dx=Math.sin(a),dz=Math.cos(a);
    const path=[[2.02,.6],[1.95,1.6],[2.25,2.8],[2.85,4],[3.05,5.1],[R,cy-.12]].map(([r,y])=>new T.Vector3(dx*r,y,dz*r));
    const curve=new T.CatmullRomCurve3(path),geo=new T.TubeGeometry(curve,48,1,10,false),p=geo.attributes.position;
    for(let i=0;i<=48;i++){const c=curve.getPointAt(i/48),r=.2-.1*i/48;for(let j=0;j<=10;j++){const k=i*11+j;p.setXYZ(k,c.x+(p.getX(k)-c.x)*r,c.y+(p.getY(k)-c.y)*r,c.z+(p.getZ(k)-c.z)*r);}}
    geo.computeVertexNormals();place(root,geo,patina);
    place(root,new T.CylinderGeometry(.32,.38,.18,12),bronze,dx*2.02,.69,dz*2.02);
    // Cloud scrolls cling to the pillar; a gilded pearl crowns it where the ring rests.
    for(const t of [.28,.52,.74]){const c=curve.getPointAt(t),ring=place(root,new T.TorusGeometry(.2,.055,6,16,Math.PI*1.4),bronze,c.x,c.y,c.z);ring.rotation.set(Math.PI/2,0,a+t*4);}
    place(root,new T.SphereGeometry(.17,14,10),gold,dx*R,cy+.2,dz*R);
    // A bracket for this domain's resonance light.
    place(root,new T.BoxGeometry(.05,.05,.55),bronze,dx*2.6,4.3,dz*2.6).rotation.y=a;
    colliders.push({x:dx*2.1,z:dz*2.1,radius:.32,height:7});
  }
  // Fixed rings: horizon (graduated) and the meridian that holds the polar axis.
  place(root,band(R,.2,.12),gold,0,cy);
  for(let k=0;k<36;k++){const a=k/36*Math.PI*2;place(root,new T.BoxGeometry(.04,.03,k%3?.12:.2),bronze,Math.sin(a)*R,cy+.075,Math.cos(a)*R).rotation.y=a;}
  const meridian=place(root,band(R-.02,.16,.1),gold,0,cy);meridian.rotation.z=Math.PI/2;
  const axis=new T.Vector3(0,Math.sin(LATITUDE),-Math.cos(LATITUDE));
  const rod=place(root,new T.CylinderGeometry(.035,.035,R*2,8),bronze,0,cy);rod.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis);
  for(const s of [-1,1])place(root,new T.SphereGeometry(.12,12,8),gold,axis.x*R*s,cy+axis.y*R*s,axis.z*R*s);
  // Turning rings: the equator and the ecliptic with a sighting tube, revolving about the pole.
  const turning=new T.Group();turning.position.y=cy;turning.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis);turning.userData.dynamic=true;turning.name='armillary-turning';root.add(turning);
  place(turning,band(R*.88,.15,.08),bronze);
  const ecliptic=place(turning,band(R*.82,.12,.07),gold);ecliptic.rotation.x=23.4*Math.PI/180;
  for(let k=0;k<28;k++){const a=k/28*Math.PI*2;place(ecliptic,new T.SphereGeometry(.045,8,6),patina,Math.sin(a)*R*.82,.06,Math.cos(a)*R*.82).castShadow=false;}
  const sight=new T.Group();sight.rotation.z=.35;turning.add(sight);
  const tube=place(sight,new T.CylinderGeometry(.07,.07,R*1.5,10),bronze);tube.rotation.x=Math.PI/2;
  place(sight,band(R*.74,.1,.06),bronze).rotation.z=Math.PI/2;
  // The perimeter balustrade opens for each bridge and the harbour ramp; a lantern terminates every run.
  const openings=[...regions.map(r=>({angle:Math.atan2(r.position[1],r.position[0]),half:2.9})),{angle:Math.PI/2,half:2.4}];
  const gaps=openings.map(o=>({angle:o.angle,half:Math.asin(o.half/hubLayout.rail)})).sort((p,q)=>p.angle-q.angle);
  const railH=.95;
  gaps.forEach((gap,i)=>{
    const next=gaps[(i+1)%gaps.length],from=gap.angle+gap.half,to=next.angle-next.half+(i===gaps.length-1?Math.PI*2:0);
    const count=Math.max(1,Math.round((to-from)*hubLayout.rail/1.55)),posts=Array.from({length:count+1},(_,k)=>{const a=from+(to-from)*k/count;return new T.Vector3(Math.cos(a)*hubLayout.rail,0,Math.sin(a)*hubLayout.rail);});
    posts.forEach((p,k)=>{
      if(k===0||k===count){lantern(root,p.x,p.z,1.1);colliders.push({x:p.x,z:p.z,radius:.42,height:2.1});}
      else{place(root,new T.BoxGeometry(.22,railH,.22),marble,p.x,railH/2,p.z).rotation.y=-Math.atan2(p.z,p.x);place(root,new T.CylinderGeometry(.1,.13,.16,8),marble,p.x,railH+.08,p.z);place(root,new T.SphereGeometry(.11,10,8),marble,p.x,railH+.24,p.z);}
      const q=posts[k+1];if(!q)return;
      const mid=p.clone().add(q).multiplyScalar(.5),length=p.distanceTo(q)-.2,rot=-Math.atan2(q.z-p.z,q.x-p.x);
      place(root,new T.BoxGeometry(length,.12,.15),marble,mid.x,railH-.12,mid.z).rotation.y=rot;
      place(root,new T.BoxGeometry(length,.36,.1),marble,mid.x,.3,mid.z).rotation.y=rot;
      place(root,new T.BoxGeometry(length,.08,.2),marble,mid.x,.05,mid.z).rotation.y=rot;
      for(const s of [-.25,.25]){const v=p.clone().lerp(q,.5+s);place(root,new T.CylinderGeometry(.05,.07,.35,6),marble,v.x,.66,v.z);}
      colliders.push({x:mid.x,z:mid.z,radius:.12,height:railH+.3,segment:[p.x,p.z,q.x,q.z]});
    });
  });
  // The world guide floats above the meridian as the pole star; a gilded spire points to it.
  place(root,new T.ConeGeometry(.07,.65,8),gold,0,cy+R+.32);
  let time=0;
  return {root,colliders,update(dt:number){time+=dt;turning.rotateY(dt*.05);sight.rotation.y=Math.sin(time*.07)*.6;}};
}
/** Material helper kept for modules that import it from the hub. */
export const hubStone=()=>material('#e7e1d2',.86,.02,'stone');
export {mesh};
