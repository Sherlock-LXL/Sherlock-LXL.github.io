import {pointSegmentDistance} from './navigation.mjs';
import {exhibitPoint} from './exhibit-layout.mjs';

/** Local coordinates shared by painted paths and furniture exclusion. */
export function regionRoutes(region, exhibits=[]){
  const [x,z]=region.position,d=Math.hypot(x,z)||1;
  const arrival=[-x/d*(region.radius+.8),-z/d*(region.radius+.8)];
  const inner=[-x/d*(region.radius-4),-z/d*(region.radius-4)];
  if(region.terrain)return [{width:5.6,points:[arrival,inner]}];
  const hub=region.forecourt??[0,7];
  return [{width:region.arrivalPath?3.2:4,points:[arrival,...(region.arrivalPath??[inner]),hub]}, {width:2.8,points:[hub,region.spawn??[0,10]]},
    ...exhibits.map(m=>({width:2.8,points:[hub,...[6.6,4.8].map(z=>{const p=exhibitPoint(m,0,z);return [p.x,p.z];})]}))];
}
export function onRegionRoute(x,z,region,exhibits=[],margin=0){
  return regionRoutes(region,exhibits).some(r=>r.points.slice(1).some((p,i)=>pointSegmentDistance(x,z,...r.points[i],...p)<r.width/2+margin));
}
