/** 按距离与三维视线选目标；给小物件留出余量，不要求命中网格。 */
export function interactionScore(eye, direction, target, range, size = 0.35) {
  const dx = target.x - eye.x,
    dy = target.y - eye.y,
    dz = target.z - eye.z,
    distance = Math.hypot(dx, dz);
  if (distance >= range) return -Infinity;
  const length = Math.hypot(dx, dy, dz),
    facing =
      (dx * direction.x + dy * direction.y + dz * direction.z) /
      Math.max(0.001, length * Math.hypot(direction.x, direction.y, direction.z)),
    angle = Math.min(
      (55 * Math.PI) / 180,
      (32 * Math.PI) / 180 + Math.atan2(Math.max(0.4, size), length),
    );
  return facing > Math.cos(angle) ? facing * 4 - distance * 0.1 : -Infinity;
}
