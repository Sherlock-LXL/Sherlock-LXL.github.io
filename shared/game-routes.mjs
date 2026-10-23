import {groundHeight} from './terrain-height.mjs';
import {mountainRoutes,roundRoute} from './mountain-route.mjs';
import {findTrail} from './trail.mjs';
import {LivingNavigation} from './living-navigation.mjs';
import {overlaps,onGround,walkable} from './navigation.mjs';
import {bridgeLayout} from './bridge-layout.mjs';
import {harbor} from './harbor.mjs';

/** Compact capsule around the hull, with contact normals for sliding along the shore. */
export function waterContact(x,z,regions,yaw=0){
  let contact={depth:0,nx:0,nz:0};
  const touch=(depth,nx,nz)=>{if(depth>contact.depth)contact={depth,nx,nz};};
  const boundary=Math.hypot(x,z);touch(boundary-148,-x/(boundary||1),-z/(boundary||1));
  const bodies=[{position:[0,0],radius:9},...regions];
  const hullRadius=.60;
  for(const along of [-1.05,0,1.05]){
    const px=x+Math.sin(yaw)*along,pz=z+Math.cos(yaw)*along;
    for(const r of bodies){
      const dx=px-r.position[0],dz=pz-r.position[1],d=Math.hypot(dx,dz),toward=Math.atan2(-r.position[1],-r.position[0]);
      const angle=Math.abs(Math.atan2(Math.sin(Math.atan2(dz,dx)-toward),Math.cos(Math.atan2(dz,dx)-toward)));
      // The existing bridge mouths have sheer cliffs and no shoreline boulders.
      const mouth=r.radius===9||angle<4/r.radius;
      const shore=mouth?r.radius+.70:r.radius*1.085+1.05;
      touch(shore+hullRadius-d,dx/(d||1),dz/(d||1));
    }
    const rect=(cx,cz,hx,hz)=>{
      const dx=px-cx,dz=pz-cz,ax=hx+hullRadius-Math.abs(dx),az=hz+hullRadius-Math.abs(dz);
      if(ax>0&&az>0){if(ax<az)touch(ax,Math.sign(dx)||1,0);else touch(az,0,Math.sign(dz)||1);}
    };
    rect(0,(harbor.rampStart+harbor.rampEnd)/2,harbor.halfWidth,(harbor.rampEnd-harbor.rampStart)/2);
    rect(0,(harbor.rampEnd+harbor.deckEnd)/2,harbor.deckHalfWidth,(harbor.deckEnd-harbor.rampEnd)/2);
    const dockDistance=Math.hypot(px,pz-34);touch(6.1+hullRadius-dockDistance,px/(dockDistance||1),(pz-34)/(dockDistance||1));
    for(const r of regions){
      const b=bridgeLayout(r),lateral=px*b.uz-pz*b.ux,long=px*b.ux+pz*b.uz;
      if(Math.abs(lateral)>b.half+hullRadius||long<b.start-.3||long>b.end+.3)continue;
      const centre=b.centres.reduce((best,c)=>Math.abs(long-b.mid-c)<Math.abs(long-b.mid-best)?c:best,b.centres[0]);
      const offset=long-b.mid-centre,headroom=Math.max(0,-4.10-b.spring);
      const opening=Math.sqrt(Math.max(0,b.radius*b.radius-headroom*headroom))-hullRadius;
      const penetration=Math.abs(offset)-opening;
      if(penetration>0){
        const side=b.half+hullRadius-Math.abs(lateral);
        if(side<penetration)touch(side,Math.sign(lateral)*b.uz,-Math.sign(lateral)*b.ux);
        else touch(penetration,-Math.sign(offset)*b.ux,-Math.sign(offset)*b.uz);
      }
    }
  }
  return contact;
}
export const waterClear=(x,z,regions,yaw=0)=>waterContact(x,z,regions,yaw).depth<=.00001;

/** Resolve only inward velocity; tangent motion and reversing remain available after contact. */
export function moveBoat(state,dx,dz,regions){
  const before=waterContact(state.x,state.z,regions,state.yaw),next=waterContact(state.x+dx,state.z+dz,regions,state.yaw);
  if(next.depth<=.00001||next.depth<before.depth-.000001){state.x+=dx;state.z+=dz;return next.depth>0;}
  const inward=dx*next.nx+dz*next.nz,sx=dx-Math.min(0,inward)*next.nx,sz=dz-Math.min(0,inward)*next.nz;
  const slide=waterContact(state.x+sx,state.z+sz,regions,state.yaw);
  if(slide.depth<=.00001||slide.depth<before.depth-.000001){state.x+=sx;state.z+=sz;}
  const velocity=state.vx*next.nx+state.vz*next.nz;
  if(velocity<0){state.vx-=velocity*next.nx;state.vz-=velocity*next.nz;}
  return true;
}

const closedCurve=(nodes,rounding)=>roundRoute([nodes.at(-1),...nodes,nodes[0],nodes[1]],rounding);
function loopCurve(nodes,rounding){
  const rounded=closedCurve(nodes,rounding),start=rounded.reduce((best,p,i)=>Math.hypot(p.x-nodes[0][0],p.z-nodes[0][1])<Math.hypot(rounded[best].x-nodes[0][0],rounded[best].z-nodes[0][1])?i:best,0);
  // Use one full loop, keeping the rounded first corner only once.
  const end=rounded.findIndex((p,i)=>i>start+10&&Math.hypot(p.x-rounded[start].x,p.z-rounded[start].z)<.35);
  return end>start?rounded.slice(start,end+1):rounded;
}
export const seaNodes=[
  [54,25,-5.65],[50,49,-5.65],[26,56,-5.65],[0,49,-5.65],[-23,54,-5.65],[-47,42,-5.65],[-51,17,-5.65],
  [-56,-5,-5.65],[-68,-28,-5.65],[-69,-47,-5.65],[-56,-69,-5.65],[-31,-77,-5.65],[-9,-66,-5.65],
  [3,-47,-5.65],[2,-32,-5.65],[-3.66,-19.04,-5.65],[-10.7,-13.4,-5.65],[-17.74,-7.76,-5.65],
  [-25,-7,-5.65],[-26,-3,-5.65],[-21,-2,-5.65],[-17,-4,-5.65],[-17.74,-7.76,-5.65],[-10.7,-13.4,-5.65],[-3.66,-19.04,-5.65],
  [1,-39,-5.65],[14,-46,-5.65],[37,-46,-5.65],[49,-30,-5.65],[50,-8,-5.65],[52,10,-5.65],
];
export const skyNodes=[
  [-12,12,22],[-35,8,17],[-46,28,21],[-27,47,33],[-6,36,43],[18,45,30],[40,29,19],[26,8,24],
  [14,-12,34],[31,-35,26],[8,-48,40],[-13,-58,51],[-39,-63,42],[-51,-39,29],[-33,-22,20],[-13,-9,31],[7,1,39],
];
export function seaPath(){return loopCurve(seaNodes,8);}
export function skyPath(){return loopCurve(skyNodes,8);}

/** Plan the land tour on the actual unmodified world. The topology is a four-spoke
 * network, so the course deliberately revisits bridges while its ordered gates disambiguate laps. */
export function landPath(regions,obstacles=[]){
  const nav=new LivingNavigation(regions,obstacles),padding=.40;
  const solid=obstacles.map(o=>({...o,radius:o.radius+padding,...(o.halfX!==undefined?{halfX:o.halfX+padding,halfZ:o.halfZ+padding}:{})}));
  const safe=p=>{
    const region=regions.find(r=>Math.hypot(p.x-r.position[0],p.z-r.position[1])<r.radius-1);
    for(let ring=0;ring<8;ring++)for(let i=0;i<(ring?24:1);i++){
      const x=p.x+Math.cos(i*Math.PI/12)*ring*.45,z=p.z+Math.sin(i*Math.PI/12)*ring*.45;
      if(region&&Math.hypot(x-region.position[0],z-region.position[1])>region.radius-1.5)continue;
      if(nav.travel(x,z,.9,region?.id??null)!==null&&walkable(x,z,regions,solid))return {x,z};
    }
    throw Error(`No land-course clearing near ${p.x},${p.z}`);
  };
  const route=[];
  const join=target=>{
    const end=safe(target);if(!route.length){route.push(end);return;}
    const path=findTrail(route.at(-1),end,regions,solid,.6);
    if(!path.length)throw Error(`Land-course connection unavailable ${JSON.stringify(route.at(-1))} → ${JSON.stringify(end)}`);
    route.push(...path.slice(1));
  };
  const spring=regions.find(r=>r.season==='spring'),main=mountainRoutes(spring).find(r=>r.kind==='main').points;
  // Start near the mountain's broad entrance, then climb its original lower switchback.
  const world=p=>({x:p.x+spring.position[0],z:p.z+spring.position[1]});
  join(world({x:8,z:21.5}));
  const first=main.findIndex(p=>Math.hypot(p.x-8,p.z-21.5)<.4),top=main.reduce((best,p,i)=>Math.hypot(p.x+8,p.z-11.6)<Math.hypot(main[best].x+8,main[best].z-11.6)?i:best,0);
  for(const p of main.slice(first,top+1))route.push(world(p));
  join(world({x:-10.8,z:12.7}));join(world({x:-8,z:14}));join(world({x:-5,z:13.5}));
  join(world(main[Math.max(first,top-9)]));
  route.push(...main.slice(first,Math.max(first,top-9)).reverse().map(world));
  for(const p of [[-24,-16.5],[-18,-21],[-6,-7.5],[-5,-6],[6,-4.8],[12.5,-10.4],[24,-13],[29,-12],[28,-8],[24,-8],[20,-10],[12.5,-10.4],[6,-4.8],[6,5],[12,12],[15,14],[24,15],[27,15],[29,18],[27,20],[24,19],[21,16],[15,14],[12,12],[6,5],[-5,6],[-12,12],[-14,12],[-18,13],[-24,13],[-29,15],[-30,19],[-27,21],[-24,19],[-19,15],[-14,12],[-12,12],[-5,6],[-6,-5],[-6,-7.5],[-18,-21],[-24,-16.5],[-24,-18.5]])join({x:p[0],z:p[1]});
  join(route[0]);
  // Remove sub-grid zigzags only where a swept segment is supported and clear.
  const clear=(a,b)=>{
    const n=Math.ceil(Math.hypot(a.x-b.x,a.z-b.z)/.15);let y=groundHeight(a.x,a.z,regions);
    for(let i=1;i<=n;i++){
      const x=a.x+(b.x-a.x)*i/n,z=a.z+(b.z-a.z)*i/n,ny=groundHeight(x,z,regions);
      if(!onGround(x,z,regions)||Math.abs(ny-y)>.35||[...nav.nearby(x,z,.7)].some(o=>overlaps(x,z,o,.54)&&(o.height??Infinity)>ny+.06))return false;y=ny;
    }return true;
  };
  const simple=[route[0]];
  for(let i=0;i<route.length-1;){
    let j=i+1;while(j+1<route.length&&Math.hypot(route[j+1].x-route[i].x,route[j+1].z-route[i].z)<3&&clear(route[i],route[j+1]))j++;
    simple.push(route[j]);i=j;
  }
  const path=[];
  for(let i=1;i<simple.length;i++){
    const a=simple[i-1],b=simple[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.3));
    for(let k=0;k<n;k++){const x=a.x+(b.x-a.x)*k/n,z=a.z+(b.z-a.z)*k/n;path.push({x,z,y:groundHeight(x,z,regions)});}
  }
  path.push({...path[0]});return path;
}
