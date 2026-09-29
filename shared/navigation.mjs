import {groundHeight} from './terrain-height.mjs';
import {harborContains} from './harbor.mjs';
// The same walkable topology is used by the renderer and unit tests.
export function pointSegmentDistance(x,z,ax,az,bx,bz) {
  const dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz;
  const t=l===0?0:Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l));
  return Math.hypot(x-(ax+t*dx),z-(az+t*dz));
}
export function onGround(x,z,regions){return Math.hypot(x,z)<9 || harborContains(x,z,.25) || regions.some(r=>Math.hypot(x-r.position[0],z-r.position[1])<r.radius-0.8 || pointSegmentDistance(x,z,0,0,...r.position)<2.5);}
export function overlaps(x,z,o,padding=.35){if(o.segment){const [ax,az,bx,bz]=o.segment;if(x<Math.min(ax,bx)-padding-o.radius||x>Math.max(ax,bx)+padding+o.radius||z<Math.min(az,bz)-padding-o.radius||z>Math.max(az,bz)+padding+o.radius)return false;return pointSegmentDistance(x,z,ax,az,bx,bz)<o.radius+padding;}return o.halfX!==undefined
    ? Math.abs(x-o.x)<o.halfX+padding && Math.abs(z-o.z)<o.halfZ+padding
    : Math.hypot(x-o.x,z-o.z)<o.radius+padding;}
export function walkable(x,z,regions,obstacles=[],feetY=groundHeight(x,z,regions)) {
  return onGround(x,z,regions) && feetY>=groundHeight(x,z,regions)-.001 && !obstacles.some(o=>overlaps(x,z,o)&&feetY<(o.height??Infinity)-.001);
}
