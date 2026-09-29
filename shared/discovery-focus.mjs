// The same focus ranking drives the visible R prompt and its action.
export function discoveryScore(x,z,targetX,targetZ,radius,heading){
  const dx=targetX-x,dz=targetZ-z,distance=Math.hypot(dx,dz);
  if(distance>=radius)return -Infinity;
  if(!heading)return -distance;
  const facing=(dx*heading.x+dz*heading.z)/Math.max(distance,.001);
  return facing>.15?facing*4-distance*.1:-Infinity;
}
