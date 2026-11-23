import { mountainRoutes, hillsideRoute, landings, entranceSurface } from "./mountain-route.mjs";
import { harborHeight } from "./harbor.mjs";
const smooth = (t) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
/** 渲染、步行、路径规划与展品共用同一曲面采样。 */
export function regionHeight(x, z, region) {
  const t = region.terrain;
  if (!t) return 0;
  const distance = Math.hypot(x, z);
  if (distance >= region.radius) return 0;
  let height = Math.max(0, Math.min(t.height, ((18 - z) * t.height) / 38));
  for (const terrace of t.terraces) {
    const dx = x - terrace.center[0],
      dz = z - terrace.center[1];
    const d = t.route
      ? Math.hypot(Math.max(0, Math.abs(dx) - 4.6), Math.max(0, Math.abs(dz) - 4.7))
      : Math.hypot(dx, dz) - terrace.radius;
    const weight = 1 - smooth(t.route ? (d - 0.75) / 1.7 : d / 2);
    height += (terrace.height - height) * weight;
  }
  if (t.route) {
    height *= 1 - smooth((distance - (region.radius - 5)) / 4.6);
    const court = t.arrivalCourt;
    if (court) {
      const d = Math.hypot(x - court.center[0], z - court.center[1]),
        weight = 1 - smooth((d - court.radius) / 1.5);
      height += (court.height - height) * weight;
    }
    let nearest = null;
    for (const route of mountainRoutes(region)) {
      const hit = hillsideRoute(x, z, route),
        edge = hit.distance - route.width / 2;
      if (!nearest || edge < nearest.edge) nearest = { ...hit, edge };
    }
    if (nearest) {
      const weight = 1 - smooth((nearest.edge - 0.25) / 1.35);
      height += (nearest.y - height) * weight;
    }
    for (const p of landings(region)) {
      const weight = 1 - smooth((Math.hypot(x - p.x, z - p.z) - p.radius) / 0.9);
      height += (p.y - height) * weight;
    }
    height = entranceSurface(x, z, height, region);
    // 展品地基优先于邻坡和上层平台。
    // 在 4.05 米台座外留余量，避免三角化切入。
    for (const terrace of t.terraces) {
      const distance = Math.hypot(x - terrace.center[0], z - terrace.center[1]);
      const core = 1 - smooth((distance - 4.45) / 0.55),
        skirt = 1 - smooth((distance - 4.45) / 2.2);
      const clearance = nearest ? smooth((nearest.edge + 0.3) / 1) : 1;
      const weight = core + (skirt - core) * clearance;
      height += (terrace.height - height) * weight;
    }
  }
  return t.route ? height : height * (1 - smooth((distance - (region.radius - 5)) / 4.6));
}
export function groundHeight(x, z, regions) {
  const dock = harborHeight(x, z);
  if (dock !== null && Math.hypot(x, z) >= 9) return dock;
  for (const r of regions)
    if (r.terrain && Math.hypot(x - r.position[0], z - r.position[1]) < r.radius)
      return regionHeight(x - r.position[0], z - r.position[1], r);
  return 0;
}
