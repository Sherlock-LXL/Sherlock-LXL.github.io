import { groundHeight } from "./terrain-height.mjs";
import { overlaps, pointSegmentDistance, supportedFootprint } from "./navigation.mjs";
import { STEP_HEIGHT } from "./locomotion.mjs";
import { footprintBounds } from "./decoration-clearance.mjs";

/** 基于原有世界碰撞体建立局部粗筛。 */
export class LivingNavigation {
  constructor(regions, obstacles, reserved = []) {
    this.regions = regions;
    this.reserved = reserved;
    this.buckets = new Map();
    for (const obstacle of obstacles) {
      const b = footprintBounds(obstacle);
      for (let x = Math.floor(b.minX / 4); x <= Math.floor(b.maxX / 4); x++)
        for (let z = Math.floor(b.minZ / 4); z <= Math.floor(b.maxZ / 4); z++) {
          const key = `${x},${z}`,
            list = this.buckets.get(key) ?? [];
          list.push(obstacle);
          this.buckets.set(key, list);
        }
    }
  }
  nearby(x, z, radius) {
    const found = new Set();
    for (let a = Math.floor((x - radius) / 4); a <= Math.floor((x + radius) / 4); a++)
      for (let b = Math.floor((z - radius) / 4); b <= Math.floor((z + radius) / 4); b++)
        for (const o of this.buckets.get(`${a},${b}`) ?? []) found.add(o);
    return found;
  }
  regionAt(x, z, radius = 0) {
    return this.regions.find(
      (r) => Math.hypot(x - r.position[0], z - r.position[1]) < r.radius - 0.9 - radius,
    );
  }
  /** 动物可越过坡面与小台阶；散置物件仍需平坦支撑。 */
  travel(x, z, radius, regionId, dynamic = []) {
    if (regionId && this.regionAt(x, z, radius)?.id !== regionId) return null;
    if (!supportedFootprint(x, z, this.regions, radius)) return null;
    let y = groundHeight(x, z, this.regions);
    for (const o of this.nearby(x, z, radius + 0.12)) {
      if (!overlaps(x, z, o, radius + 0.1)) continue;
      const h = o.height ?? Infinity;
      if (h - y > STEP_HEIGHT) return null;
      y = Math.max(y, h);
    }
    if (dynamic.some((o) => Math.hypot(x - o.x, z - o.z) < radius + o.radius + 0.12)) return null;
    return y;
  }
  route(a, b, radius, regionId, dynamic = []) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.12));
    let previous = this.travel(a.x, a.z, radius, regionId);
    for (let i = 1; i <= n; i++) {
      const t = i / n,
        y = this.travel(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t, radius, regionId, dynamic);
      if (y === null || (previous !== null && Math.abs(y - previous) > STEP_HEIGHT)) return false;
      previous = y;
    }
    return true;
  }
  /** 完整占地需有平坦支撑，并避开栏杆、树木、展品与岸边。
   * @param {string|null} regionId
   */
  ground(x, z, radius, regionId = null, dynamic = [], reserve = false, spread = 0.06) {
    const region = this.regionAt(x, z, radius);
    if (regionId ? region?.id !== regionId : !region && Math.hypot(x, z) > 8 - radius) return null;
    const y = groundHeight(x, z, this.regions);
    let low = y,
      high = y;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        h = groundHeight(x + Math.cos(a) * radius, z + Math.sin(a) * radius, this.regions);
      low = Math.min(low, h);
      high = Math.max(high, h);
    }
    if (high - low > spread) return null;
    for (const o of this.nearby(x, z, radius + 0.12))
      if ((o.height ?? Infinity) > low + 0.06 && overlaps(x, z, o, radius + 0.1)) return null;
    if (dynamic.some((o) => Math.hypot(x - o.x, z - o.z) < radius + o.radius + 0.12)) return null;
    if (reserve && this.reserved.some((o) => Math.hypot(x - o.x, z - o.z) < radius + o.radius))
      return null;
    return y;
  }
  segment(a, b, radius, regionId = null, dynamic = [], reserve = false) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.22));
    let previous = null;
    for (let i = 0; i <= n; i++) {
      const t = i / n,
        y = this.ground(
          a.x + (b.x - a.x) * t,
          a.z + (b.z - a.z) * t,
          radius,
          regionId,
          dynamic,
          reserve,
        );
      if (y === null || (previous !== null && Math.abs(y - previous) > 0.15)) return false;
      previous = y;
    }
    return true;
  }
  /** 随机布置可复现；山地小空地采用有限网格后备方案。 */
  place(region, radius, random, occupied = [], room = false) {
    const candidates = [];
    for (let i = 0; i < 350; i++) {
      const a = random() * Math.PI * 2,
        r = Math.sqrt(random()) * (region.radius - 2 - radius);
      candidates.push({
        x: region.position[0] + Math.cos(a) * r,
        z: region.position[1] + Math.sin(a) * r,
      });
    }
    for (let x = -region.radius + 2; x < region.radius - 2; x += 1.2)
      for (let z = -region.radius + 2; z < region.radius - 2; z += 1.2)
        candidates.push({ x: region.position[0] + x, z: region.position[1] + z });
    for (const p of candidates) {
      const y = this.ground(p.x, p.z, radius, region.id, occupied, true, room ? 0.06 : 0.035);
      if (y === null) continue;
      if (room) {
        const free = [0, 1, 2, 3, 4, 5, 6, 7].filter((i) =>
          this.segment(
            p,
            {
              x: p.x + Math.cos((i * Math.PI) / 4) * 1.4,
              z: p.z + Math.sin((i * Math.PI) / 4) * 1.4,
            },
            radius,
            region.id,
            occupied,
          ),
        );
        if (free.length < 2) continue;
      }
      return { ...p, y };
    }
    return null;
  }
  sight(a, b) {
    const y = Math.min(a.y, b.y);
    for (const o of this.nearby(
      (a.x + b.x) / 2,
      (a.z + b.z) / 2,
      Math.hypot(a.x - b.x, a.z - b.z) / 2 + 0.1,
    )) {
      if ((o.height ?? Infinity) < y + 0.15) continue;
      if (o.segment) {
        for (let i = 0; i <= 12; i++)
          if (overlaps(a.x + ((b.x - a.x) * i) / 12, a.z + ((b.z - a.z) * i) / 12, o, 0.06))
            return false;
      } else if (o.halfX !== undefined) {
        for (let i = 0; i <= 12; i++)
          if (overlaps(a.x + ((b.x - a.x) * i) / 12, a.z + ((b.z - a.z) * i) / 12, o, 0.06))
            return false;
      } else if (pointSegmentDistance(o.x, o.z, a.x, a.z, b.x, b.z) < o.radius + 0.06) return false;
    }
    return true;
  }
}
