export function proximityEnergy(distance,near=4,far=14){
  if(distance<=near)return 1;
  if(distance>=far)return 0;
  const t=(distance-near)/(far-near);
  return 1-t*t*(3-2*t);
}

export function resonantRegions(entries,found){
  return new Set(entries.filter(entry=>found.has(entry.id)&&entry.regionId).map(entry=>entry.regionId));
}
