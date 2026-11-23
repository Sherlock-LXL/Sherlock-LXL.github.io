import * as T from "three";
import { material, mesh } from "./architecture";
import { kit, place, lantern } from "./vernacular";
import type { Region } from "../core/types";
import type { Obstacle } from "./scenery";
export function nightLight(color: string) {
  const m = new T.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.14,
    roughness: 0.55,
  });
  m.userData.nightGlow = true;
  return m;
}

/** 中心岛比例供世界共用，包括台阶、球心、引导星与星图桌。 */
export const hubLayout = {
  tiers: [
    [3.7, 0.2],
    [3, 0.4],
    [2.3, 0.6],
  ] as [number, number][],
  sphere: { y: 6.3, radius: 3.4 },
  guideY: 10.9,
  atlas: { x: 0, z: 5.25 },
  rail: 8.55,
};
const LATITUDE = (40 * Math.PI) / 180;
/** 矩形截面绕 Y 轴旋转成扁环。 */
const band = (radius: number, width: number, thickness: number, segments = 128) =>
  new T.LatheGeometry(
    [
      [radius - width / 2, -thickness / 2],
      [radius + width / 2, -thickness / 2],
      [radius + width / 2, thickness / 2],
      [radius - width / 2, thickness / 2],
      [radius - width / 2, -thickness / 2],
    ].map(([x, y]) => new T.Vector2(x, y)),
    segments,
  );

/** 浑仪坛包含圆石台阶、方形地座、四向龙柱与围绕记忆星座的旋转环。 */
export function buildHub(regions: Region[]) {
  const root = new T.Group();
  root.name = "celestial-hub";
  const colliders: Obstacle[] = [];
  const marble = kit.marble(),
    stone = kit.stone(),
    bronze = kit.bronze(),
    patina = kit.patina(),
    gold = kit.gold();
  // 三层圆阶每级 20 厘米，可从任意方向攀上。
  let base = 0;
  for (const [i, [radius, top]] of hubLayout.tiers.entries()) {
    const h = top - base;
    place(
      root,
      new T.CylinderGeometry(radius, radius + 0.05, h - 0.05, 96),
      stone,
      0,
      base + (h - 0.05) / 2,
    );
    place(
      root,
      new T.CylinderGeometry(radius + 0.06, radius + 0.06, 0.05, 96),
      marble,
      0,
      top - 0.025,
    );
    // 环形台阶分为九段，在壁柱间加入浅雕板。
    for (let k = 0; k < (i + 1) * 9; k++) {
      const a = (k / ((i + 1) * 9)) * Math.PI * 2;
      place(
        root,
        new T.BoxGeometry(0.1, h - 0.07, 0.06),
        marble,
        Math.sin(a) * (radius + 0.04),
        base + (h - 0.07) / 2,
        Math.cos(a) * (radius + 0.04),
      ).rotation.y = a;
    }
    // 障碍范围包含步行者 0.35 米间距。
    colliders.push({ x: 0, z: 0, radius: radius - 0.35, height: top });
    base = top;
  }
  // 地形台座采用方形石座与铜质十字水准器。
  place(root, new T.BoxGeometry(1.9, 0.95, 1.9), stone, 0, 0.6 + 0.475);
  place(root, new T.BoxGeometry(2.05, 0.08, 2.05), marble, 0, 1.59);
  for (const r of [0, Math.PI / 2])
    place(root, new T.BoxGeometry(2.7, 0.16, 0.42), bronze, 0, 1.71, 0).rotation.y = r;
  for (const [x, z] of [
    [1.35, 0],
    [-1.35, 0],
    [0, 1.35],
    [0, -1.35],
  ]) {
    place(root, new T.CylinderGeometry(0.24, 0.28, 0.16, 12), bronze, x, 1.71, z);
  }
  colliders.push({ x: 0, z: 0, radius: 0, halfX: 0.95, halfZ: 0.95, height: 1.8 });
  // 铜质云纹托座承托子午环。
  const shaft = new T.LatheGeometry(
    [
      [0, 0],
      [0.34, 0],
      [0.3, 0.1],
      [0.2, 0.24],
      [0.22, 0.57],
      [0.18, 0.89],
      [0.26, 1.01],
      [0.34, 1.07],
      [0, 1.07],
    ].map(([x, y]) => new T.Vector2(x, y)),
    16,
  );
  place(root, shaft, bronze, 0, 1.79);
  const scroll = Array.from({ length: 30 }, (_, k) => {
    const t = k / 29,
      a = t * Math.PI * 4.5;
    return new T.Vector3(
      Math.cos(a) * (0.27 + 0.06 * Math.sin(t * 9)),
      1.84 + t * 0.96,
      Math.sin(a) * (0.27 + 0.06 * Math.sin(t * 9)),
    );
  });
  place(root, new T.TubeGeometry(new T.CatmullRomCurve3(scroll), 60, 0.05, 6, false), patina);
  const { y: cy, radius: R } = hubLayout.sphere;
  // 四根龙柱朝向四岛桥梁，承托地平环。
  for (const region of regions) {
    const a = Math.atan2(region.position[0], region.position[1]),
      dx = Math.sin(a),
      dz = Math.cos(a);
    const path = [
      [2.02, 0.6],
      [1.95, 1.6],
      [2.25, 2.8],
      [2.85, 4],
      [3.05, 5.1],
      [R, cy - 0.12],
    ].map(([r, y]) => new T.Vector3(dx * r, y, dz * r));
    const curve = new T.CatmullRomCurve3(path),
      geo = new T.TubeGeometry(curve, 48, 1, 10, false),
      p = geo.attributes.position;
    for (let i = 0; i <= 48; i++) {
      const c = curve.getPointAt(i / 48),
        r = 0.2 - (0.1 * i) / 48;
      for (let j = 0; j <= 10; j++) {
        const k = i * 11 + j;
        p.setXYZ(
          k,
          c.x + (p.getX(k) - c.x) * r,
          c.y + (p.getY(k) - c.y) * r,
          c.z + (p.getZ(k) - c.z) * r,
        );
      }
    }
    geo.computeVertexNormals();
    place(root, geo, patina);
    place(root, new T.CylinderGeometry(0.32, 0.38, 0.18, 12), bronze, dx * 2.02, 0.69, dz * 2.02);
    // 云纹贴合柱身，托环处饰金珠。
    for (const t of [0.28, 0.52, 0.74]) {
      const c = curve.getPointAt(t),
        ring = place(
          root,
          new T.TorusGeometry(0.2, 0.055, 6, 16, Math.PI * 1.4),
          bronze,
          c.x,
          c.y,
          c.z,
        );
      ring.rotation.set(Math.PI / 2, 0, a + t * 4);
    }
    place(root, new T.SphereGeometry(0.17, 14, 10), gold, dx * R, cy + 0.2, dz * R);
    // 区域共鸣灯的托架。
    place(root, new T.BoxGeometry(0.05, 0.05, 0.55), bronze, dx * 2.6, 4.3, dz * 2.6).rotation.y =
      a;
    colliders.push({ x: dx * 2.1, z: dz * 2.1, radius: 0.32, height: 7 });
  }
  // 固定环包括刻度地平环与承托极轴的子午环。
  place(root, band(R, 0.2, 0.12), gold, 0, cy);
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    place(
      root,
      new T.BoxGeometry(0.04, 0.03, k % 3 ? 0.12 : 0.2),
      bronze,
      Math.sin(a) * R,
      cy + 0.075,
      Math.cos(a) * R,
    ).rotation.y = a;
  }
  const meridian = place(root, band(R - 0.02, 0.16, 0.1), gold, 0, cy);
  meridian.rotation.z = Math.PI / 2;
  const axis = new T.Vector3(0, Math.sin(LATITUDE), -Math.cos(LATITUDE));
  const rod = place(root, new T.CylinderGeometry(0.035, 0.035, R * 2, 8), bronze, 0, cy);
  rod.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis);
  for (const s of [-1, 1])
    place(
      root,
      new T.SphereGeometry(0.12, 12, 8),
      gold,
      axis.x * R * s,
      cy + axis.y * R * s,
      axis.z * R * s,
    );
  // 带窥管的赤道环与黄道环绕极轴旋转。
  const turning = new T.Group();
  turning.position.y = cy;
  turning.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), axis);
  turning.userData.dynamic = true;
  turning.name = "armillary-turning";
  root.add(turning);
  place(turning, band(R * 0.88, 0.15, 0.08), bronze);
  const ecliptic = place(turning, band(R * 0.82, 0.12, 0.07), gold);
  ecliptic.rotation.x = (23.4 * Math.PI) / 180;
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    place(
      ecliptic,
      new T.SphereGeometry(0.045, 8, 6),
      patina,
      Math.sin(a) * R * 0.82,
      0.06,
      Math.cos(a) * R * 0.82,
    ).castShadow = false;
  }
  const sight = new T.Group();
  sight.rotation.z = 0.35;
  turning.add(sight);
  const tube = place(sight, new T.CylinderGeometry(0.07, 0.07, R * 1.5, 10), bronze);
  tube.rotation.x = Math.PI / 2;
  place(sight, band(R * 0.74, 0.1, 0.06), bronze).rotation.z = Math.PI / 2;
  // 周边栏杆为各桥与港坡留口，每段末端设置灯柱。
  const openings = [
    ...regions.map((r) => ({ angle: Math.atan2(r.position[1], r.position[0]), half: 2.9 })),
    { angle: Math.PI / 2, half: 2.4 },
  ];
  const gaps = openings
    .map((o) => ({ angle: o.angle, half: Math.asin(o.half / hubLayout.rail) }))
    .sort((p, q) => p.angle - q.angle);
  const railH = 0.95;
  gaps.forEach((gap, i) => {
    const next = gaps[(i + 1) % gaps.length],
      from = gap.angle + gap.half,
      to = next.angle - next.half + (i === gaps.length - 1 ? Math.PI * 2 : 0);
    const count = Math.max(1, Math.round(((to - from) * hubLayout.rail) / 1.55)),
      posts = Array.from({ length: count + 1 }, (_, k) => {
        const a = from + ((to - from) * k) / count;
        return new T.Vector3(Math.cos(a) * hubLayout.rail, 0, Math.sin(a) * hubLayout.rail);
      });
    posts.forEach((p, k) => {
      if (k === 0 || k === count) {
        lantern(root, p.x, p.z, 1.1);
        colliders.push({ x: p.x, z: p.z, radius: 0.42, height: 2.1 });
      } else {
        place(root, new T.BoxGeometry(0.22, railH, 0.22), marble, p.x, railH / 2, p.z).rotation.y =
          -Math.atan2(p.z, p.x);
        place(root, new T.CylinderGeometry(0.1, 0.13, 0.16, 8), marble, p.x, railH + 0.08, p.z);
        place(root, new T.SphereGeometry(0.11, 10, 8), marble, p.x, railH + 0.24, p.z);
      }
      const q = posts[k + 1];
      if (!q) return;
      const mid = p.clone().add(q).multiplyScalar(0.5),
        length = p.distanceTo(q) - 0.2,
        rot = -Math.atan2(q.z - p.z, q.x - p.x);
      place(
        root,
        new T.BoxGeometry(length, 0.12, 0.15),
        marble,
        mid.x,
        railH - 0.12,
        mid.z,
      ).rotation.y = rot;
      place(root, new T.BoxGeometry(length, 0.36, 0.1), marble, mid.x, 0.3, mid.z).rotation.y = rot;
      place(root, new T.BoxGeometry(length, 0.08, 0.2), marble, mid.x, 0.05, mid.z).rotation.y =
        rot;
      for (const s of [-0.25, 0.25]) {
        const v = p.clone().lerp(q, 0.5 + s);
        place(root, new T.CylinderGeometry(0.05, 0.07, 0.35, 6), marble, v.x, 0.66, v.z);
      }
      colliders.push({
        x: mid.x,
        z: mid.z,
        radius: 0.12,
        height: railH + 0.3,
        segment: [p.x, p.z, q.x, q.z],
      });
    });
  });
  // 引导星悬于子午环上方，金色塔刹指向它。
  place(root, new T.ConeGeometry(0.07, 0.65, 8), gold, 0, cy + R + 0.32);
  let time = 0;
  return {
    root,
    colliders,
    update(dt: number) {
      time += dt;
      turning.rotateY(dt * 0.05);
      sight.rotation.y = Math.sin(time * 0.07) * 0.6;
    },
  };
}
/** 保留由中心岛模块导入的材质工具。 */
export const hubStone = () => material("#e7e1d2", 0.86, 0.02, "stone");
export { mesh };
