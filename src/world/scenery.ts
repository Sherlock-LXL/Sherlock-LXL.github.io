import * as T from "three";
import { material, mesh, tree, softBox } from "./architecture";
import type { Exhibit, Region } from "../core/types";
import { onRegionRoute } from "../../shared/region-routes.mjs";
import { shoreLayout } from "../../shared/shore-layout.mjs";
import { flowerDrifts, type FlowerPoint } from "./garden-details";
import { seasonalColors, palm } from "./season-style";
import {
  kit,
  place,
  beam,
  roof,
  lantern,
  paifang,
  drumStone,
  drumStool,
  fenceSection,
  scholarRock,
  paintedTree,
} from "./vernacular";
import { pigmentAccent } from "./ink";
export type Obstacle = {
  x: number;
  z: number;
  radius: number;
  halfX?: number;
  halfZ?: number;
  height?: number;
  base?: number;
  ellipse?: boolean;
  surface?: boolean;
  segment?: [number, number, number, number];
};
const cube = (g: T.Object3D, m: T.Material, w: number, h: number, d: number, x = 0, y = 0, z = 0) =>
  mesh(g, softBox(w, h, d), m, x, y, z);
const serif =
  '"Songti SC","STSong","Noto Serif CJK SC","Source Han Serif SC","SimSun","Times New Roman",serif';
const sans = '"PingFang SC","Microsoft YaHei UI","Microsoft YaHei","Segoe UI",sans-serif';
/** 各岛标牌采用对应季节印记。 */
const seals: Record<string, string> = {
  "#ebbdcf": "春",
  "#cbdde9": "冬",
  "#e3c385": "秋",
  "#acd9c5": "夏",
};
let frameMaterial: T.Material | undefined;
const frame = () => (frameMaterial ??= material("#3d3029", 0.72, 0.02, "wood"));

/** 漆框旧纸题签配岛屿色线与朱印。 */
export function sign(
  g: T.Object3D,
  title: string,
  subtitle: string,
  color: string,
  width = 2.3,
  height = 0.8,
) {
  const canvas = document.createElement("canvas");
  const w = 1536;
  canvas.width = w;
  canvas.height = Math.max(192, Math.round((w * height) / width));
  const ctx = canvas.getContext("2d")!,
    h = canvas.height,
    accent = pigmentAccent(color),
    seal = seals["#" + new T.Color(color).getHexString()];
  ctx.fillStyle = "#f1e8d4";
  ctx.fillRect(0, 0, w, h);
  let seed = title.length * 131 + h;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let i = 0; i < 240; i++) {
    ctx.strokeStyle = `rgba(122,96,58,${0.025 + random() * 0.04})`;
    ctx.lineWidth = 1 + random() * 2.2;
    const x = random() * w,
      y = random() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 24 + random() * 70, y + (random() - 0.5) * 5);
    ctx.stroke();
  }
  const inset = Math.min(h * 0.075, w * 0.018);
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(3, h * 0.02);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.lineWidth = Math.max(1.5, h * 0.007);
  ctx.strokeRect(inset * 1.75, inset * 1.75, w - inset * 3.5, h - inset * 3.5);
  const stamp = seal && w / h > 2.4 && height >= 0.5 ? h * 0.34 : 0,
    left = inset * 1.75 + w * 0.035,
    room = w - left - inset * 1.75 - (stamp ? stamp + w * 0.05 : w * 0.03);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const write = (
    text: string,
    size: number,
    y: number,
    weight: number,
    fill: string,
    font: string,
  ) => {
    ctx.font = `${weight} ${size}px ${font}`;
    size *= Math.min(1, room / Math.max(1, ctx.measureText(text).width));
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = fill;
    ctx.fillText(text, left, y);
  };
  write(title, h * (subtitle ? 0.3 : 0.43), h * (subtitle ? 0.4 : 0.52), 600, "#2b2824", serif);
  if (subtitle) write(subtitle, h * 0.165, h * 0.735, 400, "#5d5447", sans);
  if (stamp) {
    const x = w - inset * 1.75 - w * 0.03 - stamp,
      y = (h - stamp) / 2;
    ctx.fillStyle = "#b23e2c";
    ctx.fillRect(x, y, stamp, stamp);
    ctx.strokeStyle = "#f1e8d4";
    ctx.lineWidth = stamp * 0.05;
    ctx.strokeRect(x + stamp * 0.1, y + stamp * 0.1, stamp * 0.8, stamp * 0.8);
    ctx.fillStyle = "#f6eedc";
    ctx.textAlign = "center";
    ctx.font = `700 ${stamp * 0.6}px ${serif}`;
    ctx.fillText(seal, x + stamp / 2, y + stamp * 0.53);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.name = "clear-sign-text";
  const plaque = new T.Group();
  plaque.name = "solid-sign";
  plaque.userData = { title, subtitle };
  g.add(plaque);
  cube(plaque, frame(), width + 0.1, height + 0.1, 0.14);
  const ink = new T.MeshBasicMaterial({ map: texture, toneMapped: false });
  for (const side of [-1, 1]) {
    const face = mesh(plaque, new T.PlaneGeometry(width, height), ink, 0, 0, side * 0.076);
    face.rotation.y = side === 1 ? 0 : Math.PI;
    face.castShadow = false;
  }
  return plaque;
}
/** 告示牌由石脚、木柱、撑梁、小屋顶与悬挂纸签组成。 */
export function terminal(title: string, color: string, subtitle = "F  /  OPEN EXPERIENCE") {
  const g = new T.Group();
  place(g, new T.BoxGeometry(0.66, 0.22, 0.46), kit.stone(), 0, 0.11, -0.14);
  place(g, new T.BoxGeometry(0.74, 0.06, 0.54), kit.marble(), 0, 0.25, -0.14);
  const post = place(
    g,
    new T.BoxGeometry(0.15, 1.615, 0.15),
    kit.timber(),
    0,
    0.28 + 1.615 / 2,
    -0.145,
  );
  post.name = "terminal-post";
  for (const s of [-1, 1]) {
    const strut = place(
      g,
      new T.BoxGeometry(0.56, 0.07, 0.07),
      kit.timber(),
      s * 0.24,
      1.76,
      -0.145,
    );
    strut.rotation.z = s * 0.55;
  }
  beam(g, 2, 0, 1.97, -0.12, 0, 0.15, 0.16);
  roof(g, {
    width: 1.9,
    depth: 0.26,
    height: 0.22,
    overhang: 0.22,
    lift: 0.08,
    thickness: 0.05,
    y: 2.045,
    z: -0.12,
  });
  for (const s of [-1, 1])
    place(
      g,
      new T.CylinderGeometry(0.014, 0.014, 0.18, 5),
      kit.bronze(),
      s * 0.62,
      1.805,
      -0.05,
    ).castShadow = false;
  const board = sign(g, title, subtitle, color, 1.7, 0.69);
  board.position.y = 1.32;
  return g;
}
function flowerBed(g: T.Group, color: string) {
  const bed = new T.Group();
  bed.position.set(-5, 0, 11);
  bed.rotation.y = Math.PI / 8;
  g.add(bed);
  // 八角石盆的边沿与土壤错开，避免顶面共面。
  mesh(bed, new T.CylinderGeometry(1.25, 1.35, 0.28, 8), kit.stone(), 0, 0.14);
  mesh(bed, new T.CylinderGeometry(1.31, 1.31, 0.05, 8), kit.marble(), 0, 0.295);
  mesh(bed, new T.CylinderGeometry(1.13, 1.13, 0.04, 8), kit.soil(), 0, 0.33);
  const petals = new T.InstancedMesh(
    new T.SphereGeometry(1, 10, 8),
    material("#ffffff", 0.8, 0),
    88,
  );
  const stems = new T.InstancedMesh(
    new T.CylinderGeometry(0.016, 0.023, 1, 6),
    material("#5f7f5c"),
    11,
  );
  const transform = new T.Object3D();
  let index = 0;
  for (let i = 0; i < 11; i++) {
    const a = i * 2.4,
      r = 0.22 + Math.sqrt(i) * 0.22,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r,
      h = 0.35 + (i % 3) * 0.1;
    transform.position.set(x, 0.35 + h / 2, z);
    transform.scale.set(1, h, 1);
    transform.rotation.set(0, 0, 0);
    transform.updateMatrix();
    stems.setMatrixAt(i, transform.matrix);
    for (let n = 0; n < 8; n++) {
      const theta = (n * Math.PI * 2) / 5;
      if (n < 5) {
        transform.position.set(x + Math.cos(theta) * 0.115, 0.35 + h, z + Math.sin(theta) * 0.115);
        transform.scale.set(0.14, 0.055, 0.09);
        transform.rotation.set(0, -theta, 0);
      } else if (n === 5) {
        transform.position.set(x, 0.38 + h, z);
        transform.scale.set(0.07, 0.06, 0.07);
      } else {
        const side = n === 6 ? -1 : 1;
        transform.position.set(x + side * 0.095, 0.44, z);
        transform.scale.set(0.16, 0.035, 0.06);
        transform.rotation.set(0, side * 0.6, side * 0.4);
      }
      transform.updateMatrix();
      petals.setMatrixAt(index, transform.matrix);
      petals.setColorAt(
        index++,
        new T.Color(
          n === 5
            ? "#dcb04c"
            : n > 5
              ? "#6f9a6c"
              : i % 3 === 0
                ? "#e6a0ad"
                : i % 3 === 1
                  ? "#f3ead6"
                  : pigmentAccent(color),
        ),
      );
    }
  }
  petals.castShadow = true;
  petals.receiveShadow = true;
  bed.add(petals, stems);
}
/** 石座木椅配靠背、后方花盆，以及书和茶。 */
function restCorner(g: T.Group, x: number, flowers: FlowerPoint[]) {
  for (const leg of [-0.8, 0.8])
    place(g, new T.BoxGeometry(0.5, 0.47, 0.58), kit.stone(), x + leg, 0.235, 9);
  place(g, new T.BoxGeometry(2.4, 0.1, 0.62), kit.timberLight(), x, 0.52, 9);
  // 靠背柱、栏条与顶梁绕座边共同倾斜。
  const back = new T.Group();
  back.name = "bench-back";
  back.position.set(x, 0.54, 9.27);
  back.rotation.x = 0.25;
  g.add(back);
  for (let i = 0; i < 10; i++)
    place(back, new T.BoxGeometry(0.035, 0.44, 0.035), kit.timber(), -1.08 + i * 0.24, 0.22, 0);
  place(back, new T.BoxGeometry(2.4, 0.08, 0.09), kit.timber(), 0, 0.44, 0);
  for (const side of [-1, 1])
    place(back, new T.BoxGeometry(0.08, 0.54, 0.08), kit.timber(), side * 1.16, 0.2, 0);
  const planter = place(g, new T.BoxGeometry(1.6, 0.5, 1.2), kit.stone(), x, 0.25, 11);
  planter.castShadow = false;
  place(g, new T.BoxGeometry(1.72, 0.09, 1.32), kit.marble(), x, 0.52, 11);
  place(g, new T.BoxGeometry(1.45, 0.04, 1.05), kit.soil(), x, 0.57, 11);
  for (let n = 0; n < 18; n++)
    flowers.push({
      x: x + Math.sin(n * 2.4) * (0.15 + Math.sqrt(n) * 0.12),
      y: 0.6,
      z: 11 + Math.cos(n * 2.4) * 0.4,
    });
  // 线装书以靛蓝书板夹住纸页。
  const indigo = material("#34495a", 0.85, 0, "wood");
  for (let page = 0; page < 3; page++) {
    const book = place(
      g,
      new T.BoxGeometry(0.46, 0.045, 0.32),
      page % 2 ? kit.paper() : indigo,
      x - 0.65,
      0.5925 + page * 0.045,
      9,
    );
    book.rotation.y = 0.12 + page * 0.05;
  }
  const cup = teacup();
  cup.position.set(x + 0.8, 0.57, 9);
  g.add(cup);
}
export function dressRegion(region: Region, exhibits: Exhibit[], obstacles: Obstacle[]) {
  const g = new T.Group();
  const [rx, rz] = region.position;
  g.position.set(rx, 0, rz);
  const gardenFlowers: FlowerPoint[] = [];
  // 地面物件的碰撞高度匹配雕塑范围，允许飞行越过树木、灯与门。
  const block = (x: number, z: number, radius: number, height?: number) =>
    obstacles.push({
      x: rx + x,
      z: rz + z,
      radius,
      height: height ?? new T.Box3().setFromObject(g.children.at(-1)!).max.y,
    });
  const onPath = (x: number, z: number, margin = 0) =>
    onRegionRoute(x, z, region, exhibits, margin);
  const nearDiscovery = (x: number, z: number) =>
    !!region.discovery &&
    Math.hypot(x - region.discovery.position[0], z - region.discovery.position[1]) < 3.1;
  if (region.season !== "winter" && !onPath(-5, 11, 1.5)) {
    flowerBed(g, region.color);
    block(-5, 11, 1.25, 0.85);
  }
  // 到达花园后方可选布置雕花鼓石路径。
  for (const [i, x, z, h] of [
    [0, -3.8, 13.1, 0.28],
    [1, -1.8, 14.2, 0.5],
    [2, 0.4, 14.5, 0.76],
    [3, 2.6, 13.8, 0.46],
  ]) {
    if (onPath(x, z, 1)) continue;
    drumStool(g, x, z, 0.72, h + 0.035, i % 2 ? kit.marble() : kit.stone());
    block(x, z, 0.8, h + 0.035);
  }
  // 路径由 terrain.ts 绘制，此组仅含凸起陈设。
  for (const x of [-3.2, 3.2]) {
    if (onPath(x, 10, 0.4) || nearDiscovery(x, 10)) continue;
    lantern(g, x, 10);
    block(x, 10, 0.25);
  }
  if (!region.arrivalPath) {
    const distance = Math.hypot(rx, rz),
      gx = (-rx / distance) * (region.radius - 2),
      gz = (-rz / distance) * (region.radius - 2),
      rotation = Math.atan2(-rx, -rz);
    const arch = paifang(g, 6.2, 4.2, {
      x: gx,
      z: gz,
      rotation,
      tiles: region.season === "winter" ? kit.tileSnow() : kit.tile(),
    });
    const entrance = sign(
      arch.group,
      region.title,
      region.scenery === "laboratory" ? "观察 · 建模 · 探索" : "",
      region.color,
      3,
      0.62,
    );
    entrance.position.set(0, arch.plaqueY, 0);
    for (const x of [-3.1, 3.1])
      for (const z of [0, -0.58, 0.58]) {
        const p = new T.Vector3(x, 0, z)
          .applyAxisAngle(new T.Vector3(0, 1, 0), rotation)
          .add(new T.Vector3(gx, 0, gz));
        block(p.x, p.z, z ? 0.26 : 0.3, z ? 1 : undefined);
      }
  }
  const fence =
    region.season === "winter" ? "stone" : region.season === "summer" ? "bamboo" : "timber";
  // 外围花木、灯与围栏避开径向桥梁。
  for (const entry of shoreLayout(region, exhibits)) {
    const {
      angle: a,
      fence: { x, z },
      plant,
      index: i,
    } = entry;
    if (plant && !onPath(plant.x, plant.z, 1.6) && !nearDiscovery(plant.x, plant.z)) {
      if (entry.kind === "lamp") {
        lantern(g, plant.x, plant.z, 0.9);
        block(plant.x, plant.z, 0.25);
      } else {
        const foliage = region.season
          ? seasonalColors[region.season].trees[i % 3]
          : i % 5 === 0
            ? "#edc2ce"
            : "#5d8d63";
        if (region.season === "summer") palm(g, plant.x, plant.z, 0.9 + (i % 3) * 0.12);
        else tree(g, plant.x, plant.z, 0.8 + (i % 3) * 0.24, foliage);
        block(plant.x, plant.z, 0.25);
      }
    }
    if (!entry.fenceClear || onPath(x, z, 1.1)) continue;
    const run = fenceSection(g, 1.5, fence);
    run.position.set(x, 0, z);
    run.rotation.y = -a;
  }
  for (const x of [-10, 10]) {
    if (onPath(x, 9, 1.7) || onPath(x, 11, 1.7)) continue;
    restCorner(g, x, gardenFlowers);
    obstacles.push({ x: rx + x, z: rz + 9, radius: 0, halfX: 1.25, halfZ: 0.4, height: 0.72 });
    obstacles.push({ x: rx + x, z: rz + 11, radius: 0, halfX: 0.8, halfZ: 0.6, height: 0.95 });
  }
  g.add(flowerDrifts(gardenFlowers));
  const themes: Record<string, () => void> = {
    woodland: () => {
      // 花树与立式赏石组成园景。
      for (let i = 0; i < 16; i++) {
        const x = Math.sin(i * 4) * 13,
          z = Math.cos(i * 4) * 12;
        if (
          exhibits.some((m) => Math.hypot(x - m.position[0], z - m.position[1]) < 5) ||
          Math.abs(x) < 3 ||
          onPath(x, z, 1.2)
        )
          continue;
        if (i % 3 === 0) {
          scholarRock(g, x, z, 1.2 + (i % 2) * 0.4);
          block(x, z, 0.45);
        } else {
          paintedTree(g, x, z, 0.85, i % 2 ? "blossom" : "pine");
          block(x, z, 0.25);
        }
      }
    },
    laboratory: () => {
      // 观测台由 region-landmarks 构建，前庭保持开放。
    },
    museum: () => {
      // 两侧鼓石标示前庭入口。
      for (const x of [-3, 3]) {
        drumStone(g, x, 7, Math.PI / 2);
        block(x, 7, 0.35, 1);
      }
    },
    studio: () => {},
  };
  (themes[region.scenery] ?? themes.woodland)();
  return g;
}
export function teacup() {
  const cup = new T.Group();
  cup.name = "teacup";
  const ceramic = kit.celadon();
  const profile = [
    [0, 0.012],
    [0.06, 0.012],
    [0.068, 0.02],
    [0.087, 0.18],
    [0.084, 0.195],
    [0.073, 0.195],
    [0.07, 0.18],
    [0.055, 0.034],
    [0, 0.034],
  ].map(([x, y]) => new T.Vector2(x, y));
  mesh(cup, new T.LatheGeometry(profile, 32), ceramic);
  // C 形把手位于 XY 平面，两端嵌入侧壁。
  const curve = new T.CatmullRomCurve3(
    [
      [0.079, 0.164, 0],
      [0.15, 0.17, 0],
      [0.176, 0.105, 0],
      [0.144, 0.049, 0],
      [0.068, 0.052, 0],
    ].map((p) => new T.Vector3(...p)),
  );
  mesh(cup, new T.TubeGeometry(curve, 24, 0.013, 8, false), ceramic).name = "cup-handle";
  const tea = mesh(cup, new T.CircleGeometry(0.071, 32), material("#8a7a44", 0.25, 0), 0, 0.159);
  tea.rotation.x = -Math.PI / 2;
  tea.castShadow = false;
  mesh(cup, new T.CylinderGeometry(0.125, 0.11, 0.012, 32), ceramic, 0, 0.006);
  return cup;
}

export function clouds() {
  const cloud = new T.InstancedMesh(new T.SphereGeometry(1, 16, 12), material("#fff6ee", 1, 0), 48);
  const transform = new T.Object3D();
  let index = 0;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6,
      r = 70 + (i % 3) * 9;
    for (let n = 0; n < 4; n++) {
      transform.position.set(
        Math.cos(a) * r + n * 2.2,
        18 + (i % 4) * 4 + (n % 2) * 0.9,
        Math.sin(a) * r,
      );
      transform.scale.set(3.6, 1.1 + (n % 2) * 0.7, 2.4);
      transform.updateMatrix();
      cloud.setMatrixAt(index++, transform.matrix);
    }
  }
  cloud.instanceMatrix.needsUpdate = true;
  return cloud;
}
