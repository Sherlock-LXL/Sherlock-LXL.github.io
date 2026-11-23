import * as T from "three";
import { material, mesh } from "./architecture";
export { animalModel } from "./animal-models";

const clay = (color: string) => material(color, 0.92, 0, "plaster");
const cream = clay("#fff3dd"),
  ink = clay("#303a37"),
  jade = clay("#82ad98"),
  wood = clay("#90775b");
const sphere = new T.SphereGeometry(1, 14, 10);
function oval(
  g: T.Object3D,
  m: T.Material,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
) {
  const o = mesh(g, sphere, m, x, y, z);
  o.scale.set(sx, sy, sz);
  return o;
}
function rod(g: T.Object3D, m: T.Material, a: number[], b: number[], r: number, tip = r) {
  const from = new T.Vector3(...a),
    to = new T.Vector3(...b),
    o = mesh(g, new T.CylinderGeometry(tip, r, from.distanceTo(to), 8), m);
  o.position.copy(from).add(to).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), to.sub(from).normalize());
  return o;
}
function curl(g: T.Object3D, m: T.Material, points: number[][], r: number) {
  return mesh(
    g,
    new T.TubeGeometry(
      new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
      20,
      r,
      6,
      false,
    ),
    m,
  );
}
function eyes(g: T.Object3D, x: number, y: number, z: number, r = 0.038) {
  for (const s of [-1, 1]) {
    oval(g, ink, x * s, y, z, r, r * 1.12, r * 0.65);
    oval(g, cream, x * s - r * 0.2, y + r * 0.3, z + r * 0.56, r * 0.26, r * 0.26, r * 0.2);
  }
}

/** 便携物件沿用岛屿的陶、竹与雕石风格。 */
export function seasonalModel(kind: string) {
  const root = new T.Group();
  root.name = `portable-${kind}`;
  const coral = clay("#d69988"),
    blue = clay("#a4cccf"),
    gold = clay("#d7b978");
  const pot = (m: T.Material, r = 0.18, h = 0.35) => {
    mesh(root, new T.CylinderGeometry(r, r * 0.68, h, 16), m, 0, h / 2);
    mesh(root, new T.TorusGeometry(r, 0.022, 6, 24), m, 0, h).rotation.x = Math.PI / 2;
  };
  const basket = (tea: boolean) => {
    pot(wood, 0.25, 0.24);
    for (let i = 0; i < 5; i++)
      mesh(
        root,
        new T.TorusGeometry(0.19 + i * 0.012, 0.013, 5, 24),
        gold,
        0,
        0.035 + i * 0.042,
      ).rotation.x = Math.PI / 2;
    curl(
      root,
      wood,
      [
        [-0.23, 0.2, 0],
        [-0.2, 0.4, 0],
        [0, 0.49, 0],
        [0.2, 0.4, 0],
        [0.23, 0.2, 0],
      ],
      0.022,
    );
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4,
        r = 0.13 * Math.sqrt(i / 7);
      oval(
        root,
        tea ? jade : gold,
        Math.sin(a) * r,
        0.27,
        Math.cos(a) * r,
        0.065,
        tea ? 0.045 : 0.07,
        0.049,
      );
    }
  };
  if (kind === "peach-pot") {
    pot(blue, 0.14, 0.3);
    curl(
      root,
      wood,
      [
        [0, 0.22, 0],
        [-0.06, 0.48, 0],
        [0.05, 0.69, 0],
      ],
      0.012,
    );
    for (let i = 0; i < 5; i++) {
      const x = Math.sin(i * 3) * 0.12,
        y = 0.41 + i * 0.056;
      rod(root, wood, [0, y - 0.02, 0], [x, y, 0.01], 0.008);
      for (let j = 0; j < 5; j++)
        oval(
          root,
          coral,
          x + Math.cos(j * 1.257) * 0.028,
          y + Math.sin(j * 1.257) * 0.028,
          0.014,
          0.028,
          0.025,
          0.012,
        );
    }
  } else if (kind === "pinwheel") {
    pot(cream, 0.12, 0.12);
    rod(root, wood, [0, 0.08, 0], [0, 0.69, 0], 0.016);
    const rotor = new T.Group();
    rotor.name = "pinwheel-rotor";
    rotor.position.set(0, 0.62, 0.02);
    root.add(rotor);
    for (let i = 0; i < 4; i++) {
      const petal = mesh(rotor, new T.ConeGeometry(0.075, 0.23, 3), i % 2 ? coral : jade);
      petal.position.set(Math.sin((i * Math.PI) / 2) * 0.1, Math.cos((i * Math.PI) / 2) * 0.1, 0);
      petal.rotation.z = (-i * Math.PI) / 2;
    }
    oval(rotor, gold, 0, 0, 0.05, 0.028, 0.028, 0.025);
  } else if (kind.endsWith("basket")) basket(kind === "tea-basket");
  else if (kind === "inkstone") {
    const stone = clay("#688b85");
    oval(root, stone, 0, 0.065, 0, 0.27, 0.065, 0.19);
    oval(root, ink, 0, 0.112, 0.025, 0.16, 0.015, 0.1);
    rod(root, wood, [-0.2, 0.14, -0.08], [0.17, 0.14, -0.08], 0.015);
    rod(root, ink, [0.17, 0.14, -0.08], [0.23, 0.13, -0.08], 0.014, 0.002);
  } else if (kind === "conch") {
    for (let i = 0; i < 7; i++) {
      const a = i * 0.7,
        r = 0.13 * (1 - i / 9);
      oval(
        root,
        i % 2 ? cream : coral,
        Math.cos(a) * r,
        0.12 + i * 0.026,
        Math.sin(a) * r,
        0.12 - i * 0.011,
        0.08 - i * 0.006,
        0.1 - i * 0.009,
      );
    }
    oval(root, coral, 0.17, 0.095, 0.04, 0.1, 0.07, 0.075);
  } else if (kind === "watering-can") {
    pot(jade, 0.17, 0.28);
    curl(
      root,
      wood,
      [
        [-0.13, 0.23, 0],
        [-0.29, 0.34, 0],
        [-0.29, 0.07, 0],
        [-0.13, 0.08, 0],
      ],
      0.023,
    );
    rod(root, jade, [0.12, 0.08, 0], [0.29, 0.3, 0], 0.039, 0.055);
    oval(root, gold, 0.3, 0.315, 0, 0.066, 0.025, 0.063);
  } else if (kind.includes("lantern")) {
    const warm = new T.MeshStandardMaterial({
      color: kind === "sea-lantern" ? "#d6eddf" : "#f3cf9c",
      emissive: "#d6a575",
      emissiveIntensity: 0.18,
      roughness: 0.85,
    });
    if (kind === "maple-lantern") oval(root, warm, 0, 0.27, 0, 0.22, 0.24, 0.21);
    else mesh(root, new T.CylinderGeometry(0.17, 0.17, 0.36, 8), warm, 0, 0.24);
    for (const y of [0.065, 0.45])
      mesh(root, new T.CylinderGeometry(0.18, 0.18, 0.035, 8), wood, 0, y);
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      rod(
        root,
        wood,
        [Math.sin(a) * 0.175, 0.08, Math.cos(a) * 0.175],
        [Math.sin(a) * 0.175, 0.44, Math.cos(a) * 0.175],
        0.012,
      );
    }
    curl(
      root,
      wood,
      [
        [-0.13, 0.46, 0],
        [-0.12, 0.59, 0],
        [0, 0.62, 0],
        [0.12, 0.59, 0],
        [0.13, 0.46, 0],
      ],
      0.017,
    );
  } else if (kind === "shell-bowl") {
    oval(root, blue, 0, 0.06, 0, 0.26, 0.06, 0.2);
    for (let i = 0; i < 5; i++)
      oval(
        root,
        i % 2 ? cream : coral,
        Math.sin(i * 2.4) * 0.13,
        0.13,
        Math.cos(i * 2.4) * 0.12,
        0.058,
        0.043,
        0.07,
      );
  } else if (kind === "pumpkin") {
    for (let i = 0; i < 9; i++) {
      const a = (i * Math.PI * 2) / 9;
      oval(
        root,
        clay(i % 2 ? "#d8a064" : "#e2af73"),
        Math.sin(a) * 0.13,
        0.2,
        Math.cos(a) * 0.13,
        0.145,
        0.19,
        0.145,
      );
    }
    curl(
      root,
      wood,
      [
        [0, 0.32, 0],
        [0, 0.42, 0],
        [0.055, 0.45, 0.01],
      ],
      0.029,
    );
    oval(root, jade, 0.09, 0.38, 0, 0.095, 0.014, 0.042);
  } else if (kind === "scroll-box") {
    mesh(root, new T.BoxGeometry(0.54, 0.15, 0.3), wood, 0, 0.075);
    mesh(root, new T.BoxGeometry(0.56, 0.04, 0.32), jade, 0, 0.17);
    for (const z of [-0.08, 0.08]) {
      const scroll = mesh(root, new T.CylinderGeometry(0.046, 0.046, 0.43, 10), cream, 0, 0.226, z);
      scroll.rotation.z = Math.PI / 2;
    }
  } else if (kind === "snow-bunny") {
    oval(root, cream, 0, 0.17, 0, 0.22, 0.17, 0.24);
    oval(root, cream, 0, 0.26, 0.14, 0.14, 0.12, 0.13);
    for (const s of [-1, 1]) oval(root, jade, s * 0.066, 0.405, 0.09, 0.035, 0.12, 0.025);
    eyes(root, 0.067, 0.275, 0.249, 0.017);
  } else if (kind === "snow-globe") {
    mesh(root, new T.CylinderGeometry(0.22, 0.24, 0.1, 16), wood, 0, 0.05);
    const glass = new T.MeshStandardMaterial({
      color: "#b9dfe3",
      transparent: true,
      opacity: 0.22,
      roughness: 0.2,
      depthWrite: false,
    });
    oval(root, glass, 0, 0.31, 0, 0.23, 0.23, 0.23);
    oval(root, cream, 0, 0.13, 0, 0.19, 0.045, 0.17);
    mesh(root, new T.ConeGeometry(0.1, 0.27, 7), jade, 0, 0.27);
    oval(root, cream, 0.1, 0.16, 0.05, 0.04, 0.04, 0.04);
  } else if (kind === "ice-crystal") {
    for (let i = 0; i < 3; i++) {
      const crystal = mesh(
        root,
        new T.ConeGeometry(0.105, 0.5 - i * 0.08, 5),
        i % 2 ? blue : jade,
        (i - 1) * 0.12,
        0.25 - i * 0.04,
        0,
      );
      crystal.rotation.z = (i - 1) * -0.18;
    }
    oval(root, cream, 0, 0.035, 0, 0.24, 0.035, 0.16);
  } else {
    pot(coral, 0.125, 0.4);
    mesh(root, new T.CylinderGeometry(0.13, 0.13, 0.09, 16), cream, 0, 0.45);
    curl(
      root,
      wood,
      [
        [-0.1, 0.32, 0],
        [-0.2, 0.31, 0],
        [-0.2, 0.13, 0],
        [-0.1, 0.13, 0],
      ],
      0.023,
    );
  }
  return root;
}
