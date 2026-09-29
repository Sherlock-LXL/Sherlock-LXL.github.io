export const EYE_HEIGHT = 1.7;
export const INTERACTION_RADIUS = 2.9;
export function nearestStation(x,z,stations,radius=INTERACTION_RADIUS) {
  let nearest=null,best=radius;
  for(const station of stations){const distance=Math.hypot(x-station.x,z-station.z);if(distance<best){nearest=station;best=distance;}}
  return nearest;
}
export function lookAngles(x,z,targetX,targetZ){return {yaw:Math.atan2(x-targetX,z-targetZ),pitch:0};}
