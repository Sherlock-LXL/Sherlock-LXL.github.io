import * as T from "three";
import { material, mesh } from "./architecture";
import { batchStatic } from "./optimizer";

const smooth = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** 岛屿岩基与海面交接处的平均半径供水面泡沫使用。 */
export const shoreRadius = (radius: number) => radius * 1.085 + 0.35;
/** [高度、径向缩放、角向起伏（米）]；交替立面与台阶形成岩层。 */
const profile: [number, number, number][] = [
  [-0.2, 1, 0.02],
  [-0.5, 1.003, 0.1],
  [-0.9, 0.998, 0.18],
  [-1.12, 1.03, 0.32],
  [-1.65, 1.022, 0.34],
  [-2.15, 1.014, 0.4],
  [-2.38, 1.05, 0.5],
  [-2.95, 1.042, 0.52],
  [-3.5, 1.035, 0.56],
  [-3.72, 1.068, 0.6],
  [-4.3, 1.062, 0.62],
  [-4.95, 1.07, 0.55],
  [-5.45, 1.082, 0.45],
  [-5.9, 1.1, 0.5],
  [-6.6, 1.12, 0.55],
];
const tones = {
  moss: new T.Color("#9abb8b"),
  mossDeep: new T.Color("#76a48e"),
  azurite: new T.Color("#81aab2"),
  ochre: new T.Color("#cbb997"),
  umber: new T.Color("#a5967c"),
  wet: new T.Color("#668988"),
  sand: new T.Color("#e3d2ab"),
};

/** 雕塑仅延伸至行走面下方；openings 为局部 atan2(z,x) 角及半宽，用于桥头和码头的直壁开口。 */
export function islandFoundation(
  radius: number,
  x: number,
  z: number,
  openings: { angle: number; half: number }[] = [],
) {
  const group = new T.Group();
  group.name = "stratified-island";
  group.position.set(x, 0, z);
  const sectors = 176,
    positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const seed = x * 0.37 + z * 0.71,
    open = (a: number) =>
      openings.reduce((m, o) => {
        const d = Math.abs(Math.atan2(Math.sin(a - o.angle), Math.cos(a - o.angle)));
        return Math.max(m, 1 - smooth(o.half, o.half + 0.28, d));
      }, 0);
  let previous: number[] = [];
  for (let row = 0; row < profile.length; row++) {
    const [height, scale, relief] = profile[row],
      ring: number[] = [];
    for (let j = 0; j <= sectors; j++) {
      const a = (j / sectors) * Math.PI * 2,
        calm = 1 - open(a) * 0.85;
      const n =
        Math.sin(a * 5 + seed + row * 0.9) * 0.5 +
        Math.sin(a * 11 - seed * 1.3 + row * 1.7) * 0.3 +
        Math.sin(a * 23 + row * 2.3) * 0.2;
      let r = radius * (1 + (scale - 1) * calm) + n * relief * calm;
      if (row && r < previous[j] - 0.12) r = previous[j] - 0.12;
      ring.push(r);
      const y =
        height +
        (row === 0 || row === profile.length - 1 ? 0 : Math.sin(a * 9 + row * 1.3 + seed) * 0.07);
      positions.push(Math.cos(a) * r, y, Math.sin(a) * r);
      uvs.push((j / sectors) * radius * 2, -height / 2);
      // 面与下方台地检测均朝向海面。
      if (row < profile.length - 1 && j < sectors) {
        const p = row * (sectors + 1) + j,
          q = p + sectors + 1;
        indices.push(p, p + 1, q, q, p + 1, q + 1);
      }
    }
    previous = ring;
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  // 岩壁用赭石，台地用石绿，潮线用深色湿石。
  const normals = geo.attributes.normal,
    colors: number[] = [],
    c = new T.Color();
  for (let i = 0; i < normals.count; i++) {
    const y = positions[i * 3 + 1],
      up = normals.getY(i),
      a = Math.atan2(positions[i * 3 + 2], positions[i * 3]);
    const band = 0.5 + 0.5 * Math.sin(y * 5.3 + Math.sin(a * 3 + seed) * 0.8);
    c.copy(tones.ochre).lerp(tones.umber, smooth(-1.5, -4.2, y) * 0.75 + band * 0.18);
    c.lerp(
      tones.azurite,
      smooth(0.1, 0.9, Math.sin(a * 4 + seed * 2) * 0.5 + 0.5) * 0.22 * smooth(-0.8, -3, y),
    );
    c.lerp(tones.wet, smooth(-4.6, -5.7, y));
    const shelf = smooth(0.32, 0.72, up);
    c.lerp(y > -4.4 ? (band > 0.5 ? tones.moss : tones.mossDeep) : tones.sand, shelf * 0.85);
    c.multiplyScalar(0.94 + 0.08 * Math.sin(a * 31 + y * 7));
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  const stone = material("#ffffff", 0.96, 0, "cliff");
  stone.vertexColors = true;
  mesh(group, geo, stone);
  // 风化石聚于岩基与水面交界，避开所有开口。
  const rockGeometries = [0, 1, 2].map((k) => {
    const g = new T.IcosahedronGeometry(1, 1),
      p = g.attributes.position,
      colorsRock: number[] = [];
    for (let i = 0; i < p.count; i++) {
      const vx = p.getX(i),
        vy = p.getY(i),
        vz = p.getZ(i),
        s = 1 + 0.18 * Math.sin(vx * 3.1 + k * 2 + vz * 2.3) + 0.1 * Math.sin(vy * 5.7 - k);
      p.setXYZ(i, vx * s, vy * s * (vy > 0 ? 1 : 0.6), vz * s);
      const tone = tones.ochre
        .clone()
        .lerp(tones.umber, 0.4)
        .lerp(tones.wet, smooth(0.2, -0.6, vy));
      if (vy > 0.55) tone.lerp(tones.moss, 0.6);
      colorsRock.push(tone.r, tone.g, tone.b);
    }
    g.setAttribute("color", new T.Float32BufferAttribute(colorsRock, 3));
    g.computeVertexNormals();
    return g;
  });
  const rock = material("#ffffff", 0.95, 0, "stone");
  rock.vertexColors = true;
  const count = Math.round(radius * 1.5);
  for (let i = 0; i < count; i++) {
    const a = i * 2.39996 + seed;
    if (open(a) > 0.05) continue;
    const r = shoreRadius(radius) + (-0.6 + (i % 5) * 0.35),
      s = 0.45 + (((i * 7) % 11) / 11) * 1.15;
    const boulder = mesh(
      group,
      rockGeometries[i % 3],
      rock,
      Math.cos(a) * r,
      -5.75 + s * 0.25,
      Math.sin(a) * r,
    );
    boulder.scale.set(s * (1.1 + (i % 3) * 0.3), s * (0.7 + (i % 4) * 0.18), s);
    boulder.rotation.set((i % 7) * 0.3, a, (i % 5) * 0.2);
    boulder.castShadow = false;
  }
  return { group, release: batchStatic(group) };
}
