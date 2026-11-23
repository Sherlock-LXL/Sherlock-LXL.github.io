import { catSculpture } from "./cat-sculpture";
import { worldMirror } from "./mirror";
import * as T from "three";
import { surfaceMaterial } from "./surfaces";
import {
  kit,
  place,
  roof,
  column,
  podium,
  beam,
  drumStool,
  scholarRock,
  bamboo,
  paintedTree,
  formForColor,
} from "./vernacular";
import { pigmentAccent, exact } from "./ink";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { artwork } from "./artwork";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
type Palette = {
  main: T.MeshStandardMaterial;
  dark: T.MeshStandardMaterial;
  glow: T.MeshStandardMaterial;
  stone: T.MeshStandardMaterial;
};
export const material = surfaceMaterial;
export function mesh(
  parent: T.Object3D,
  geo: T.BufferGeometry,
  mat: T.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new T.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function softBox(w: number, h: number, d: number) {
  const edge = Math.min(w, h, d);
  return edge < 0.12
    ? new T.BoxGeometry(w, h, d)
    : new RoundedBoxGeometry(w, h, d, edge > 0.5 ? 3 : 2, Math.min(0.12, edge * 0.22));
}
const box = (
  g: T.Object3D,
  p: Palette,
  w: number,
  h: number,
  d: number,
  x = 0,
  y = 0,
  z = 0,
  mat = p.main,
) => mesh(g, softBox(w, h, d), mat, x, y, z);
function ring(g: T.Object3D, r: number, y: number, mat: T.Material) {
  const m = mesh(g, new T.TorusGeometry(r, 0.06, 12, 80), mat, 0, y, 0);
  m.rotation.x = Math.PI / 2;
  return m;
}
const foliageGeometry = new T.SphereGeometry(1, 24, 16);
{
  const p = foliageGeometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      r =
        1 +
        0.065 * Math.sin(x * 9 + y * 5) * Math.cos(z * 8 - y * 3) +
        0.04 * Math.sin(x * 18 - z * 21);
    p.setXYZ(i, x * r, y * r, z * r);
  }
  foliageGeometry.computeVertexNormals();
}
// 树干由渐细主干、两条侧枝、根部外展与冠端组成。
const woodGeometry = (() => {
  const parts: T.BufferGeometry[] = [
    new T.CylinderGeometry(0.09, 0.22, 2.1, 14).translate(0, 1.05, 0),
  ];
  for (const side of [-1, 1]) {
    parts.push(
      new T.CylinderGeometry(0.038, 0.08, 0.95, 10)
        .rotateZ(-side * 0.65)
        .translate(side * 0.26, 1.72, side * 0.03),
    );
    parts.push(
      new T.CylinderGeometry(0.028, 0.055, 0.55, 8)
        .rotateZ(-side * 0.9)
        .rotateX(side * 0.3)
        .translate(side * 0.17, 2.25, -0.14),
    );
    parts.push(
      new T.SphereGeometry(0.21, 12, 8).scale(1, 0.42, 1.35).translate(side * 0.14, 0.058, 0.07),
    );
    parts.push(
      new T.SphereGeometry(0.18, 10, 6).scale(1.1, 0.38, 1).translate(side * 0.19, 0.05, -0.14),
    );
  }
  parts.push(new T.CylinderGeometry(0.03, 0.07, 0.42, 8).translate(0, 2.32, 0.03));
  return mergeGeometries(parts)!;
})();
const barkMaterial = material("#9d8468", 0.95, 0.02, "wood");
const foliageMaterials = new Map<string, T.MeshStandardMaterial>();
/** 输入的树叶颜色映射到对应笔绘树形。 */
export function tree(g: T.Object3D, x: number, z: number, scale = 1, color = "#b0d9be") {
  paintedTree(g, x, z, scale * 0.92, formForColor(color));
}
/** 保留早期云冠树用于小型装饰。 */
export function puffTree(g: T.Object3D, x: number, z: number, scale = 1, color = "#b0d9be") {
  mesh(g, woodGeometry, barkMaterial, x, 0, z).scale.setScalar(scale);
  if (!foliageMaterials.has(color))
    foliageMaterials.set(color, material(color, 0.92, 0, "foliage"));
  if (!foliageMaterials.has(color + "-shade"))
    foliageMaterials.set(
      color + "-shade",
      material(new T.Color(color).multiplyScalar(0.78).getStyle(), 1, 0, "foliage"),
    );
  const leaves = foliageMaterials.get(color)!,
    shade = foliageMaterials.get(color + "-shade")!;
  // 云团由六个主冠与三处内部暗部组成。
  const bursts = [
    [-0.5, 2.0, -0.08, 0.95, 0.86, 0.86, leaves],
    [0.52, 2.14, 0.12, 0.9, 0.88, 0.82, leaves],
    [-0.1, 2.35, 0.38, 0.92, 0.86, 0.84, leaves],
    [0.08, 2.72, -0.14, 0.86, 0.78, 0.82, leaves],
    [-0.42, 2.52, 0.24, 0.78, 0.74, 0.8, leaves],
    [0.46, 2.46, -0.24, 0.82, 0.78, 0.8, leaves],
    [0, 2.1, -0.04, 0.72, 0.65, 0.68, shade],
    [-0.22, 2.42, 0.08, 0.68, 0.6, 0.66, shade],
    [0.26, 2.3, 0.14, 0.66, 0.62, 0.64, shade],
  ];
  for (const [dx, dy, dz, sx, sy, sz, mat] of bursts) {
    const leaf = mesh(
      g,
      foliageGeometry,
      mat as T.MeshStandardMaterial,
      x + (dx as number) * scale,
      (dy as number) * scale,
      z + (dz as number) * scale,
    );
    leaf.scale.set((sx as number) * scale, (sy as number) * scale, (sz as number) * scale);
    leaf.rotation.set((dx as number) * 0.3, (dz as number) * 0.6, (dy as number) * 0.1);
  }
}
/** 檐角悬挂小铜风铃。 */
const windBell = new T.LatheGeometry(
  [
    [0, 0.2],
    [0.035, 0.2],
    [0.06, 0.15],
    [0.07, 0.05],
    [0.09, 0],
    [0, 0],
  ].map(([r, h]) => new T.Vector2(r, h)),
  10,
);
const serif = '"Songti SC","STSong","Noto Serif CJK SC","Source Han Serif SC","SimSun",serif';
/** 立轴包含绫边、纸面、竖排诗句、印章与题签。 */
function hangingScroll(label: string, lines: string[], mount: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 768;
  const c = canvas.getContext("2d")!;
  c.fillStyle = mount;
  c.fillRect(0, 0, 256, 768);
  c.fillStyle = "#efe6cf";
  c.fillRect(26, 86, 204, 600);
  c.strokeStyle = "rgba(60,48,36,.35)";
  c.lineWidth = 2;
  c.strokeRect(26, 86, 204, 600);
  c.fillStyle = "#2b2824";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.font = `600 34px ${serif}`;
  lines.forEach((line, col) =>
    [...line].forEach((ch, i) => c.fillText(ch, 190 - col * 44, 140 + i * 46)),
  );
  c.fillStyle = "#b23e2c";
  c.fillRect(48, 600, 36, 36);
  c.fillStyle = "#f3ead7";
  c.font = `700 26px ${serif}`;
  c.fillText(label, 66, 619);
  c.fillStyle = "#f3ead7";
  c.font = `600 30px ${serif}`;
  c.fillText(label, 128, 44);
  const t = new T.CanvasTexture(canvas);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
const builders: Record<string, (g: T.Group, p: Palette) => void> = {
  /** XiangLM 展品为七层经塔，格栅内发光，檐角悬铃。 */
  tower(g, p) {
    podium(g, 4.6, 4.6, 0.55, 0, 0, 0.07);
    let y = 0.62;
    for (let i = 0; i < 7; i++) {
      const w = 3.3 - i * 0.27,
        h = 1.05 - i * 0.03,
        half = w / 2,
        top = i === 6;
      place(g, new T.BoxGeometry(w - 0.16, h, w - 0.16), kit.plaster(), 0, y + h / 2, 0);
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          place(
            g,
            new T.CylinderGeometry(0.085, 0.1, h, 8),
            kit.lacquer(),
            sx * (half - 0.06),
            y + h / 2,
            sz * (half - 0.06),
          );
      for (let f = 0; f < 4; f++) {
        const face = new T.Group();
        face.rotation.y = (f * Math.PI) / 2;
        g.add(face);
        place(
          face,
          new T.BoxGeometry(w * 0.44, h * 0.7, 0.06),
          kit.lattice(),
          0,
          y + h * 0.42,
          half - 0.06,
        );
        for (const s of [-1, 1])
          place(
            face,
            new T.BoxGeometry(w * 0.16, h * 0.36, 0.05),
            kit.lattice(),
            s * w * 0.33,
            y + h * 0.55,
            half - 0.065,
          );
      }
      place(g, new T.BoxGeometry(w + 0.06, 0.14, w + 0.06), kit.beam(), 0, y + h + 0.07, 0);
      const lift = top ? 0.34 : 0.26,
        overhang = 0.55 - i * 0.02,
        eave = y + h + 0.14;
      roof(g, {
        width: w,
        depth: w,
        height: top ? 0.95 : 0.36,
        overhang,
        lift,
        y: eave,
        thickness: 0.1,
        material: kit.tileGreen(),
      });
      const reach = (half + overhang) * 0.97;
      for (const sx of [-1, 1])
        for (const sz of [-1, 1])
          place(g, windBell, kit.bronze(), sx * reach, eave + lift - 0.3, sz * reach).castShadow =
            false;
      // 上一层墙体从瓦面内部升起，保持衔接。
      y += h + (top ? 0 : 0.14);
    }
    // 塔刹串联七只铜环，顶部金珠保持微光。
    const crown = y + 0.14 + 0.95;
    place(g, new T.CylinderGeometry(0.05, 0.07, 1.5, 8), kit.bronze(), 0, crown + 0.7);
    for (let k = 0; k < 7; k++)
      place(
        g,
        new T.CylinderGeometry(0.24 - k * 0.018, 0.24 - k * 0.018, 0.05, 16),
        kit.bronze(),
        0,
        crown + 0.2 + k * 0.15,
      ).castShadow = false;
    place(g, new T.SphereGeometry(0.2, 16, 12), kit.gold(), 0, crown + 1.5);
    mesh(g, new T.SphereGeometry(0.11, 12, 8), p.glow, 0, crown + 1.78).castShadow = false;
  },
  /** 猫咪识别展区为白墙竹院，纸白卧猫置于平石上。 */
  forest(g, p) {
    void p;
    [
      [-2, -1],
      [2, -1],
      [0, -2.5],
    ].forEach(([x, z], i) =>
      bamboo(g, x, z, { height: 4.3 + i * 0.25, culms: 9, radius: 0.2, y: 0.07, seed: i + 3 }),
    );
    // 墙脚低于台缘，两端衔接台外地面。
    const wall = new T.Group();
    wall.position.set(0, 0, -3.6);
    g.add(wall);
    place(wall, new T.BoxGeometry(4.28, 0.4, 0.3), kit.stoneDark(), 0, 0.1);
    place(wall, new T.BoxGeometry(4.2, 2.4, 0.24), kit.plaster(), 0, 1.5);
    roof(wall, {
      width: 4.2,
      depth: 0.24,
      height: 0.2,
      overhang: 0.2,
      lift: 0.05,
      thickness: 0.06,
      y: 2.7,
    });
    for (const s of [-1, 1]) {
      const window = place(wall, new T.CircleGeometry(0.68, 40), kit.lattice(), 0, 1.55, s * 0.135);
      window.rotation.y = s > 0 ? 0 : Math.PI;
      window.castShadow = false;
      place(wall, new T.TorusGeometry(0.72, 0.07, 6, 40), kit.stoneDark(), 0, 1.55, s * 0.14);
    }
    place(g, new T.CylinderGeometry(1, 1.08, 0.2, 9), kit.rock(), 0, 0.17, 1);
    const cat = catSculpture();
    cat.position.y = 0.27;
    g.add(cat);
    // 墨色爪印从访客一侧延伸。
    for (const [i, [x, z, a]] of [
      [-0.5, 3.5, 0.2],
      [0.35, 2.9, -0.15],
      [-0.3, 2.3, 0.1],
    ].entries()) {
      const paw = new T.Group();
      paw.position.set(x, 0.07, z);
      paw.rotation.y = a + (i % 2 ? 0.2 : -0.2);
      g.add(paw);
      place(paw, new T.CylinderGeometry(0.12, 0.12, 0.03, 12), kit.ink(), 0, 0.015, 0).castShadow =
        false;
      for (const [tx, tz] of [
        [-0.13, -0.14],
        [-0.045, -0.2],
        [0.045, -0.2],
        [0.13, -0.14],
      ])
        place(
          paw,
          new T.CylinderGeometry(0.045, 0.045, 0.03, 8),
          kit.ink(),
          tx,
          0.015,
          tz,
        ).castShadow = false;
    }
  },
  /** 表情识别展品为屏座铜镜，配七枚情绪珐琅章。 */
  mirror(g, p) {
    void p;
    podium(g, 4.5, 3, 0.4, 0, 0, 0.07);
    const frame = kit.timber(),
      y0 = 0.47;
    for (const x of [-1.93, 1.93]) {
      place(g, new T.BoxGeometry(0.24, 4.9, 0.3), frame, x, y0 + 2.45, 0);
      // 雕花柱脚支撑立柱。
      place(g, new T.BoxGeometry(0.42, 0.34, 1.5), frame, x, y0 + 0.17, 0);
      for (const s of [-1, 1])
        place(g, new T.SphereGeometry(0.12, 10, 6), frame, x, y0 + 0.36, s * 0.62).scale.set(
          1,
          0.6,
          1.4,
        );
    }
    place(g, new T.BoxGeometry(4.1, 0.26, 0.32), frame, 0, y0 + 4.85, 0);
    place(g, new T.BoxGeometry(4.1, 0.2, 0.32), frame, 0, y0 + 0.72, 0);
    place(g, new T.BoxGeometry(3.62, 0.5, 0.1), kit.lattice(), 0, y0 + 0.37, 0);
    place(g, new T.BoxGeometry(3.62, 3.9, 0.16), kit.ink(), 0, y0 + 2.77, 0);
    const centre = y0 + 2.72;
    const mirror = worldMirror(3.3, 3.3, true);
    mirror.position.set(0, centre, 0.2);
    g.add(mirror);
    place(g, new T.TorusGeometry(1.69, 0.1, 8, 72), kit.bronze(), 0, centre, 0.19);
    const enamel = ["#b8432f", "#dcb04c", "#4f9a80", "#3f6f8f", "#7d5a8e", "#d58b52", "#5b554c"];
    enamel.forEach((c, i) => {
      const medal = place(
        g,
        new T.CylinderGeometry(0.12, 0.12, 0.05, 20),
        material(c, 0.4, 0.05),
        -1.5 + i * 0.5,
        y0 + 4.85,
        0.18,
      );
      medal.rotation.x = Math.PI / 2;
      place(
        g,
        new T.TorusGeometry(0.12, 0.022, 5, 20),
        kit.gold(),
        -1.5 + i * 0.5,
        y0 + 4.85,
        0.2,
      ).castShadow = false;
    });
    // 屏风顶部饰金色日轮。
    place(g, new T.CylinderGeometry(0.34, 0.34, 0.1, 32), kit.gold(), 0, y0 + 5.3, 0).rotation.x =
      Math.PI / 2;
    for (const s of [-1, 1]) {
      const flame = place(g, new T.ConeGeometry(0.08, 0.34, 6), kit.gold(), s * 0.42, y0 + 5.08, 0);
      flame.rotation.z = s * 0.9;
    }
  },
  /** 双盲诗展区包含紫藤月门、画案及标为甲乙的无署名立轴。 */
  garden(g, p) {
    void p;
    for (const x of [-2, 2]) {
      place(g, new T.BoxGeometry(0.34, 3.7, 0.42), kit.stone(), x, 0.07 + 1.85, 0);
      place(g, new T.BoxGeometry(0.48, 0.18, 0.56), kit.stoneDark(), x, 0.16, 0);
    }
    place(g, new T.TorusGeometry(2, 0.2, 6, 40, Math.PI), kit.stone(), 0, 3.77, 0);
    const vine = material("#4f7d5e", 0.95, 0, "foliage"),
      bloom = material("#9a7bb5", 0.9, 0, "foliage"),
      bloomPale = material("#c4aed6", 0.9, 0, "foliage");
    for (let i = 1; i < 15; i++) {
      const a = (i * Math.PI) / 15,
        x = Math.cos(a) * 2,
        y = 3.77 + Math.sin(a) * 2;
      const leaf = mesh(g, new T.IcosahedronGeometry(0.2, 0), vine, x, y + 0.05, 0.08);
      leaf.scale.set(1.4, 0.6, 1.1);
      leaf.rotation.z = a;
      if (i % 2 === 0)
        for (const z of [-0.12, 0.18]) {
          const raceme = mesh(
            g,
            new T.ConeGeometry(0.08, 0.48 + (i % 3) * 0.12, 6),
            i % 4 ? bloom : bloomPale,
            x,
            y - 0.32 - (i % 3) * 0.06,
            z,
          );
          raceme.rotation.x = Math.PI;
          raceme.castShadow = false;
        }
    }
    // 画案上摆放手卷、砚台与笔筒。
    const top = 0.07 + 0.8;
    place(g, new T.BoxGeometry(2.6, 0.08, 1.1), kit.timber(), 0, top, 0);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        place(
          g,
          new T.BoxGeometry(0.08, 0.76, 0.08),
          kit.timber(),
          sx * 1.18,
          0.07 + 0.38,
          sz * 0.44,
        );
    for (const sx of [-1, 1])
      place(g, new T.BoxGeometry(0.06, 0.06, 0.9), kit.timber(), sx * 1.18, 0.2, 0);
    const paper = place(
      g,
      new T.BoxGeometry(1.3, 0.006, 0.36),
      kit.paper(),
      -0.15,
      top + 0.043,
      0.12,
    );
    paper.castShadow = false;
    for (let k = 0; k < 9; k++)
      place(
        g,
        new T.BoxGeometry(0.012, 0.004, 0.26),
        kit.ink(),
        -0.7 + k * 0.12,
        top + 0.048,
        0.12,
      ).castShadow = false;
    for (const x of [-0.82, 0.52])
      place(
        g,
        new T.CylinderGeometry(0.035, 0.035, 0.42, 8),
        kit.lacquer(),
        x,
        top + 0.075,
        0.12,
      ).rotation.x = Math.PI / 2;
    place(g, new T.BoxGeometry(0.28, 0.05, 0.2), kit.ink(), 0.85, top + 0.065, 0.15);
    place(g, new T.CylinderGeometry(0.08, 0.07, 0.22, 12), kit.celadon(), 0.88, top + 0.15, -0.25);
    for (let k = 0; k < 4; k++) {
      const brush = place(
        g,
        new T.CylinderGeometry(0.008, 0.01, 0.36, 5),
        kit.timberLight(),
        0.88 + (k - 1.5) * 0.025,
        top + 0.32,
        -0.25,
      );
      brush.rotation.z = (k - 1.5) * 0.12;
    }
    // 两幅无署名立轴分别来自人类与模型，由访客辨别。
    place(g, new T.BoxGeometry(2.1, 0.06, 0.06), kit.timber(), 0, top + 1.6, -0.42);
    for (const sx of [-1, 1])
      place(g, new T.BoxGeometry(0.06, 1.65, 0.06), kit.timber(), sx * 1.02, top + 0.82, -0.42);
    const poems: [string, string[], string][] = [
      ["甲", ["行到水穷处", "坐看云起时"], "#3f6f8f"],
      ["乙", ["山光悦鸟性", "潭影空人心"], "#4f8f78"],
    ];
    poems.forEach(([label, lines, mount], i) => {
      const scroll = mesh(
        g,
        new T.PlaneGeometry(0.42, 1.26),
        exact(
          new T.MeshBasicMaterial({
            map: hangingScroll(label, lines, mount),
            toneMapped: false,
            side: T.DoubleSide,
          }),
        ),
        i ? 0.32 : -0.32,
        top + 0.95,
        -0.4,
      );
      scroll.castShadow = false;
      place(
        g,
        new T.CylinderGeometry(0.018, 0.018, 0.5, 6),
        kit.ink(),
        i ? 0.32 : -0.32,
        top + 0.32,
        -0.4,
      ).rotation.z = Math.PI / 2;
    });
    // 两只青瓷园凳供读者休息。
    for (const x of [-1.65, 1.65]) drumStool(g, x, 1.25, 0.3, 0.46, kit.celadon(), 0.07);
    scholarRock(g, -2.65, -0.7, 0.9, 0.07);
    scholarRock(g, 2.65, -0.7, 0.75, 0.07);
    place(g, new T.CylinderGeometry(0.42, 0.32, 0.24, 8), kit.celadon(), 0, 0.19, -2.55);
    paintedTree(g, 0, -2.55, 0.42, "blossom", 0.31);
  },
  /** 推荐展品为三层漆盒，各层表示排序架，以绢结连接。 */
  gift(g, p) {
    void p;
    place(g, new T.BoxGeometry(3.1, 0.3, 3.1), kit.stone(), 0, 0.22, 0);
    let y = 0.37;
    for (let i = 0; i < 3; i++) {
      const h = 0.64;
      place(g, new T.BoxGeometry(2.5, h - 0.08, 2.5), kit.lacquer(), 0, y + h / 2, 0);
      place(g, new T.BoxGeometry(2.54, 0.08, 2.54), kit.ink(), 0, y + 0.04, 0);
      place(g, new T.BoxGeometry(2.56, 0.035, 2.56), kit.gold(), 0, y + h - 0.02, 0);
      for (let f = 0; f < 4; f++) {
        const face = new T.Group();
        face.rotation.y = (f * Math.PI) / 2;
        g.add(face);
        const roundel = place(
          face,
          new T.CylinderGeometry(0.2, 0.2, 0.03, 24),
          kit.gold(),
          0,
          y + h * 0.52,
          1.255,
        );
        roundel.rotation.x = Math.PI / 2;
        roundel.castShadow = false;
        for (const s of [-1, 1])
          place(
            face,
            new T.BoxGeometry(0.1, 0.3, 0.02),
            kit.paper(),
            s * (0.55 + i * 0.08),
            y + h * 0.52,
            1.255,
          ).castShadow = false;
      }
      y += h;
    }
    place(g, new T.BoxGeometry(2.62, 0.16, 2.62), kit.ink(), 0, y + 0.08, 0);
    place(g, new T.BoxGeometry(2.2, 0.14, 2.2), kit.lacquer(), 0, y + 0.23, 0);
    place(g, new T.BoxGeometry(2.24, 0.03, 2.24), kit.gold(), 0, y + 0.31, 0);
    // 弯木提梁跨过盒盖。
    const handle = new T.CatmullRomCurve3(
      [
        [-1.38, 0.37],
        [-1.38, 2.9],
        [-1.2, 3.32],
        [-0.6, 3.45],
        [0.6, 3.45],
        [1.2, 3.32],
        [1.38, 2.9],
        [1.38, 0.37],
      ].map(([x, yy]) => new T.Vector3(x, yy, 0)),
    );
    place(g, new T.TubeGeometry(handle, 48, 0.07, 8, false), kit.ink());
    for (const s of [-1, 1])
      place(g, new T.BoxGeometry(0.24, 0.18, 0.5), kit.gold(), s * 1.38, 0.46, 0);
    // 朱红绳结与流苏悬于框架肩部。
    const knot = new T.Group();
    knot.position.set(1.45, 2.62, 0);
    g.add(knot);
    place(knot, new T.CylinderGeometry(0.006, 0.006, 0.3, 4), kit.lacquer(), 0, 0.15, 0);
    const diamond = place(knot, new T.BoxGeometry(0.3, 0.3, 0.05), kit.lacquer(), 0, -0.12, 0);
    diamond.rotation.z = Math.PI / 4;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2,
        loop = place(
          knot,
          new T.TorusGeometry(0.07, 0.02, 5, 12),
          kit.lacquer(),
          Math.cos(a) * 0.24,
          -0.12 + Math.sin(a) * 0.24,
          0,
        );
      loop.castShadow = false;
    }
    place(knot, new T.CylinderGeometry(0.03, 0.09, 0.5, 8), kit.lacquer(), 0, -0.6, 0);
  },
  bubble(g, p) {
    mesh(g, new T.CylinderGeometry(3.5, 3.5, 0.5, 48), p.stone, 0, 0.25);
    mesh(g, new T.CylinderGeometry(2.6, 2.6, 0.15, 64), material("#4f8a80", 0.28, 0.15), 0, 0.6);
    const glass = new T.MeshPhysicalMaterial({
      color: "#d8e6df",
      roughness: 0.15,
      transparent: true,
      opacity: 0.15,
      depthWrite: false,
      side: T.DoubleSide,
    });
    mesh(g, new T.CylinderGeometry(2.15, 2.15, 2.8, 48, 1, true), glass, 0, 2.1).castShadow = false;
    mesh(
      g,
      new T.CylinderGeometry(2.04, 2.04, 2.45, 48),
      new T.MeshPhysicalMaterial({
        color: "#8fbcae",
        roughness: 0.23,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
      0,
      1.94,
    ).castShadow = false;
    const bubble = mesh(
      g,
      new T.SphereGeometry(0.45, 24, 16),
      new T.MeshPhysicalMaterial({
        color: "#e2efe8",
        metalness: 0.1,
        roughness: 0.12,
        transparent: true,
        opacity: 0.48,
        clearcoat: 1,
      }),
      0,
      1.4,
    );
    bubble.name = "pulse";
    ring(g, 3, 0.8, kit.bronze());
    for (const x of [-3, 3]) box(g, p, 0.3, 3, 0.3, x, 1.5, 0, kit.timber());
    for (let i = 0; i < 40; i++) {
      const a = (i * Math.PI) / 20,
        tick = box(
          g,
          p,
          0.025,
          0.018,
          i % 5 === 0 ? 0.28 : 0.13,
          Math.sin(a) * 2.83,
          0.695,
          Math.cos(a) * 2.83,
          p.dark,
        );
      tick.rotation.y = a;
    }
    for (const y of [0.76, 3.46]) ring(g, 2.16, y, kit.bronze());
    for (const x of [-3, 3]) {
      box(g, p, 0.44, 0.12, 0.44, x, 3.02, 0, p.stone);
      box(g, p, 0.06, 2.4, 0.34, x, 1.68, 0.03, kit.bronze());
    }
  },
  light(g, p) {
    builders.bubble(g, p);
    g.getObjectByName("pulse")!.scale.setScalar(0.65);
    g.getObjectByName("pulse")!.position.y = 3.1;
    mesh(g, new T.IcosahedronGeometry(0.5, 1), p.glow, 0, 3.1);
    const orbit = ring(g, 2.8, 3.1, kit.gold());
    orbit.rotation.x = 0.4;
  },
  gallery(g, p) {
    box(g, p, 7, 0.5, 5, 0, 0.25, 0, p.stone);
    box(g, p, 7, 4.5, 0.35, 0, 2.5, -2, kit.plaster());
    box(g, p, 0.35, 4.5, 4, -3.3, 2.5, 0, kit.plaster());
    for (let i = 0; i < 3; i++) {
      box(g, p, 1.75, 2.7, 0.15, -2.2 + i * 2.2, 2.8, -1.75, kit.timber());
      box(g, p, 1.4, 2.35, 0.18, -2.2 + i * 2.2, 2.8, -1.65, kit.paper());
      const painting = mesh(
        g,
        new T.PlaneGeometry(1.34, 2.29),
        artwork(i),
        -2.2 + i * 2.2,
        2.8,
        -1.548,
      );
      painting.castShadow = false;
      painting.name = `gallery-art-${i}`;
      box(g, p, 0.6, 0.16, 0.025, -2.2 + i * 2.2, 1.25, -1.75, kit.paper());
    }
    box(g, p, 3, 0.3, 0.8, 0, 1, 1, kit.timber());
    roof(g, { width: 7, depth: 2.2, height: 0.5, overhang: 0.4, lift: 0.18, y: 4.75, z: -0.9 });
  },
  music(g, p) {
    mesh(g, new T.CylinderGeometry(3.6, 3.6, 0.5, 40), p.stone, 0, 0.25);
    box(g, p, 3.6, 1.8, 1.5, 0, 1.6, 0, kit.ink());
    for (let i = 0; i < 12; i++)
      box(g, p, 0.25, 0.12, 0.6, -1.5 + i * 0.27, 1.85, 1, i % 3 === 0 ? kit.ink() : kit.paper());
    for (let i = 0; i < 11; i++)
      if (i % 7 !== 2 && i % 7 !== 6)
        box(g, p, 0.12, 0.12, 0.35, -1.365 + i * 0.27, 1.95, 0.86, kit.ink());
    const lid = box(g, p, 3.55, 0.1, 1.55, 0, 2.65, -0.05, kit.lacquer());
    lid.rotation.x = -0.12;
    box(g, p, 1.25, 0.85, 0.08, 0, 2.4, 0.6, kit.paper());
    for (let i = 0; i < 5; i++) box(g, p, 1.02, 0.015, 0.012, 0, 2.16 + i * 0.105, 0.65, kit.ink());
    for (const x of [-1.4, 1.4]) box(g, p, 0.25, 1.2, 0.25, x, 0.7, 0, kit.ink());
  },
  /** 未名展区为有顶亭台，MV 作为画屏，两侧设鼓，漆架唱片转动。 */
  studio(g, p) {
    place(g, new T.BoxGeometry(8, 0.44, 6), kit.stone(), 0, 0.22, 0);
    place(g, new T.BoxGeometry(8.06, 0.06, 6.06), kit.timberLight(), 0, 0.47, 0);
    // 后屏墙为木框粉墙，内嵌 MV 显示外壳。
    place(g, new T.BoxGeometry(7.5, 4.75, 0.36), kit.plaster(), 0, 0.5 + 2.375, -2);
    for (const y of [0.6, 5.15])
      place(g, new T.BoxGeometry(7.6, 0.12, 0.42), kit.timber(), 0, y, -2);
    const screen = box(g, p, 6.7, 3.4, 0.12, 0, 3, -1.765, kit.ink());
    screen.name = "studio-screen-housing";
    for (const [w, h, x, y] of [
      [6, 0.08, 0, 1.33],
      [6, 0.08, 0, 4.67],
      [0.08, 3.42, -2.96, 3],
      [0.08, 3.42, 2.96, 3],
    ] as number[][])
      place(g, new T.BoxGeometry(w, h, 0.04), kit.gold(), x, y, -1.69).castShadow = false;
    const play = mesh(g, new T.ConeGeometry(0.7, 1.1, 3), p.glow, 0, 3, -1.5);
    play.name = "studio-play-placeholder";
    play.rotation.z = -Math.PI / 2;
    play.rotation.y = Math.PI / 2;
    // 四根漆柱承托覆盖舞台的绿瓦庑殿顶。
    for (const x of [-3.85, 3.85])
      for (const z of [-2, 2.8]) column(g, x, z, 5.2, 0.17, kit.lacquer(), 0.5);
    for (const z of [-2, 2.8]) beam(g, 8.1, 0, 5.98, z, 0, 0.3, 0.24);
    for (const x of [-3.85, 3.85]) beam(g, 5.1, x, 5.98, 0.4, Math.PI / 2, 0.3, 0.24);
    for (let i = 0; i < 12; i++)
      place(
        g,
        new T.BoxGeometry(0.18, 0.14, 0.34),
        kit.malachite(),
        -3.6 + i * 0.655,
        6.2,
        2.8,
      ).castShadow = false;
    place(g, new T.BoxGeometry(8.3, 0.12, 5.3), kit.timber(), 0, 6.33, 0.4);
    roof(g, {
      width: 7.9,
      depth: 4.9,
      height: 1.5,
      overhang: 0.95,
      lift: 0.42,
      y: 6.38,
      z: 0.4,
      material: kit.tileGreen(),
    });
    // 三脚架上的桶鼓。
    const drum = new T.LatheGeometry(
      [
        [0.3, -0.26],
        [0.36, -0.16],
        [0.39, 0],
        [0.36, 0.16],
        [0.3, 0.26],
      ].map(([r, h]) => new T.Vector2(r, h)),
      20,
    ).rotateX(Math.PI / 2);
    for (const x of [-3.2, 3.2]) {
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + Math.PI / 2,
          leg = place(
            g,
            new T.CylinderGeometry(0.03, 0.04, 0.95, 6),
            kit.timber(),
            x + Math.cos(a) * 0.22,
            0.95,
            0.9 + Math.sin(a) * 0.22,
          );
        leg.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2);
      }
      place(g, drum, kit.lacquer(), x, 1.62, 0.9);
      for (const s of [-1, 1]) {
        const head = place(g, new T.CircleGeometry(0.3, 20), kit.paper(), x, 1.62, 0.9 + s * 0.262);
        head.rotation.y = s > 0 ? 0 : Math.PI;
        head.castShadow = false;
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          place(
            g,
            new T.SphereGeometry(0.018, 5, 4),
            kit.gold(),
            x + Math.cos(a) * 0.31,
            1.62 + Math.sin(a) * 0.31,
            0.9 + s * 0.25,
          ).castShadow = false;
        }
      }
    }
    // 铜质话筒。
    mesh(g, new T.CylinderGeometry(0.04, 0.06, 1.6, 8), kit.bronze(), -1.5, 1.3, 1.3);
    mesh(g, new T.CylinderGeometry(0.2, 0.24, 0.06, 16), kit.bronze(), -1.5, 0.53, 1.3);
    mesh(g, new T.CapsuleGeometry(0.1, 0.22, 4, 8), kit.ink(), -1.5, 2.2, 1.3);
    // 漆架上的唱片持续转动。
    place(g, new T.BoxGeometry(1.3, 0.1, 0.95), kit.lacquer(), 2, 1.9, 1.1);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        place(
          g,
          new T.BoxGeometry(0.07, 1.35, 0.07),
          kit.ink(),
          2 + sx * 0.58,
          1.18,
          1.1 + sz * 0.4,
        );
    place(g, new T.BoxGeometry(1.2, 0.06, 0.85), kit.ink(), 2, 0.82, 1.1);
    const record = mesh(g, new T.CylinderGeometry(0.4, 0.4, 0.035, 48), kit.ink(), 2, 1.97, 1.1);
    mesh(g, new T.CylinderGeometry(0.13, 0.13, 0.04, 32), kit.lacquer(), 2, 1.99, 1.1);
    for (const radius of [0.23, 0.29, 0.35]) {
      const groove = mesh(
        g,
        new T.TorusGeometry(radius, 0.005, 4, 48),
        kit.stoneDark(),
        2,
        1.993,
        1.1,
      );
      groove.rotation.x = Math.PI / 2;
      groove.castShadow = false;
    }
    record.castShadow = false;
    mesh(g, new T.BoxGeometry(0.035, 0.035, 0.55), kit.bronze(), 2.46, 2.06, 1.12);
    // 莲花脚灯沿舞台边缘排列。
    for (let i = 0; i < 6; i++) {
      const x = -2.75 + i * 1.1;
      place(g, new T.CylinderGeometry(0.09, 0.12, 0.1, 8), kit.bronze(), x, 0.55, 2.75);
      place(g, new T.SphereGeometry(0.09, 10, 6), kit.lamp(), x, 0.64, 2.75).castShadow = false;
    }
  },
};
export function buildExhibit(kind: string, color: string) {
  const group = new T.Group(),
    accent = pigmentAccent(color);
  const glow = new T.MeshStandardMaterial({
    color: accent,
    emissive: accent,
    emissiveIntensity: 0.25,
    roughness: 0.5,
  });
  glow.userData.nightGlow = true;
  const p: Palette = {
    main: material(accent, 0.6, 0.04),
    dark: kit.ink(),
    stone: kit.stone(),
    glow,
  };
  // 圆形石台配线脚边缘与岛屿色带。
  mesh(
    group,
    new T.LatheGeometry(
      [
        [0, -0.25],
        [4.05, -0.25],
        [4.05, -0.06],
        [3.88, 0.02],
        [3.78, 0.05],
        [3.7, 0.07],
        [0, 0.07],
      ].map(([r, y]) => new T.Vector2(r, y)),
      72,
    ),
    kit.stone(),
  );
  mesh(
    group,
    new T.LatheGeometry(
      [
        [3.42, 0.05],
        [3.56, 0.05],
        [3.56, 0.085],
        [3.42, 0.085],
        [3.42, 0.05],
      ].map(([r, y]) => new T.Vector2(r, y)),
      72,
    ),
    p.main,
  ).castShadow = false;
  (builders[kind] ?? builders.gallery)(group, p);
  return group;
}
