import * as T from "three";

export type VesselKind = "sampan" | "junk" | "fishing";
const mat = (color: string, roughness = 0.82) =>
  new T.MeshStandardMaterial({ color, roughness, metalness: 0.03 });
const put = (g: T.Object3D, geo: T.BufferGeometry, m: T.Material, x = 0, y = 0, z = 0) => {
  const o = new T.Mesh(geo, m);
  o.position.set(x, y, z);
  g.add(o);
  return o;
};
const line = (g: T.Object3D, points: T.Vector3[], radius: number, m: T.Material) =>
  put(
    g,
    new T.TubeGeometry(
      new T.CatmullRomCurve3(points),
      Math.max(8, points.length * 3),
      radius,
      6,
      false,
    ),
    m,
  );
const rod = (g: T.Object3D, a: T.Vector3, b: T.Vector3, r: number, m: T.Material) => {
  const v = b.clone().sub(a),
    o = put(g, new T.CylinderGeometry(r, r, v.length(), 7), m);
  o.position.copy(a).add(b).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), v.normalize());
  return o;
};
function surface(points: number[], indices: number[]) {
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(points, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** 连续放样船体，船首朝 +Z，甲板边缘与栏杆沿同一舷弧。 */
export function buildBoat(kind: VesselKind) {
  const root = new T.Group();
  root.name = `boat-${kind}`;
  root.userData.dynamic = true;
  const large = kind === "junk",
    small = kind === "sampan",
    length = large ? 3.7 : small ? 1.85 : 2.65,
    width = large ? 1.45 : small ? 0.72 : 1.02,
    depth = large ? 0.72 : small ? 0.38 : 0.52;
  const deckY = large ? 0.5 : small ? 0.28 : 0.38,
    timber = mat("#886a50"),
    deck = mat("#d3b788"),
    trim = mat(large ? "#d58067" : "#4d9490"),
    dark = mat("#375357"),
    ivory = mat("#f4eedc"),
    brass = mat("#d3ae6d", 0.5);
  const widthAt = (t: number) =>
    width *
    Math.pow(Math.max(0.0001, Math.sin(Math.PI * (0.16 + t * 0.84))), 0.72) *
    (1 - 0.12 * t);
  const sheer = (t: number) => deckY + 0.26 * Math.pow(Math.abs(2 * t - 1), 3) + 0.16 * t * t;
  const count = 40,
    section = [
      [-1, 1],
      [-0.88, 0.22],
      [-0.55, -0.7],
      [0, -1],
      [0.55, -0.7],
      [0.88, 0.22],
      [1, 1],
    ],
    positions: number[] = [],
    indices: number[] = [],
    colors: number[] = [];
  const upper = new T.Color(large ? "#558f88" : small ? "#ae855f" : "#68a0b0"),
    lower = new T.Color("#34565d"),
    color = new T.Color();
  for (let j = 0; j <= count; j++) {
    const t = j / count,
      z = (t * 2 - 1) * length,
      w = widthAt(t),
      rim = sheer(t);
    for (const [x, y] of section) {
      const h =
        y >= 0
          ? -depth * 0.12 + y * (rim + depth * 0.12)
          : y * depth * (0.65 + 0.35 * Math.sin(Math.PI * t));
      const rake = (1 - y) * (-0.26 * Math.pow(t, 6) + 0.07 * Math.pow(1 - t, 6));
      positions.push(x * w, h, z + rake);
      color.copy(lower).lerp(upper, Math.max(0, (y + 0.5) / 1.5));
      colors.push(color.r, color.g, color.b);
    }
    if (j < count)
      for (let i = 0; i < section.length - 1; i++) {
        const a = j * section.length + i,
          b = a + section.length;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
  }
  for (const j of [0, count])
    for (let i = 1; i < section.length - 1; i++) {
      const b = j * section.length;
      indices.push(...(j === 0 ? [b, b + i + 1, b + i] : [b, b + i, b + i + 1]));
    }
  const hull = surface(positions, indices);
  hull.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  put(
    root,
    hull,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.03 }),
  ).name = "shaped-hull";
  const top: number[] = [],
    topIndices: number[] = [];
  for (let j = 0; j <= count; j++) {
    const t = j / count;
    for (const s of [-1, 1])
      top.push(s * widthAt(t) * 0.98, sheer(t) - 0.045, (t * 2 - 1) * length);
    if (j < count) {
      const a = j * 2;
      topIndices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  put(root, surface(top, topIndices), deck).name = "fitted-deck";
  for (let j = 2; j < count; j += 2) {
    const t = j / count;
    put(
      root,
      new T.BoxGeometry(widthAt(t) * 1.93, 0.009, 0.016),
      timber,
      0,
      sheer(t) - 0.038,
      (t * 2 - 1) * length,
    );
  }
  for (const side of [-1, 1]) {
    const edge = Array.from({ length: 25 }, (_, i) => {
      const t = i / 24;
      return new T.Vector3(side * widthAt(t), sheer(t) + 0.012, (t * 2 - 1) * length);
    });
    line(root, edge, small ? 0.035 : 0.055, trim);
    if (!small) {
      const rail = Array.from({ length: 19 }, (_, i) => {
        const t = 0.1 + (i / 18) * 0.78;
        return new T.Vector3(side * widthAt(t) * 0.99, sheer(t) + 0.38, (t * 2 - 1) * length);
      });
      line(root, rail, 0.027, timber);
      for (let i = 0; i < 7; i++) {
        const t = 0.1 + (i / 6) * 0.78,
          x = side * widthAt(t) * 0.99,
          z = (t * 2 - 1) * length;
        rod(root, new T.Vector3(x, sheer(t), z), new T.Vector3(x, sheer(t) + 0.38, z), 0.027, trim);
      }
    }
  }
  // 曲顶篷布的肋条均落在甲板上。
  const arch = (
    g: T.Group,
    w: number,
    h: number,
    d: number,
    y: number,
    z: number,
    m: T.Material,
  ) => {
    const p: number[] = [],
      idx: number[] = [];
    for (let row = 0; row < 2; row++)
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * Math.PI;
        p.push((Math.cos(a) * w) / 2, y + Math.sin(a) * h, z + (row - 0.5) * d);
        if (row === 0 && i < 20) idx.push(i, i + 21, i + 1, i + 1, i + 21, i + 22);
      }
    m.side = T.DoubleSide;
    put(g, surface(p, idx), m);
    for (let j = 0; j < 5; j++)
      line(
        g,
        Array.from({ length: 17 }, (_, i) => {
          const a = (i / 16) * Math.PI;
          return new T.Vector3(
            Math.cos(a) * (w / 2 + 0.01),
            y + Math.sin(a) * (h + 0.012),
            z + (j / 4 - 0.5) * d,
          );
        }),
        0.018,
        timber,
      );
  };
  if (small) {
    arch(root, 1.13, 0.65, 1.72, deckY + 0.12, -0.32, ivory);
    for (const side of [-1, 1])
      put(root, new T.BoxGeometry(0.045, 0.16, 1.72), timber, side * 0.565, deckY + 0.05, -0.32);
    for (const z of [-1.25, 0.83])
      put(root, new T.BoxGeometry(1, 0.09, 0.25), timber, 0, sheer((z / length + 1) / 2) + 0.02, z);
    for (const side of [-1, 1]) {
      const oar = new T.Group();
      oar.position.set(side * 0.57, deckY + 0.16, 0.75);
      oar.rotation.y = side * 0.24;
      oar.rotation.x = -0.12;
      root.add(oar);
      put(oar, new T.CylinderGeometry(0.022, 0.022, 1.85, 6), timber, 0, 0, -0.15).rotation.x =
        Math.PI / 2;
      put(oar, new T.BoxGeometry(0.14, 0.035, 0.52), deck, 0, 0, -1.13);
    }
  } else {
    const cabinZ = large ? -1.73 : -0.72,
      cabinW = large ? 1.75 : 1.35,
      cabinD = large ? 1.5 : 1.65,
      cabinH = large ? 0.8 : 1.05;
    put(
      root,
      new T.BoxGeometry(cabinW, cabinH, cabinD),
      ivory,
      0,
      deckY + cabinH / 2 + 0.04,
      cabinZ,
    );
    for (const side of [-1, 1]) {
      for (const dz of [-0.43, 0, 0.43])
        put(
          root,
          new T.BoxGeometry(0.018, cabinH * 0.48, 0.28),
          dark,
          side * (cabinW / 2 + 0.011),
          deckY + cabinH * 0.58,
          cabinZ + dz,
        );
      for (const x of [-0.46, 0, 0.46])
        put(
          root,
          new T.BoxGeometry(0.3, cabinH * 0.48, 0.018),
          dark,
          x,
          deckY + cabinH * 0.58,
          cabinZ + side * (cabinD / 2 + 0.01),
        );
    }
    arch(root, cabinW + 0.3, 0.15, cabinD + 0.3, deckY + cabinH + 0.07, cabinZ, trim);
    if (large) {
      const sail = (z: number, h: number, w: number, yaw: number, m: T.Material, lift = 0) => {
        rod(
          root,
          new T.Vector3(0, deckY, z),
          new T.Vector3(0, deckY + h + 0.9 + lift, z),
          0.048,
          timber,
        );
        const rig = new T.Group();
        rig.position.set(0.045, deckY + 0.6 + lift, z);
        rig.rotation.y = yaw;
        root.add(rig);
        const point = (u: number, v: number) =>
          new T.Vector3(
            u * w * (1 - 0.22 * v + 0.09 * Math.sin(Math.PI * v)),
            v * h + u * 0.42,
            0.24 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v),
          );
        const p: number[] = [],
          idx: number[] = [],
          nx = 10,
          ny = 18;
        for (let j = 0; j <= ny; j++)
          for (let i = 0; i <= nx; i++) {
            const q = point(i / nx, j / ny);
            p.push(q.x, q.y, q.z);
            if (j < ny && i < nx) {
              const a = j * (nx + 1) + i,
                b = a + nx + 1;
              idx.push(a, a + 1, b, a + 1, b + 1, b);
            }
          }
        m.side = T.DoubleSide;
        put(rig, surface(p, idx), m).name = "curved-sail";
        for (let j = 0; j < 7; j++)
          line(
            rig,
            Array.from({ length: 9 }, (_, i) => point(i / 8, j / 6)),
            0.018,
            timber,
          );
        line(
          rig,
          Array.from({ length: 19 }, (_, i) => point(1, i / 18)),
          0.013,
          ivory,
        );
        for (const side of [-1, 1])
          rod(
            root,
            new T.Vector3(0, deckY + h + 0.75 + lift, z),
            new T.Vector3(side * width * 0.8, deckY + 0.3, z - 0.65),
            0.009,
            ivory,
          );
      };
      sail(0.95, 3.25, 2.15, Math.PI / 2 - 0.23, mat("#e2a274", 0.96));
      sail(-0.72, 2.1, 1.48, Math.PI / 2 + 0.1, mat("#efe0ac", 0.96), 0.62);
    } else {
      rod(root, new T.Vector3(0, deckY, 0.7), new T.Vector3(0, 3, 0.7), 0.035, timber);
      const pennant = surface([0, 0, 0, 0.48, -0.08, 0, 0, -0.28, 0], [0, 1, 2]),
        flag = mat("#df9076");
      flag.side = T.DoubleSide;
      put(root, pennant, flag, 0.03, 2.92, 0.7);
      for (const x of [-0.5, 0.5])
        put(root, new T.CylinderGeometry(0.24, 0.2, 0.36, 12), deck, x, deckY + 0.2, 1.25);
    }
    // 舵与系缆桩连接船尾和甲板。
    put(root, new T.BoxGeometry(0.07, 0.62, 0.48), timber, 0, -0.08, -length - 0.04);
    rod(
      root,
      new T.Vector3(0, 0, -length),
      new T.Vector3(0, deckY + 0.5, -length + 0.5),
      0.035,
      timber,
    );
    for (const side of [-1, 1])
      put(
        root,
        new T.BoxGeometry(0.25, 0.06, 0.07),
        brass,
        side * widthAt(0.15) * 0.85,
        sheer(0.15) + 0.07,
        -length * 0.7,
      );
  }
  root.userData.mooring = [
    new T.Vector3(-widthAt(0.15) * 0.85, sheer(0.15) + 0.08, -length * 0.7),
    new T.Vector3(widthAt(0.15) * 0.85, sheer(0.15) + 0.08, -length * 0.7),
  ];
  return root;
}
