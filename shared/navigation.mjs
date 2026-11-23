import { groundHeight } from "./terrain-height.mjs";
import { harborContains } from "./harbor.mjs";
// 渲染器与单元测试共用可行走拓扑。
export function pointSegmentDistance(x, z, ax, az, bx, bz) {
  const dx = bx - ax,
    dz = bz - az,
    l = dx * dx + dz * dz;
  const t = l === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l));
  return Math.hypot(x - (ax + t * dx), z - (az + t * dz));
}
export function onGround(x, z, regions) {
  return (
    Math.hypot(x, z) < 9 ||
    harborContains(x, z, 0.25) ||
    regions.some(
      (r) =>
        Math.hypot(x - r.position[0], z - r.position[1]) < r.radius - 0.8 ||
        pointSegmentDistance(x, z, 0, 0, ...r.position) < 2.5,
    )
  );
}
/** 支撑面沿岛桥相接拓扑计算，独立于居民所属岛屿。 */
export function supportedFootprint(x, z, regions, radius = 0.35, offsets = [{ x: 0, z: 0 }]) {
  for (const p of offsets) {
    if (!onGround(x + p.x, z + p.z, regions)) return false;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      if (!onGround(x + p.x + Math.cos(a) * radius, z + p.z + Math.sin(a) * radius, regions))
        return false;
    }
  }
  return true;
}
export function bodyFootprint(yaw, length) {
  return [-length, 0, length].map((d) => ({ x: Math.sin(yaw) * d, z: Math.cos(yaw) * d }));
}
export function overlaps(x, z, o, padding = 0.35) {
  if (o.ellipse)
    return ((x - o.x) / (o.halfX + padding)) ** 2 + ((z - o.z) / (o.halfZ + padding)) ** 2 < 1;
  if (o.segment) {
    const [ax, az, bx, bz] = o.segment;
    if (
      x < Math.min(ax, bx) - padding - o.radius ||
      x > Math.max(ax, bx) + padding + o.radius ||
      z < Math.min(az, bz) - padding - o.radius ||
      z > Math.max(az, bz) + padding + o.radius
    )
      return false;
    return pointSegmentDistance(x, z, ax, az, bx, bz) < o.radius + padding;
  }
  return o.halfX !== undefined
    ? Math.abs(x - o.x) < o.halfX + padding && Math.abs(z - o.z) < o.halfZ + padding
    : Math.hypot(x - o.x, z - o.z) < o.radius + padding;
}
export function walkable(x, z, regions, obstacles = [], feetY = groundHeight(x, z, regions)) {
  return (
    onGround(x, z, regions) &&
    feetY >= groundHeight(x, z, regions) - 0.001 &&
    !obstacles.some((o) => overlaps(x, z, o) && feetY < (o.height ?? Infinity) - 0.001)
  );
}
