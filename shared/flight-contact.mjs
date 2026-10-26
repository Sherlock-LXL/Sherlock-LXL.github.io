import {groundHeight} from './terrain-height.mjs';
import {onGround,overlaps,pointSegmentDistance} from './navigation.mjs';
import {distantIslands,distantContains,distantGround} from './distant-islands.mjs';

export function flightFloor(x,z,regions){
  if(onGround(x,z,regions))return groundHeight(x,z,regions);
  if(distantIslands.some(s=>distantContains(x,z,s)))return distantGround;
  return -5.65;
}
function contact(x,z,o,padding){
  if(!overlaps(x,z,o,padding))return {depth:0,nx:0,nz:0};
  if(o.segment){
    const [ax,az,bx,bz]=o.segment,dx=bx-ax,dz=bz-az;
    const t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz||1)));
    const vx=x-ax-t*dx,vz=z-az-t*dz,d=pointSegmentDistance(x,z,ax,az,bx,bz)||.0001;
    return {depth:o.radius+padding-d,nx:vx/d,nz:vz/d};
  }
  if(o.halfX!==undefined){
    const dx=x-o.x,dz=z-o.z,ax=o.halfX+padding-Math.abs(dx),az=o.halfZ+padding-Math.abs(dz);
    return ax<az?{depth:ax,nx:Math.sign(dx)||1,nz:0}:{depth:az,nx:0,nz:Math.sign(dz)||1};
  }
  const dx=x-o.x,dz=z-o.z,d=Math.hypot(dx,dz)||.0001;
  return {depth:o.radius+padding-d,nx:dx/d||1,nz:dz/d};
}
/** Slide at solid surfaces, keep feet supported and leave lift available at every contact. */
export function moveGlider(s,dx,dz,dy,regions,obstacles){
  let x=s.x+dx,z=s.z+dz,y=Math.min(64,s.y+dy),hit=false;
  const supported=(px,pz)=>flightFloor(px,pz,regions)<=Math.max(s.y,y)+.25;
  if(!supported(x,z)){
    hit=true;
    if(supported(x,s.z))z=s.z;
    else if(supported(s.x,z))x=s.x;
    else{x=s.x;z=s.z;}
  }
  for(let pass=0;pass<3;pass++)for(const o of obstacles){
    if(o.surface)continue;
    const base=o.base??groundHeight(o.x,o.z,regions),top=o.height??base+8;
    const padding=y+.15<top&&y+1.3>base?.55:y+2.2<top&&y+3.4>base?3.65:0;
    if(!padding)continue;
    const c=contact(x,z,o,padding);if(c.depth<=0)continue;
    hit=true;
    if(s.y>=top-.12){y=Math.max(y,top+.12);continue;}
    // Penetration correction affects only this short step, never the race spawn or timer.
    x+=c.nx*(c.depth+.00001);z+=c.nz*(c.depth+.00001);
  }
  const radius=Math.hypot(x,z);
  if(radius>220){x*=220/radius;z*=220/radius;hit=true;}
  const floor=flightFloor(x,z,regions)+.12;
  if(y<floor){y=floor;if(s.vy<0)s.vy=0;hit=true;}
  s.x=x;s.z=z;s.y=y;s.hit||=hit;
}
