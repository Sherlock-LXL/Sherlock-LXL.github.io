/** Conservative plan-view bounds for furniture and thin rails, independent of walk collision. */
export function footprintBounds(o) {
  if(o.segment){const [ax,az,bx,bz]=o.segment,r=o.radius??0;return {minX:Math.min(ax,bx)-r,maxX:Math.max(ax,bx)+r,minZ:Math.min(az,bz)-r,maxZ:Math.max(az,bz)+r};}
  const x=o.halfX??o.radius??0,z=o.halfZ??o.radius??0;
  return {minX:o.x-x,maxX:o.x+x,minZ:o.z-z,maxZ:o.z+z};
}
export function footprintsOverlap(a,b,gap=0){
  const aa=footprintBounds(a),bb=footprintBounds(b);
  return aa.minX<bb.maxX+gap&&aa.maxX>bb.minX-gap&&aa.minZ<bb.maxZ+gap&&aa.maxZ>bb.minZ-gap;
}
