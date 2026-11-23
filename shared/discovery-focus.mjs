// R 提示与动作共用焦点排序。
export function discoveryScore(x, z, targetX, targetZ, radius, heading) {
  const dx = targetX - x,
    dz = targetZ - z,
    distance = Math.hypot(dx, dz);
  if (distance >= radius) return -Infinity;
  if (!heading) return -distance;
  const facing = (dx * heading.x + dz * heading.z) / Math.max(distance, 0.001);
  return facing > 0.15 ? facing * 4 - distance * 0.1 : -Infinity;
}
