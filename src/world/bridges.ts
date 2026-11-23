import * as T from "three";
import { bridgeLightSpan } from "../../shared/bridge-joints.mjs";
import { bridgeLayout } from "../../shared/bridge-layout.mjs";
import { kit, place, balustrade } from "./vernacular";
import { nightLight } from "./hub";
import type { Region } from "../core/types";

const DECK_TOP = -0.04,
  DECK = 0.36,
  HALF = 2.8,
  WATER = -5.65;
/** 石拱承托平桥，行走面 y=0 与通道宽度保持原值。 */
export function buildBridge(region: Region) {
  const [x, z] = region.position,
    { distance, length, mid, radius, centres, spring, crown } = bridgeLayout(region);
  const root = new T.Group();
  root.name = `bridge-${region.id}`;
  root.position.set((x / distance) * mid, 0, (z / distance) * mid);
  root.rotation.y = Math.atan2(x, z);
  const stone = kit.stone(),
    marble = kit.marble(),
    dark = kit.stoneDark();
  // 铺石桥面配线脚边板。
  const deck = place(
    root,
    new T.BoxGeometry(HALF * 2, DECK, length),
    kit.stone(),
    0,
    DECK_TOP - DECK / 2,
    0,
  );
  deck.name = "bridge-deck";
  for (const s of [-1, 1]) {
    place(root, new T.BoxGeometry(0.16, 0.2, length), marble, s * (HALF + 0.02), DECK_TOP - 0.1, 0);
    place(
      root,
      new T.BoxGeometry(0.1, 0.12, length),
      dark,
      s * (HALF - 0.02),
      DECK_TOP - DECK - 0.06,
      0,
    );
  }
  const seams = kit.stoneDark();
  for (let p = -length / 2 + 0.9; p < length / 2 - 0.6; p += 1.8)
    place(
      root,
      new T.BoxGeometry(HALF * 2 - 0.4, 0.008, 0.035),
      seams,
      0,
      DECK_TOP + 0.002,
      p,
    ).castShadow = false;
  // 拱上墙留出拱洞，桥台嵌入岛壁。
  const pier = 1.05,
    count = centres.length,
    bottom = WATER - 1.4;
  const wall = new T.Shape();
  wall.moveTo(-length / 2, bottom);
  wall.lineTo(length / 2, bottom);
  wall.lineTo(length / 2, DECK_TOP - DECK);
  wall.lineTo(-length / 2, DECK_TOP - DECK);
  wall.closePath();
  for (let i = 0; i < count; i++) {
    const c = centres[i];
    const hole = new T.Path();
    hole.moveTo(c - radius, bottom + 0.4);
    hole.lineTo(c - radius, spring);
    hole.absarc(c, spring, radius, Math.PI, 0, true);
    hole.lineTo(c + radius, bottom + 0.4);
    hole.closePath();
    wall.holes.push(hole);
  }
  const wallGeometry = new T.ExtrudeGeometry(wall, {
    depth: 0.5,
    bevelEnabled: false,
    curveSegments: 24,
  });
  wallGeometry.rotateY(Math.PI / 2);
  for (const s of [-1, 1]) place(root, wallGeometry, stone, s > 0 ? HALF - 0.5 : -HALF, 0, 0);
  // 桶形拱顶与两面凸出的券石环。
  const vault = kit.stoneDark().clone();
  vault.side = T.DoubleSide;
  for (const c of centres) {
    const barrel = place(
      root,
      new T.CylinderGeometry(radius, radius, HALF * 2 - 0.9, 24, 1, true, 0, Math.PI),
      vault,
      0,
      spring,
      c,
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.castShadow = false;
    const ring = new T.Shape();
    ring.absarc(0, 0, radius + 0.32, 0, Math.PI, false);
    ring.lineTo(-radius, 0);
    ring.absarc(0, 0, radius, Math.PI, 0, true);
    ring.closePath();
    const voussoir = new T.ExtrudeGeometry(ring, {
      depth: 0.06,
      bevelEnabled: false,
      curveSegments: 20,
    });
    voussoir.rotateY(Math.PI / 2);
    for (const s of [-1, 1])
      place(root, voussoir, marble, s > 0 ? HALF + 0.005 : -HALF - 0.065, spring, c);
    // 拱顶石。
    for (const s of [-1, 1])
      place(root, new T.BoxGeometry(0.12, 0.46, 0.34), marble, s * (HALF + 0.04), crown + 0.16, c);
  }
  // 桥墩迎水尖端分流。
  for (let i = 0; i < count - 1; i++) {
    const pz = centres[i] + radius + pier / 2;
    for (const s of [-1, 1]) {
      const cut = place(
        root,
        new T.BoxGeometry(0.78, spring - WATER + 0.9, 0.78),
        stone,
        s * (HALF + 0.12),
        (spring + WATER - 0.9) / 2 - 0.15,
        pz,
      );
      cut.rotation.y = Math.PI / 4;
      const cap = place(
        root,
        new T.ConeGeometry(0.6, 0.5, 4),
        marble,
        s * (HALF + 0.12),
        spring - 0.15 + 0.25,
        pz,
      );
      cap.rotation.y = Math.PI / 4;
    }
  }
  // 栏杆止于桥头前，灯柱沿栏杆排列，位于 2.5 米通道外。
  const line = bridgeLightSpan(distance, region.radius),
    run = line.length,
    offset = line.mid - mid,
    glow = nightLight("#f3c77a");
  for (const s of [-1, 1]) {
    balustrade(root, run, {
      x: s * 2.74,
      y: DECK_TOP,
      z: offset,
      rotation: Math.PI / 2,
      spacing: 1.55,
    });
    for (const t of [0, 1]) pillar(root, s * 2.76, offset - run / 2 + t * run, glow);
    for (let p = offset - run / 2 + 5.2; p < offset + run / 2 - 2.5; p += 5.2)
      pillar(root, s * 2.76, p, glow);
  }
  return root;
}
function pillar(root: T.Object3D, x: number, z: number, glow: T.Material) {
  const s = kit.marble();
  place(root, new T.BoxGeometry(0.34, 1.32, 0.34), s, x, DECK_TOP + 0.66, z);
  place(root, new T.BoxGeometry(0.42, 0.08, 0.42), s, x, DECK_TOP + 1.36, z);
  place(root, new T.BoxGeometry(0.24, 0.3, 0.24), glow, x, DECK_TOP + 1.55, z).castShadow = false;
  for (const [dx, dz] of [
    [-0.12, -0.12],
    [0.12, -0.12],
    [-0.12, 0.12],
    [0.12, 0.12],
  ])
    place(root, new T.BoxGeometry(0.04, 0.32, 0.04), s, x + dx, DECK_TOP + 1.55, z + dz);
  place(root, new T.ConeGeometry(0.3, 0.26, 4), kit.stoneDark(), x, DECK_TOP + 1.84, z).rotation.y =
    Math.PI / 4;
  place(root, new T.SphereGeometry(0.06, 8, 6), s, x, DECK_TOP + 2, z);
}
