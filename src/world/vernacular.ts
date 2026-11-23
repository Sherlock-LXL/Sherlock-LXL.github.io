import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { surfaceMaterial } from "./surfaces";
import { pigment } from "./ink";

/** 共用建筑元素包含台基、柱、斗拱带、瓦顶、栏杆与灯。 */
export const place = (
  parent: T.Object3D,
  geo: T.BufferGeometry,
  mat: T.Material,
  x = 0,
  y = 0,
  z = 0,
) => {
  const m = new T.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
};
const cache = new Map<string, T.Material>();
const shared = <M extends T.Material>(key: string, make: () => M) => {
  let m = cache.get(key);
  if (!m) {
    m = make();
    cache.set(key, m);
  }
  return m as M;
};

export const kit = {
  stone: () => shared("stone", () => surfaceMaterial(pigment.stone, 0.92, 0.02, "stone")),
  marble: () => shared("marble", () => surfaceMaterial("#edf0e5", 0.86, 0.02, "stone")),
  stoneDark: () =>
    shared("stone-dark", () => surfaceMaterial(pigment.stoneDeep, 0.95, 0.02, "stone")),
  plaster: () => shared("plaster", () => surfaceMaterial("#f6f2e6", 0.95, 0, "plaster")),
  lacquer: () => shared("lacquer", () => surfaceMaterial(pigment.cinnabar, 0.58, 0.02, "wood")),
  timber: () => shared("timber", () => surfaceMaterial(pigment.timber, 0.85, 0.02, "wood")),
  timberLight: () => shared("timber-light", () => surfaceMaterial("#c6a67d", 0.82, 0.02, "wood")),
  bronze: () => shared("bronze", () => surfaceMaterial("#9a7442", 0.5, 0.34, "metal")),
  patina: () => shared("patina", () => surfaceMaterial("#6f9583", 0.66, 0.2, "metal")),
  gold: () => shared("gold", () => surfaceMaterial("#caa04f", 0.42, 0.45, "metal")),
  azurite: () => shared("azurite", () => surfaceMaterial(pigment.azurite, 0.7, 0.02)),
  malachite: () => shared("malachite", () => surfaceMaterial(pigment.malachite, 0.7, 0.02)),
  celadon: () => shared("celadon", () => surfaceMaterial(pigment.celadon, 0.38, 0.04)),
  ink: () => shared("ink", () => surfaceMaterial(pigment.ink, 0.8, 0.05)),
  paper: () => shared("paper", () => surfaceMaterial(pigment.paper, 0.95, 0, "plaster")),
  /** 纸灯暖光随夜晚增强。 */
  lamp: (color = "#f3c77a") =>
    shared("lamp-" + color, () => {
      const m = new T.MeshStandardMaterial({
        color: "#fff1d6",
        emissive: color,
        emissiveIntensity: 0.2,
        roughness: 0.7,
      });
      m.userData.nightGlow = true;
      return m;
    }),
  tile: () => shared("roof-tile", () => roofMaterial(pigment.tile)),
  tileGreen: () => shared("roof-tile-green", () => roofMaterial("#6ba491")),
  tileGold: () => shared("roof-tile-gold", () => roofMaterial("#d0ad69")),
  tileBlue: () => shared("roof-tile-blue", () => roofMaterial("#5c90a7")),
  tileSnow: () => shared("roof-tile-snow", () => roofMaterial("#e3e8ea")),
  rock: () => shared("scholar-rock", () => surfaceMaterial("#9da49f", 0.93, 0.02, "stone")),
  soil: () => shared("soil", () => surfaceMaterial("#6d5a43", 1, 0, "grass")),
  brick: () => shared("brick", () => surfaceMaterial("#b8ae9b", 0.95, 0.02, "paving")),
  plasterWarm: () => shared("plaster-warm", () => surfaceMaterial("#f1e5cc", 0.95, 0, "plaster")),
  straw: () => shared("straw", () => surfaceMaterial("#c9a86a", 0.95, 0, "wood")),
  awning: () => shared("awning", () => surfaceMaterial("#496b6c", 0.9, 0, "wood")),
  eaves: () => shared("eaves", () => surfaceMaterial("#536e73", 0.85, 0.02, "wood")),
  beam: () => shared("painted-beam", () => beamMaterial()),
  lattice: () => shared("lattice", () => latticeMaterial()),
};

function canvasTexture(
  w: number,
  h: number,
  paint: (c: CanvasRenderingContext2D) => void,
  repeat = true,
) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  paint(canvas.getContext("2d")!);
  const t = new T.CanvasTexture(canvas);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
  return t;
}
/** 瓦条沿坡向排列，瓦层横向排列。 */
function roofMaterial(color: string) {
  const map = canvasTexture(256, 256, (c) => {
    c.fillStyle = "#ffffff";
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++) {
      const x = i * 32;
      const g = c.createLinearGradient(x, 0, x + 32, 0);
      g.addColorStop(0, "#8a8a8a");
      g.addColorStop(0.18, "#d8d8d8");
      g.addColorStop(0.42, "#ffffff");
      g.addColorStop(0.7, "#bdbdbd");
      g.addColorStop(0.86, "#5e5e5e");
      g.addColorStop(1, "#8a8a8a");
      c.fillStyle = g;
      c.fillRect(x + 4, 0, 24, 256);
      c.fillStyle = "#6f6f6f";
      c.fillRect(x, 0, 4, 256);
    }
    for (let y = 0; y < 256; y += 21) {
      c.fillStyle = "rgba(40,40,40,.28)";
      c.fillRect(0, y, 256, 2);
    }
  });
  return new T.MeshStandardMaterial({ color, map, roughness: 0.82, metalness: 0.04 });
}
/** 梁上旋子彩画包含旋涡端饰、色带与中央框。 */
function beamMaterial() {
  const map = canvasTexture(
    512,
    64,
    (c) => {
      c.fillStyle = "#2f5e78";
      c.fillRect(0, 0, 512, 64);
      c.fillStyle = "#3c8a6c";
      c.fillRect(0, 10, 512, 44);
      c.strokeStyle = "#e9dcb4";
      c.lineWidth = 2;
      c.strokeRect(150, 8, 212, 48);
      c.fillStyle = "#2b5671";
      c.fillRect(152, 10, 208, 44);
      c.strokeStyle = "#d8b56a";
      c.lineWidth = 2;
      for (const x of [44, 468]) {
        for (const r of [8, 15, 22]) {
          c.beginPath();
          c.arc(x, 32, r, 0, Math.PI * 2);
          c.stroke();
        }
      }
      c.fillStyle = "#d8b56a";
      for (const x of [0, 96, 416, 508]) {
        c.fillRect(x, 6, 4, 52);
      }
      c.strokeStyle = "#efe4c7";
      c.lineWidth = 1.5;
      c.beginPath();
      for (let x = 160; x < 352; x += 6) c.lineTo(x, 32 + Math.sin(x * 0.12) * 9);
      c.stroke();
    },
    false,
  );
  return new T.MeshStandardMaterial({ map, roughness: 0.75, metalness: 0.02 });
}
/** 方格窗后纸面在黄昏后由内点亮。 */
function latticeMaterial() {
  const map = canvasTexture(128, 128, (c) => {
    c.fillStyle = "#f5edd8";
    c.fillRect(0, 0, 128, 128);
    c.strokeStyle = "#8a7156";
    c.lineWidth = 5;
    c.strokeRect(2, 2, 124, 124);
    c.lineWidth = 3;
    for (const p of [32, 64, 96]) {
      c.beginPath();
      c.moveTo(p, 0);
      c.lineTo(p, 128);
      c.moveTo(0, p);
      c.lineTo(128, p);
      c.stroke();
    }
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(16, 16);
    c.lineTo(48, 16);
    c.lineTo(48, 48);
    c.moveTo(80, 80);
    c.lineTo(112, 80);
    c.lineTo(112, 112);
    c.stroke();
  });
  const m = new T.MeshStandardMaterial({
    map,
    emissiveMap: map,
    emissive: "#ffb767",
    emissiveIntensity: 0.05,
    roughness: 0.9,
  });
  m.userData.nightGlow = true;
  return m;
}

export type RoofOptions = {
  width: number;
  depth: number;
  height: number;
  overhang?: number;
  lift?: number;
  thickness?: number;
  y?: number;
  x?: number;
  z?: number;
  material?: T.Material;
  finial?: boolean;
};
/** 凹曲庑殿顶，含翘角、屋脊与木质底面；方形时为攒尖顶。 */
export function roof(parent: T.Object3D, options: RoofOptions): T.Group {
  // 正脊沿局部 x 轴，进深大于宽度的屋顶旋转四分之一圈。
  if (options.depth > options.width) {
    const turned: T.Group = roof(parent, {
      ...options,
      width: options.depth,
      depth: options.width,
    });
    turned.rotation.y = Math.PI / 2;
    return turned;
  }
  const {
    width,
    depth,
    height,
    overhang = 0.55,
    lift = 0.32,
    thickness = 0.12,
    y = 0,
    x = 0,
    z = 0,
    material = kit.tile(),
    finial = false,
  } = options;
  const group = new T.Group();
  group.position.set(x, y, z);
  parent.add(group);
  const w = width / 2 + overhang,
    d = depth / 2 + overhang,
    n = 20;
  const surface = (px: number, pz: number) => {
    const e = Math.min(w - Math.abs(px), d - Math.abs(pz)) / Math.min(w, d),
      t = Math.max(0, Math.min(1, e));
    const corner = Math.pow(Math.abs(px / w) * Math.abs(pz / d), 4);
    return height * (0.12 * t + 0.88 * Math.pow(t, 1.85)) + lift * corner * (1 - t);
  };
  const top: number[] = [],
    uv: number[] = [],
    bottom: number[] = [],
    index: number[] = [],
    under: number[] = [];
  for (let j = 0; j <= n; j++)
    for (let i = 0; i <= n; i++) {
      const px = ((i / n) * 2 - 1) * w,
        pz = ((j / n) * 2 - 1) * d,
        h = surface(px, pz),
        front = d - Math.abs(pz) < w - Math.abs(px);
      top.push(px, h, pz);
      uv.push((front ? px : pz) / 2, (front ? pz : px) / 2);
      bottom.push(px, h - thickness, pz);
      if (i < n && j < n) {
        const a = j * (n + 1) + i,
          b = a + n + 1;
        index.push(a, b, a + 1, a + 1, b, b + 1);
        under.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(top, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  place(group, geometry, material).name = "roof-tiles";
  // 底面与檐口沿用椽木深色。
  const rim: number[] = [];
  const ring = [...Array(n).keys()]
    .map((i) => i)
    .concat(
      [...Array(n).keys()].map((j) => n + j * (n + 1)),
      [...Array(n).keys()].map((i) => n * (n + 1) + n - i),
      [...Array(n).keys()].map((j) => (n - j) * (n + 1)),
    );
  const count = (n + 1) * (n + 1);
  for (let k = 0; k < ring.length; k++) {
    const a = ring[k],
      b = ring[(k + 1) % ring.length];
    rim.push(a, count + a, b, b, count + a, count + b);
  }
  const shell = new T.BufferGeometry();
  shell.setAttribute("position", new T.Float32BufferAttribute([...top, ...bottom], 3));
  shell.setIndex([...under.map((i) => i + count), ...rim]);
  shell.computeVertexNormals();
  place(group, shell, kit.eaves());
  // 屋脊饰件随屋顶缩放，小棚用细脊、厅堂用粗脊。
  const ridge = kit.stoneDark(),
    ridgeLength = Math.max(0, (w - d) * 2),
    k = Math.min(1, Math.max(0.3, Math.min(w, d) / 1.4));
  if (ridgeLength > 0.05) {
    place(
      group,
      new T.BoxGeometry(ridgeLength + 0.3 * k, 0.22 * k, 0.24 * k),
      ridge,
      0,
      height + 0.06 * k,
      0,
    );
    for (const s of [-1, 1]) {
      const end = place(
        group,
        new T.BoxGeometry(0.22 * k, 0.42 * k, 0.26 * k),
        ridge,
        s * (ridgeLength / 2 + 0.12 * k),
        height + 0.2 * k,
        0,
      );
      end.rotation.z = -s * 0.25;
    }
  }
  // 垂脊沿曲面从正脊端部延伸至翘角。
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      const points = Array.from({ length: 9 }, (_, i) => {
        const f = i / 8,
          px = sx * (w - Math.min(w, d) + Math.min(w, d) * f),
          pz = sz * Math.min(w, d) * f * (d / Math.min(w, d));
        return new T.Vector3(px, surface(px * 0.999, pz * 0.999) + 0.05 * k, pz);
      });
      place(
        group,
        new T.TubeGeometry(new T.CatmullRomCurve3(points), 12, 0.06 * k, 5, false),
        ridge,
      );
      const tip = points[8];
      const curl = place(
        group,
        new T.ConeGeometry(0.08 * k, 0.34 * k, 5),
        ridge,
        tip.x * 1.01,
        tip.y + 0.12 * k,
        tip.z * 1.01,
      );
      curl.rotation.set(sz * 0.6, 0, -sx * 0.6);
    }
  if (finial) {
    place(group, new T.CylinderGeometry(0.16, 0.24, 0.28, 10), ridge, 0, height + 0.1, 0);
    place(group, new T.SphereGeometry(0.2, 12, 8), kit.gold(), 0, height + 0.38, 0);
    place(group, new T.ConeGeometry(0.07, 0.36, 8), kit.gold(), 0, height + 0.66, 0);
  }
  return group;
}

/** 圆漆柱立于雕花石座。 */
export function column(
  parent: T.Object3D,
  x: number,
  z: number,
  height: number,
  radius = 0.13,
  material: T.Material = kit.lacquer(),
  baseY = 0,
) {
  place(
    parent,
    new T.CylinderGeometry(radius * 1.65, radius * 1.8, 0.16, 12),
    kit.stone(),
    x,
    baseY + 0.08,
    z,
  );
  return place(
    parent,
    new T.CylinderGeometry(radius * 0.94, radius, height, 12),
    material,
    x,
    baseY + 0.16 + height / 2,
    z,
  );
}
/** 石台基配线脚顶沿，前阶按需由调用方添加。 */
export function podium(
  parent: T.Object3D,
  width: number,
  depth: number,
  height: number,
  x = 0,
  z = 0,
  y = 0,
) {
  place(
    parent,
    new T.BoxGeometry(width, height - 0.06, depth),
    kit.stone(),
    x,
    y + (height - 0.06) / 2,
    z,
  );
  return place(
    parent,
    new T.BoxGeometry(width + 0.12, 0.08, depth + 0.12),
    kit.marble(),
    x,
    y + height - 0.04,
    z,
  );
}
export function steps(
  parent: T.Object3D,
  width: number,
  rise: number,
  count: number,
  x: number,
  z: number,
  direction = 1,
  y = 0,
) {
  for (let i = 0; i < count; i++) {
    const h = (rise * (count - i)) / count;
    place(
      parent,
      new T.BoxGeometry(width, h, 0.34),
      kit.marble(),
      x,
      y + h / 2,
      z + direction * (0.17 + i * 0.34),
    );
  }
}
/** 彩绘额枋连接两柱。 */
export function beam(
  parent: T.Object3D,
  length: number,
  x: number,
  y: number,
  z: number,
  rotation = 0,
  height = 0.26,
  depth = 0.2,
) {
  const b = place(parent, new T.BoxGeometry(length, height, depth), kit.beam(), x, y, z);
  b.rotation.y = rotation;
  return b;
}
/** 木架包含柱、额枋与檐下斗拱带。 */
export function hallFrame(
  parent: T.Object3D,
  width: number,
  depth: number,
  height: number,
  { columnsX = 4, columnsZ = 2, radius = 0.13, y = 0 } = {},
) {
  const xs = Array.from({ length: columnsX }, (_, i) => -width / 2 + (i * width) / (columnsX - 1)),
    zs = Array.from({ length: columnsZ }, (_, i) => -depth / 2 + (i * depth) / (columnsZ - 1));
  for (const x of xs)
    for (const z of zs)
      if (x === xs[0] || x === xs[xs.length - 1] || z === zs[0] || z === zs[zs.length - 1])
        column(parent, x, z, height, radius, kit.lacquer(), y);
  for (const z of [zs[0], zs[zs.length - 1]]) beam(parent, width + 0.3, 0, y + height + 0.05, z);
  for (const x of [xs[0], xs[xs.length - 1]])
    beam(parent, depth + 0.3, x, y + height + 0.05, 0, Math.PI / 2);
  const bracket = kit.malachite();
  for (const z of [zs[0], zs[zs.length - 1]])
    for (let i = 0; i <= Math.round(width / 0.7); i++)
      place(
        parent,
        new T.BoxGeometry(0.16, 0.12, 0.3),
        bracket,
        -width / 2 + (i * width) / Math.round(width / 0.7),
        y + height + 0.24,
        z,
      ).castShadow = false;
  for (const x of [xs[0], xs[xs.length - 1]])
    for (let i = 1; i < Math.round(depth / 0.7); i++)
      place(
        parent,
        new T.BoxGeometry(0.3, 0.12, 0.16),
        bracket,
        x,
        y + height + 0.24,
        -depth / 2 + (i * depth) / Math.round(depth / 0.7),
      ).castShadow = false;
  place(
    parent,
    new T.BoxGeometry(width + 0.5, 0.1, depth + 0.5),
    kit.timber(),
    0,
    y + height + 0.35,
    0,
  );
  return { xs, zs };
}
/** 沿局部 x 轴布置直线石栏。 */
export function balustrade(
  parent: T.Object3D,
  length: number,
  { x = 0, y = 0, z = 0, rotation = 0, height = 0.92, spacing = 1.6, material = kit.marble() } = {},
) {
  const run = new T.Group();
  run.position.set(x, y, z);
  run.rotation.y = rotation;
  parent.add(run);
  const count = Math.max(1, Math.round(length / spacing)),
    step = length / count;
  for (let i = 0; i <= count; i++) {
    const px = -length / 2 + i * step;
    place(run, new T.BoxGeometry(0.2, height, 0.2), material, px, height / 2);
    place(run, new T.CylinderGeometry(0.11, 0.13, 0.2, 8), material, px, height + 0.1);
    place(run, new T.SphereGeometry(0.1, 8, 6), material, px, height + 0.24);
  }
  for (let i = 0; i < count; i++) {
    const px = -length / 2 + (i + 0.5) * step;
    place(run, new T.BoxGeometry(step - 0.2, 0.12, 0.14), material, px, height - 0.12);
    place(run, new T.BoxGeometry(step - 0.2, 0.36, 0.1), material, px, 0.3);
    place(run, new T.BoxGeometry(step - 0.2, 0.08, 0.18), material, px, 0.06);
    for (const s of [-1, 1])
      place(
        run,
        new T.CylinderGeometry(0.05, 0.07, height - 0.62, 6),
        material,
        px + s * (step - 0.2) * 0.25,
        (height - 0.62) / 2 + 0.48,
      );
  }
  return run;
}
/** 石灯由台座、灯柱、发光灯室与曲顶组成。 */
export function lantern(
  parent: T.Object3D,
  x: number,
  z: number,
  scale = 1,
  y = 0,
  light = kit.lamp(),
) {
  const g = new T.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  parent.add(g);
  const s = kit.stone();
  place(g, new T.CylinderGeometry(0.34, 0.4, 0.16, 8), s, 0, 0.08);
  place(g, new T.CylinderGeometry(0.11, 0.15, 0.86, 8), s, 0, 0.59);
  place(g, new T.CylinderGeometry(0.28, 0.22, 0.12, 6), s, 0, 1.07);
  place(g, new T.CylinderGeometry(0.2, 0.2, 0.36, 6), light, 0, 1.31).castShadow = false;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    place(g, new T.BoxGeometry(0.05, 0.38, 0.05), s, Math.sin(a) * 0.2, 1.31, Math.cos(a) * 0.2);
  }
  const cap = new T.LatheGeometry(
    [
      [0, 0],
      [0.42, 0],
      [0.4, 0.02],
      [0.3, 0.14],
      [0.12, 0.3],
      [0, 0.32],
    ].map(([r, h]) => new T.Vector2(r, h)),
    6,
  );
  place(g, cap, s, 0, 1.5).name = "lantern-cap";
  place(g, new T.SphereGeometry(0.07, 8, 6), s, 0, 1.86);
  return g;
}

/** 抱鼓石由雕花石鼓与台座组成，置于门或屏风两侧。 */
export function drumStone(
  parent: T.Object3D,
  x: number,
  z: number,
  rotation = 0,
  scale = 1,
  y = 0,
) {
  const g = new T.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotation;
  g.scale.setScalar(scale);
  parent.add(g);
  place(g, new T.BoxGeometry(0.34, 0.36, 0.62), kit.stone(), 0, 0.18);
  const drum = place(g, new T.CylinderGeometry(0.3, 0.3, 0.24, 18), kit.marble(), 0, 0.62);
  drum.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) {
    const rim = place(g, new T.TorusGeometry(0.29, 0.025, 5, 18), kit.stone(), s * 0.12, 0.62);
    rim.rotation.y = Math.PI / 2;
  }
  place(g, new T.SphereGeometry(0.1, 10, 6), kit.stone(), 0, 0.95).scale.set(1, 0.7, 1.4);
  return g;
}
/** 牌坊由鼓石柱脚、双柱、彩绘额枋、牌匾位与瓦顶组成，返回牌坊及匾额悬挂高度。 */
export function paifang(
  parent: T.Object3D,
  span: number,
  height: number,
  { material = kit.lacquer(), tiles = kit.tile(), x = 0, z = 0, rotation = 0 } = {},
) {
  const g = new T.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotation;
  parent.add(g);
  for (const s of [-1, 1]) {
    column(g, (s * span) / 2, 0, height, 0.2, material);
    for (const side of [-1, 1]) drumStone(g, (s * span) / 2, side * 0.58, 0, 0.8);
  }
  beam(g, span + 0.5, 0, height - 0.85, 0, 0, 0.32, 0.26);
  beam(g, span + 0.3, 0, height + 0.12, 0, 0, 0.28, 0.24);
  place(g, new T.BoxGeometry(span + 0.7, 0.12, 0.5), kit.timber(), 0, height + 0.32, 0);
  for (let i = 0; i <= Math.round(span / 0.55); i++)
    place(
      g,
      new T.BoxGeometry(0.16, 0.12, 0.34),
      kit.malachite(),
      -span / 2 + (i * span) / Math.round(span / 0.55),
      height + 0.44,
      0,
    ).castShadow = false;
  roof(g, {
    width: span + 0.4,
    depth: 0.5,
    height: 0.55,
    overhang: 0.55,
    lift: 0.3,
    y: height + 0.5,
    material: tiles,
  });
  return { group: g, plaqueY: height - 0.355 };
}
/** 沿局部 z 轴布置短围栏，按季节使用竹、木或雕石。 */
export function fenceSection(
  parent: T.Object3D,
  length: number,
  kind: "bamboo" | "timber" | "stone",
) {
  const g = new T.Group();
  parent.add(g);
  if (kind === "stone") {
    balustrade(g, length, { height: 0.72, spacing: length, material: kit.stone() }).rotation.y =
      Math.PI / 2;
    return g;
  }
  if (kind === "timber") {
    for (const z of [-length / 2, length / 2]) {
      place(g, new T.BoxGeometry(0.1, 0.86, 0.1), kit.timber(), 0, 0.43, z);
      place(g, new T.BoxGeometry(0.14, 0.06, 0.14), kit.stoneDark(), 0, 0.89, z);
    }
    for (const y of [0.32, 0.72])
      place(g, new T.BoxGeometry(0.05, 0.07, length), kit.timber(), 0, y, 0);
    return g;
  }
  const cane = kit.straw();
  for (let i = 0; i <= Math.round(length / 0.14); i++) {
    const z = -length / 2 + (i * length) / Math.round(length / 0.14),
      h = 0.72 + ((i * 7) % 3) * 0.04;
    place(g, new T.CylinderGeometry(0.026, 0.03, h, 5), cane, 0, h / 2, z).castShadow = i % 2 === 0;
  }
  for (const y of [0.28, 0.62])
    place(g, new T.BoxGeometry(0.06, 0.05, length), kit.timber(), 0, y, 0);
  return g;
}

/** 赏石由三块扭转侵蚀的石灰岩形体组成，间留暗隙。 */
const rockLump = (() => {
  const g = new T.IcosahedronGeometry(1, 3),
    p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      s =
        1 +
        0.16 * Math.sin(x * 4.1 + y * 2.3) +
        0.11 * Math.sin(z * 5.3 - y * 3.7) +
        0.07 * Math.sin(x * 9 + z * 8);
    p.setXYZ(i, x * s, y * s, z * s);
  }
  g.computeVertexNormals();
  return g;
})();
export function scholarRock(parent: T.Object3D, x: number, z: number, height = 1.4, y = 0) {
  const g = new T.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const m = kit.rock();
  for (const [dx, dy, dz, sx, sy, sz, r] of [
    [0, 0.28, 0, 0.42, 0.3, 0.36, 0],
    [0.1, 0.62, 0.05, 0.3, 0.36, 0.26, 0.7],
    [-0.06, 0.98, -0.04, 0.24, 0.3, 0.22, 1.6],
  ] as number[][]) {
    const lump = place(g, rockLump, m, dx * height, dy * height, dz * height);
    lump.scale.set(sx * height, sy * height, sz * height);
    lump.rotation.set(r * 0.4, r, r * 0.3);
  }
  return g;
}
/** 雕花鼓凳兼作座椅与踏脚石。 */
export function drumStool(
  parent: T.Object3D,
  x: number,
  z: number,
  radius: number,
  height: number,
  material: T.Material = kit.stone(),
  y = 0,
) {
  const g = new T.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const profile = [
    [0, 0],
    [radius * 0.9, 0],
    [radius, height * 0.12],
    [radius * 1.04, height * 0.5],
    [radius, height * 0.88],
    [radius * 0.9, height],
    [0, height],
  ].map(([r, h]) => new T.Vector2(r, h));
  place(g, new T.LatheGeometry(profile, 20), material);
  const boss = new T.SphereGeometry(radius * 0.045, 6, 4),
    count = Math.max(10, Math.round(radius * 24));
  for (const h of [0.16, 0.84])
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      place(
        g,
        boss,
        kit.stoneDark(),
        Math.cos(a) * radius * 1.015,
        height * h,
        Math.sin(a) * radius * 1.015,
      ).castShadow = false;
    }
  return g;
}

/** 圆亭顶由凹曲瓦锥、屋脊、木檐环与可选金顶组成。 */
export function roundRoof(
  parent: T.Object3D,
  {
    radius,
    height,
    y = 0,
    x = 0,
    z = 0,
    material = kit.tileBlue(),
    ridges = 8,
    finial = true,
  }: {
    radius: number;
    height: number;
    y?: number;
    x?: number;
    z?: number;
    material?: T.Material;
    ridges?: number;
    finial?: boolean;
  },
) {
  const g = new T.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const n = 10,
    profile: T.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    profile.push(
      new T.Vector2(
        radius * (1 - t),
        height * Math.pow(t, 1.7) * (1 - 0.08 * (1 - t)) + 0.12 * (1 - t) * (1 - t),
      ),
    );
  }
  // 朝屋顶顶点延展檐线，使绕序与法线朝上。
  place(g, new T.LatheGeometry(profile, Math.max(16, ridges * 4)), material).name =
    "round-roof-tiles";
  place(
    g,
    new T.CylinderGeometry(radius, radius * 0.98, 0.16, Math.max(16, ridges * 4), 1, true),
    kit.eaves(),
    0,
    0.04,
  );
  place(
    g,
    new T.CircleGeometry(radius, Math.max(16, ridges * 4)).rotateX(Math.PI / 2),
    kit.eaves(),
    0,
    -0.04,
  );
  for (let i = 0; i < ridges; i++) {
    const a = (i / ridges) * Math.PI * 2,
      pts = profile.map((p) => new T.Vector3(Math.cos(a) * p.x, p.y + 0.05, Math.sin(a) * p.x));
    place(g, new T.TubeGeometry(new T.CatmullRomCurve3(pts), 10, 0.045, 5, false), kit.stoneDark());
  }
  if (finial) {
    place(g, new T.CylinderGeometry(0.1, 0.16, 0.22, 10), kit.stoneDark(), 0, height + 0.08);
    place(g, new T.SphereGeometry(0.17, 12, 8), kit.gold(), 0, height + 0.32);
    place(g, new T.ConeGeometry(0.06, 0.34, 8), kit.gold(), 0, height + 0.6);
  }
  return g;
}

/** 墨竹由成簇倾斜竹节与顶部细叶组成。 */
const bambooSpray = (() => {
  const parts: T.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i - 2.5) * 0.38,
      g = new T.SphereGeometry(1, 6, 3)
        .scale(0.05, 0.012, 0.3)
        .translate(0, 0, 0.28)
        .rotateX(0.5 + Math.abs(a) * 0.4)
        .rotateY(a);
    parts.push(g);
  }
  return mergeGeometries(parts)!;
})();
export function bamboo(
  parent: T.Object3D,
  x: number,
  z: number,
  { height = 4.4, culms = 7, radius = 0.38, y = 0, seed = 1 } = {},
) {
  let s = Math.floor(Math.abs(x * 91.7 + z * 37.3 + seed * 13)) >>> 0;
  const random = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  const g = new T.Group();
  g.position.set(x, y, z);
  parent.add(g);
  const cane = leaf("#5f8a5a"),
    node = leaf("#3f6446"),
    blade = leaf("#3e6a4a");
  for (let i = 0; i < culms; i++) {
    const a = random() * Math.PI * 2,
      r = random() * radius,
      h = height * (0.72 + random() * 0.32),
      lean = 0.05 + random() * 0.09;
    const culm = new T.Group();
    culm.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    culm.rotation.set(Math.sin(a) * lean, random() * 3, -Math.cos(a) * lean);
    g.add(culm);
    place(culm, new T.CylinderGeometry(0.032, 0.045, h, 6), cane, 0, h / 2).castShadow =
      i % 2 === 0;
    for (let k = 1; k < 7; k++)
      place(culm, new T.CylinderGeometry(0.05, 0.05, 0.04, 6), node, 0, (h * k) / 7).castShadow =
        false;
    for (let k = 0; k < 4; k++) {
      const spray = place(culm, bambooSpray, blade, 0, h * (0.62 + k * 0.11), 0);
      spray.rotation.y = random() * Math.PI * 2;
      spray.scale.setScalar(0.9 + random() * 0.5);
      spray.castShadow = k % 2 === 0;
    }
  }
  return g;
}

const canopy = new T.IcosahedronGeometry(1, 1);
{
  const p = canopy.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      r = 1 + 0.08 * Math.sin(x * 7 + z * 5) + 0.05 * Math.cos(y * 9 - x * 4);
    p.setXYZ(i, x * r, y * r, z * r);
  }
  canopy.computeVertexNormals();
}
/** 沿曲线生成渐细管状树枝。 */
function limb(points: T.Vector3[], r0: number, r1: number, segments = 10, radial = 6) {
  const curve = new T.CatmullRomCurve3(points),
    geo = new T.TubeGeometry(curve, segments, 1, radial, false),
    p = geo.attributes.position;
  for (let i = 0; i <= segments; i++) {
    const c = curve.getPointAt(i / segments),
      r = r0 + ((r1 - r0) * i) / segments;
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      p.setXYZ(
        k,
        c.x + (p.getX(k) - c.x) * r,
        c.y + (p.getY(k) - c.y) * r,
        c.z + (p.getZ(k) - c.z) * r,
      );
    }
  }
  geo.computeVertexNormals();
  return geo;
}
export type TreeForm = "pine" | "snowpine" | "blossom" | "maple" | "broadleaf" | "willow";
const foliage = {
  pine: ["#568b76", "#76a58a"],
  snowpine: ["#527e70", "#f1f2ec"],
  blossom: ["#efbbcd", "#f6d8df"],
  maple: ["#d78d71", "#e7ad79", "#edc675"],
  broadleaf: ["#7ca786", "#a1c5a1"],
  willow: ["#99bc86", "#bcce9d"],
};
const leafMaterials = new Map<string, T.Material>();
const leaf = (color: string) => {
  let m = leafMaterials.get(color);
  if (!m) {
    m = surfaceMaterial(color, 0.92, 0, "foliage");
    leafMaterials.set(color, m);
  }
  return m;
};
/** 笔绘树木使用弯枝与云片状树冠。 */
export function paintedTree(
  parent: T.Object3D,
  x: number,
  z: number,
  scale = 1,
  form: TreeForm = "pine",
  y = 0,
) {
  let seed = Math.floor(Math.abs(x * 73.1 + z * 31.7 + scale * 997)) >>> 0;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const g = new T.Group();
  g.position.set(x, y, z);
  g.scale.setScalar(scale);
  g.rotation.y = random() * Math.PI * 2;
  parent.add(g);
  const bark = form === "blossom" ? kit.ink() : kit.timber(),
    colors = foliage[form];
  const lean = (random() - 0.5) * 0.5,
    height = form === "pine" || form === "snowpine" ? 3.1 : form === "willow" ? 2.3 : 2.6;
  const trunk = [
    new T.Vector3(0, 0, 0),
    new T.Vector3(lean * 0.3, height * 0.35, (random() - 0.5) * 0.25),
    new T.Vector3(-lean * 0.4, height * 0.7, (random() - 0.5) * 0.3),
    new T.Vector3(lean * 0.2, height, (random() - 0.5) * 0.2),
  ];
  const trunkCurve = new T.CatmullRomCurve3(trunk);
  place(g, limb(trunk, form === "willow" ? 0.2 : 0.15, 0.05), bark);
  place(g, new T.SphereGeometry(0.24, 8, 5).scale(1, 0.35, 1), bark, 0, 0.04, 0);
  const tiers: [number, number, number, number][] = [];
  if (form === "pine" || form === "snowpine") {
    for (let i = 0; i < 4; i++) {
      const a = random() * Math.PI * 2,
        reach = (0.95 - i * 0.17) * (0.8 + random() * 0.3);
      const base = trunkCurve.getPointAt(0.43 + i * 0.15),
        tip = base.clone().add(new T.Vector3(Math.cos(a) * reach, 0.18, Math.sin(a) * reach));
      place(
        g,
        limb(
          [
            base,
            base
              .clone()
              .lerp(tip, 0.58)
              .add(new T.Vector3(0, 0.08, 0)),
            tip,
          ],
          0.06,
          0.025,
          5,
          5,
        ),
        bark,
      );
      tiers.push([tip.x, tip.y + 0.08, tip.z, 0.95 - i * 0.15]);
    }
    tiers.push([trunk[3].x, height + 0.12, trunk[3].z, 0.62]);
    for (const [tx, ty, tz, r] of tiers) {
      const t = place(g, canopy, leaf(colors[0]), tx, ty, tz);
      t.scale.set(r * 1.15, r * 0.34, r * 0.95);
      t.rotation.y = random() * 3;
      if (form === "snowpine") {
        const s = place(g, canopy, leaf(colors[1]), tx, ty + r * 0.16, tz);
        s.scale.set(r * 1.02, r * 0.2, r * 0.84);
        s.rotation.y = t.rotation.y;
        s.castShadow = false;
      } else {
        const s = place(g, canopy, leaf(colors[1]), tx + 0.05, ty + r * 0.12, tz - 0.04);
        s.scale.set(r * 0.8, r * 0.2, r * 0.66);
        s.castShadow = false;
      }
    }
  } else if (form === "willow") {
    // 小结冠配长垂丝轮廓。
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + random(),
        c = place(
          g,
          canopy,
          leaf(colors[0]),
          trunk[3].x + Math.cos(a) * 0.35,
          height + 0.1 + random() * 0.25,
          trunk[3].z + Math.sin(a) * 0.35,
        );
      c.scale.set(0.62, 0.34, 0.58);
    }
    const strand = leaf(colors[1]) as T.MeshStandardMaterial;
    strand.side = T.DoubleSide;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + random() * 0.25,
        r = 0.45 + random() * 0.6,
        top = height + 0.05 + random() * 0.3,
        len = 1.5 + random() * 1.1,
        out = 0.18 + random() * 0.14;
      const pts = [
        new T.Vector3(Math.cos(a) * r * 0.4, top + 0.25, Math.sin(a) * r * 0.4),
        new T.Vector3(Math.cos(a) * (r + out), top + 0.05, Math.sin(a) * (r + out)),
        new T.Vector3(
          Math.cos(a) * (r + out * 1.2),
          top - len * 0.55,
          Math.sin(a) * (r + out * 1.2),
        ),
        new T.Vector3(Math.cos(a) * (r + out * 1.05), top - len, Math.sin(a) * (r + out * 1.05)),
      ];
      place(g, limb(pts, 0.045, 0.012, 7, 3), strand).castShadow = i % 4 === 0;
    }
  } else {
    const count = form === "maple" ? 7 : form === "blossom" ? 6 : 6;
    for (let i = 0; i < 2; i++) {
      const a = random() * Math.PI * 2 + i * Math.PI,
        base = trunkCurve.getPointAt(0.46 + i * 0.12),
        tip = base
          .clone()
          .add(
            new T.Vector3(Math.cos(a) * 0.75, height * 0.3 + random() * 0.18, Math.sin(a) * 0.75),
          );
      place(
        g,
        limb(
          [
            base,
            base
              .clone()
              .lerp(tip, 0.55)
              .add(new T.Vector3(0, 0.08, 0)),
            tip,
          ],
          0.07,
          0.03,
          6,
          5,
        ),
        bark,
      );
      tiers.push([tip.x, tip.y + 0.1, tip.z, 0.62]);
    }
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + random(),
        r = 0.45 + random() * 0.4;
      tiers.push([
        Math.cos(a) * r + trunk[3].x,
        height + 0.05 + random() * 0.5,
        Math.sin(a) * r + trunk[3].z,
        0.5 + random() * 0.25,
      ]);
    }
    tiers.push([trunk[3].x, height + 0.55, trunk[3].z, 0.62]);
    tiers.forEach(([tx, ty, tz, r], i) => {
      const t = place(g, canopy, leaf(colors[i % colors.length]), tx, ty, tz);
      t.scale.set(r, r * (form === "blossom" ? 0.62 : 0.78), r);
      t.rotation.set(random(), random() * 3, 0);
    });
  }
  return g;
}
/** 树叶颜色的色相决定笔绘树形。 */
export function formForColor(color: string): TreeForm {
  const hsl = { h: 0, s: 0, l: 0 };
  new T.Color(color).getHSL(hsl);
  if (hsl.l > 0.84 && hsl.s < 0.3) return "snowpine";
  if (hsl.h > 0.8 || (hsl.h < 0.07 && hsl.l > 0.78)) return "blossom";
  if (hsl.h < 0.15 && hsl.s > 0.3) return "maple";
  return "pine";
}
