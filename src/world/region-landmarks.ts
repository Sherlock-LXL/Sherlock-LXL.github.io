import * as T from "three";
import { kit, place, roof, column, beam, balustrade, lantern, paintedTree } from "./vernacular";
import type { Region } from "../core/types";
import type { Obstacle } from "./scenery";

export type RegionLandmark = { root: T.Group; colliders: Obstacle[] };

/** 配套建筑保持次要地位，各岛项目展品作为主要地标。 */
export function regionLandmark(region: Region): RegionLandmark | null {
  const root = new T.Group();
  root.name = `landmark-${region.id}`;
  if (region.id === "science-valley") return { root, colliders: scienceLandmark(root) };
  if (region.id === "personal-museum") return { root, colliders: museumLandmark(root) };
  return null;
}
/** 四棱台沿坐标轴定向，半宽按对面间距计算。 */
const frustum = (top: number, bottom: number, height: number) =>
  new T.CylinderGeometry(top * Math.SQRT2, bottom * Math.SQRT2, height, 4, 1).rotateY(Math.PI / 4);
/** 铜钟轮廓包含钟肩、钟腰与外展钟口。 */
const bell = new T.LatheGeometry(
  [
    [0, 0.9],
    [0.2, 0.9],
    [0.3, 0.82],
    [0.33, 0.6],
    [0.36, 0.3],
    [0.44, 0.06],
    [0.46, 0],
    [0.4, 0],
    [0, 0.02],
  ].map(([r, h]) => new T.Vector2(r, h)),
  20,
);

/** 观星台为带测量缝的收分砖塔，屋顶平台放置铜仪器。 */
function scienceLandmark(root: T.Group): Obstacle[] {
  const tower = new T.Group();
  tower.position.set(0, 0, -10.8);
  root.add(tower);
  const brick = kit.brick(),
    stone = kit.stone(),
    snow = kit.paper(),
    bronze = kit.bronze(),
    patina = kit.patina();
  place(tower, frustum(2.75, 2.85, 0.3), stone, 0, 0.15);
  // 收分砖体分为两侧，为朝岛方向留出子午缝。
  for (const s of [-1, 1]) {
    const half = new T.Group();
    half.position.x = s * 1.27;
    tower.add(half);
    place(half, frustum(2.15, 2.3, 4.1), brick, 0, 0.3 + 2.05).scale.x = 0.5;
    for (let k = 0; k < 5; k++) {
      const y = 1.05 + k * 0.75,
        t = (y - 0.3) / 4.1;
      place(
        half,
        new T.BoxGeometry(2 * (1.15 - 0.075 * t) + 0.06, 0.06, 2 * (2.3 - 0.15 * t) + 0.06),
        stone,
        0,
        y,
      ).castShadow = false;
    }
  }
  place(tower, new T.BoxGeometry(0.4, 4.1, 4), kit.stoneDark(), 0, 2.35, -0.3);
  // 屋顶平台配低矮女墙，积雪沿边缘分布。
  place(tower, new T.BoxGeometry(5.1, 0.18, 4.9), stone, 0, 4.49);
  place(tower, new T.BoxGeometry(5.06, 0.05, 4.86), snow, 0, 4.6);
  for (const [x, z, w, d] of [
    [0, 2.38, 5.1, 0.18],
    [0, -2.38, 5.1, 0.18],
    [2.48, 0, 0.18, 4.6],
    [-2.48, 0, 0.18, 4.6],
  ])
    place(tower, new T.BoxGeometry(w, 0.5, d), brick, x, 4.83, z);
  // 仪器记录室的屋檐覆盖积雪。
  const room = new T.Group();
  room.position.set(-1.25, 4.62, -1.1);
  tower.add(room);
  for (const x of [-0.7, 0.7])
    for (const z of [-0.55, 0.55]) column(room, x, z, 1.4, 0.08, kit.lacquer());
  place(room, new T.BoxGeometry(1.3, 1.1, 0.06), kit.lattice(), 0, 0.75, 0.52);
  place(room, new T.BoxGeometry(1.4, 1.2, 0.06), kit.plaster(), 0, 0.75, -0.55);
  beam(room, 1.7, 0, 1.62, 0.55, 0, 0.16, 0.12);
  beam(room, 1.7, 0, 1.62, -0.55, 0, 0.16, 0.12);
  roof(room, {
    width: 1.6,
    depth: 1.3,
    height: 0.55,
    overhang: 0.35,
    lift: 0.18,
    y: 1.7,
    material: kit.tileSnow(),
  });
  // 简仪由赤道环、赤纬环与龙足铜架组成。
  const inst = new T.Group();
  inst.position.set(1.15, 4.62, 0.35);
  tower.add(inst);
  for (const s of [-1, 1]) {
    place(inst, new T.BoxGeometry(0.14, 0.12, 1.6), bronze, s * 0.6, 0.06, 0);
    const leg = place(
      inst,
      new T.CylinderGeometry(0.04, 0.06, 1.15, 8),
      patina,
      s * 0.6,
      0.6,
      -0.55,
    );
    leg.rotation.x = 0.35;
  }
  const polar = new T.Group();
  polar.position.y = 1.05;
  polar.rotation.x = -0.7;
  inst.add(polar);
  for (const [r, rot] of [
    [0.62, 0],
    [0.55, Math.PI / 2],
  ] as [number, number][]) {
    const ring = place(polar, new T.TorusGeometry(r, 0.035, 6, 40), bronze);
    ring.rotation.y = rot;
  }
  place(polar, new T.CylinderGeometry(0.025, 0.025, 1.5, 6), kit.gold());
  // 四脚架上的天球仪。
  const globe = new T.Group();
  globe.position.set(-1.2, 4.62, 1.15);
  tower.add(globe);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const leg = place(
      globe,
      new T.CylinderGeometry(0.035, 0.05, 0.7, 6),
      patina,
      Math.cos(a) * 0.35,
      0.35,
      Math.sin(a) * 0.35,
    );
    leg.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
  }
  place(globe, new T.TorusGeometry(0.48, 0.04, 6, 32), bronze, 0, 0.72).rotation.x = Math.PI / 2;
  place(globe, new T.SphereGeometry(0.42, 24, 16), kit.azurite(), 0, 0.82);
  const meridian = place(globe, new T.TorusGeometry(0.47, 0.025, 6, 32), kit.gold(), 0, 0.82);
  meridian.rotation.y = 0.4;
  // 仪器门采用暖木色。
  place(tower, new T.BoxGeometry(1.26, 1.86, 0.14), stone, 0, 1.2, 2.31);
  for (const side of [-1, 1]) {
    place(tower, new T.BoxGeometry(0.48, 1.58, 0.08), kit.timberLight(), side * 0.255, 1.16, 2.42);
    for (const y of [0.68, 1.16, 1.64])
      place(
        tower,
        new T.BoxGeometry(0.42, 0.035, 0.025),
        kit.gold(),
        side * 0.255,
        y,
        2.47,
      ).castShadow = false;
    place(tower, new T.SphereGeometry(0.035, 8, 6), bronze, side * 0.08, 1.16, 2.48).castShadow =
      false;
  }
  place(tower, new T.BoxGeometry(1.42, 0.16, 0.2), stone, 0, 2.09, 2.36);
  place(tower, new T.BoxGeometry(1.32, 0.12, 0.34), kit.marble(), 0, 0.31, 2.39);
  for (const x of [-1.1, 1.1]) lantern(tower, x, 3.15, 0.8);
  return [{ x: 0, z: -10.8, radius: 3.55, height: 5.8 }];
}

/** 钟楼由盲拱砖基、木质钟层与重檐顶组成。 */
function museumLandmark(root: T.Group): Obstacle[] {
  const tower = new T.Group();
  tower.position.set(0, 0, -13);
  root.add(tower);
  const brick = kit.brick(),
    stone = kit.stone();
  place(tower, new T.CylinderGeometry(2.42, 2.55, 0.16, 8), stone, 0, 0.08).rotation.y =
    Math.PI / 8;
  place(tower, frustum(1.3, 1.38, 3), brick, 0, 0.16 + 1.5);
  place(tower, new T.BoxGeometry(2.72, 0.12, 2.72), stone, 0, 3.12);
  // 各面圆头盲拱采用深墨色凹面，背部收于砖墙内。
  const dark = kit.ink(),
    head = new T.CylinderGeometry(0.45, 0.45, 0.14, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(
      -Math.PI / 2,
    );
  for (let i = 0; i < 4; i++) {
    const face = new T.Group();
    face.rotation.y = (i * Math.PI) / 2;
    tower.add(face);
    place(face, new T.BoxGeometry(0.9, 1.2, 0.14), dark, 0, 0.76, 1.36);
    place(face, head, dark, 0, 1.36, 1.36);
    place(face, new T.BoxGeometry(1.14, 0.1, 0.1), stone, 0, 0.12, 1.4);
  }
  // 裙檐衔接砖木，钟层粉墙穿过檐面。
  roof(tower, {
    width: 2.6,
    depth: 2.6,
    height: 0.42,
    overhang: 0.5,
    lift: 0.22,
    y: 3.24,
    thickness: 0.1,
  });
  place(tower, new T.BoxGeometry(2.2, 0.46, 2.2), kit.plaster(), 0, 3.4);
  // 钟层由漆柱、栏杆与开间中可见的铜钟组成。
  const storey = new T.Group();
  storey.position.y = 3.62;
  tower.add(storey);
  place(storey, new T.BoxGeometry(2.3, 0.14, 2.3), kit.timber(), 0, 0.07);
  for (const x of [-0.95, 0.95])
    for (const z of [-0.95, 0.95]) column(storey, x, z, 1.9, 0.1, kit.lacquer(), 0.14);
  for (const [x, z, r] of [
    [0, 1.02, 0],
    [0, -1.02, 0],
    [1.02, 0, Math.PI / 2],
    [-1.02, 0, Math.PI / 2],
  ] as [number, number, number][]) {
    balustrade(storey, 1.5, {
      x,
      z,
      y: 0.14,
      rotation: r,
      height: 0.5,
      spacing: 0.75,
      material: kit.timber(),
    });
    beam(storey, 2.2, x, 2.12, z, r, 0.2, 0.14);
  }
  place(storey, new T.BoxGeometry(0.08, 0.5, 0.08), kit.timber(), 0, 1.85, 0);
  place(storey, bell, kit.bronze(), 0, 0.95, 0);
  place(storey, new T.BoxGeometry(1.9, 0.08, 0.08), kit.timber(), 0, 1.9, 0);
  roof(storey, {
    width: 2.1,
    depth: 2.1,
    height: 1.1,
    overhang: 0.55,
    lift: 0.32,
    y: 2.24,
    material: kit.tileGold(),
    finial: true,
  });
  for (const x of [-3.4, 3.4]) paintedTree(root, x, -13, 1, "maple");
  return [
    { x: 0, z: -13, radius: 0, halfX: 1.35, halfZ: 1.35, height: 10.3 },
    { x: -3.4, z: -13, radius: 0.3, height: 3.8 },
    { x: 3.4, z: -13, radius: 0.3, height: 3.8 },
  ];
}
