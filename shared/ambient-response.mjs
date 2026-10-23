export function proximityEnergy(distance,near=4,far=14){
  if(distance<=near)return 1;
  if(distance>=far)return 0;
  const t=(distance-near)/(far-near);
  return 1-t*t*(3-2*t);
}

/** Integrate a changing speed; multiplying elapsed time by proximity would jump the phase. */
export function advanceAmbientPhase(phase,dt,activity,reduced=false){
  return phase+(reduced?0:Math.max(0,Math.min(.1,dt))*(1+Math.max(0,Math.min(1,activity))*.45));
}

export function resonantRegions(entries,found){
  return new Set(entries.filter(entry=>found.has(entry.id)&&entry.regionId).map(entry=>entry.regionId));
}
