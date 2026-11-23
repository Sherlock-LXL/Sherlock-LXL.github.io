import * as T from "three";
import { material, mesh } from "./architecture";
import { skin, tapered, type Volume } from "./animal-sculpt";

const clay = (color: string) => material(color, 0.88, 0, "plaster");
const ivory = clay("#f5edda"),
  dark = clay("#343734"),
  rose = clay("#d79e91"),
  horn = clay("#826c53");
const sphere = new T.SphereGeometry(1, 24, 16);
const oval = (g: T.Object3D, m: T.Material, p: number[], s: number[]) => {
  const o = mesh(g, sphere, m, ...(p as [number, number, number]));
  o.scale.set(...(s as [number, number, number]));
  return o;
};
const sculpt = (g: T.Object3D, m: T.Material, v: Volume[], k = 0.035, r = 0.026) =>
  mesh(g, skin(v, k, r), m);
const tube = (g: T.Object3D, m: T.Material, p: number[][], r: number[]) =>
  mesh(g, tapered(p, r), m);
function fur(color: string, kind: string) {
  const m = clay(color),
    compile = m.onBeforeCompile;
  m.onBeforeCompile = (shader, renderer) => {
    compile.call(m, shader, renderer);
    shader.vertexShader = "varying vec3 coatP;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\ncoatP=position;",
    );
    shader.fragmentShader = "varying vec3 coatP;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      ${
        kind === "deer"
          ? `vec2 cell=vec2(coatP.z*6.7,coatP.y*7.);cell.x+=floor(cell.y)*.47;
      float spots=(1.-smoothstep(.13,.22,length(fract(cell)-.5)))*smoothstep(.92,1.02,coatP.y)*smoothstep(.12,.2,abs(coatP.x));
      diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.93,.84,.66),spots*.95);`
          : `float stripes=smoothstep(.55,.89,sin(coatP.z*36.+sin(coatP.y*18.)*1.3));
      diffuseColor.rgb*=1.-stripes*.27;`
      }`,
    );
  };
  m.customProgramCacheKey = () => `animal-skin-${kind}-v3`;
  return m;
}
type Limb = {
  hip: T.Vector3;
  upper: T.Group;
  lower: T.Group;
  foot: T.Group;
  l1: number;
  l2: number;
  sign: number;
  width: number;
};
type Footing = (x: number, z: number) => number;
/** 动物以米为单位、朝向 +Z；身体使用连续表皮，肢体在关节处相接，各脚独立求解落点。 */
export function animalModel(kind: string) {
  const root = new T.Group(),
    body = new T.Group(),
    head = new T.Group(),
    tail = new T.Group();
  root.name = `animal-model-${kind}`;
  root.add(body, head, tail);
  const parts: T.Object3D[] = [body, head, tail],
    legs: T.Group[] = [],
    limbs: Limb[] = [],
    ears: T.Group[] = [],
    eyes: T.Group[] = [],
    wings: T.Group[] = [];
  let headBase = new T.Vector3(),
    headRest = 0,
    eyePhase = kind.length * 0.77;
  const pivot = (parent: T.Object3D, p: number[]) => {
    const g = new T.Group();
    g.position.set(...(p as [number, number, number]));
    parent.add(g);
    parts.push(g);
    return g;
  };
  const eye = (
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    size: number,
    sideAngle = 0.35,
    iris = "#9d935d",
  ) => {
    for (const s of [-1, 1]) {
      const socket = pivot(parent, [s * x, y, z]);
      socket.rotation.y = s * sideAngle;
      oval(socket, dark, [0, 0, 0], [size * 1.17, size * 0.82, size * 0.47]);
      const lid = pivot(socket, [0, 0, 0.006]);
      eyes.push(socket);
      oval(lid, clay(iris), [0, 0, size * 0.2], [size * 0.77, size * 0.64, size * 0.36]);
      oval(lid, dark, [0, 0, size * 0.48], [size * 0.34, size * 0.59, size * 0.16]);
      oval(
        lid,
        ivory,
        [-size * 0.2, size * 0.28, size * 0.63],
        [size * 0.19, size * 0.17, size * 0.07],
      );
    }
  };
  const pinna = (
    parent: T.Object3D,
    coat: T.Material,
    p: number[],
    h: number,
    w: number,
    angle: number,
    round = false,
  ) => {
    const e = pivot(parent, p);
    e.rotation.z = angle;
    e.userData.angle = angle;
    ears.push(e);
    if (round) {
      oval(e, coat, [0, h * 0.35, 0], [w, h * 0.55, w * 0.52]);
      oval(e, rose, [0, h * 0.36, w * 0.43], [w * 0.58, h * 0.32, w * 0.12]);
    } else {
      // 耳朵采用弯曲透镜形，前面略凹。
      const v: number[] = [],
        indices: number[] = [],
        uv: number[] = [];
      const rows = 12,
        cols = 12;
      for (let j = 0; j <= rows; j++)
        for (let i = 0; i <= cols; i++) {
          const t = j / rows,
            u = (i / cols) * 2 - 1,
            pointed = ["cat", "fox", "shiba"].includes(kind);
          const width =
            w *
            (pointed
              ? Math.pow(1 - t, 0.7)
              : Math.pow(Math.sin(Math.PI * (t * 0.965 + 0.035)), 0.85));
          v.push(u * width, t * h, 0.018 + width * 0.42 * (1 - u * u) - t * t * 0.035);
          uv.push(i / cols, t);
          if (j < rows && i < cols) {
            const a = j * (cols + 1) + i,
              b = a + cols + 1;
            indices.push(a, a + 1, b, b, a + 1, b + 1);
          }
        }
      const geo = new T.BufferGeometry();
      geo.setAttribute("position", new T.Float32BufferAttribute(v, 3));
      geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const outside = coat.clone();
      outside.side = T.DoubleSide;
      mesh(e, geo, outside);
      const inner = mesh(e, geo.clone(), rose);
      inner.scale.set(0.63, 0.77, 1);
      inner.position.set(0, h * 0.1, 0.006);
    }
    return e;
  };
  const leg = (
    coat: T.Material,
    p: number[],
    width: number,
    front: boolean,
    hoof = false,
    longFoot = false,
  ) => {
    const h = p[1],
      upper = pivot(root, p),
      lower = pivot(root, p),
      foot = pivot(root, [p[0], 0.035, p[2]]);
    const l1 = h * 0.53,
      l2 = h * 0.55;
    sculpt(
      upper,
      coat,
      [
        [0, -l1 * 0.26, 0, width * 1.2, l1 * 0.6, width * 1.12],
        [0, -l1 * 0.72, 0, width * 0.79, l1 * 0.33, width * 0.76],
      ],
      width * 0.5,
      Math.max(0.012, width * 0.27),
    );
    oval(lower, coat, [0, 0, 0], [width * 0.64, width * 0.66, width * 0.64]);
    sculpt(
      lower,
      coat,
      [
        [0, -l2 * 0.32, 0, width * 0.59, l2 * 0.4, width * 0.59],
        [0, -l2 * 0.66, 0, width * 0.46, l2 * 0.22, width * 0.48],
      ],
      width * 0.32,
      Math.max(0.01, width * 0.23),
    );
    const f = hoof ? horn : coat;
    foot.userData.sole = hoof ? 0.024 : 0.012;
    const footHeight = hoof ? 0.048 : Math.max(0.035, width * 0.48);
    oval(
      foot,
      f,
      [0, footHeight - 0.012, 0.027],
      [width * (hoof ? 1.15 : 1.22), footHeight, width * (longFoot ? 2.1 : 1.55)],
    );
    if (hoof)
      tube(
        foot,
        dark,
        [
          [0, 0.058, 0.072],
          [0, 0.022, 0.078],
        ],
        [0.004, 0.003],
      );
    else
      for (const s of [-1, 1])
        tube(
          foot,
          hoof ? dark : horn,
          [
            [s * width * 0.4, 0.035, width * 1.4],
            [s * width * 0.4, 0.012, width * 1.53],
          ],
          [0.003, 0.001],
        );
    limbs.push({
      hip: new T.Vector3(...p),
      upper,
      lower,
      foot,
      l1,
      l2,
      sign: front ? -1 : 1,
      width,
    });
    legs.push(upper, lower, foot);
  };
  const muzzle = (coat: T.Material, hw: number, hy: number, z: number, length: number) => {
    sculpt(
      head,
      coat,
      [
        [0, hy, z, hw, 0.067, length],
        [0, hy + 0.016, z + length * 0.68, hw * 0.64, 0.049, length * 0.5],
      ],
      0.026,
      0.013,
    );
    oval(head, dark, [0, hy + 0.03, z + length * 1.08], [hw * 0.52, 0.028, 0.028]);
    tube(
      head,
      horn,
      [
        [0, hy - 0.005, z + length * 1.11],
        [0, hy - 0.028, z + length],
        [hw * 0.55, hy - 0.035, z + length * 0.7],
      ],
      [0.005, 0.004, 0.002],
    );
    tube(
      head,
      horn,
      [
        [0, hy - 0.028, z + length],
        [-hw * 0.55, hy - 0.035, z + length * 0.7],
      ],
      [0.004, 0.002],
    );
  };
  const four = ["cat", "deer", "fox", "shiba", "polar-bear"].includes(kind);
  if (four) {
    const deer = kind === "deer",
      bear = kind === "polar-bear",
      fox = kind === "fox",
      cat = kind === "cat";
    const coat = clay(
      bear ? "#eee9d9" : deer ? "#b88758" : fox ? "#c98551" : cat ? "#a99b82" : "#cda16b",
    );
    const y = deer ? 1.02 : bear ? 0.78 : 0.42,
      w = deer ? 0.25 : bear ? 0.39 : cat ? 0.165 : 0.19,
      len = deer ? 0.47 : bear ? 0.57 : 0.31;
    sculpt(
      body,
      deer || cat ? fur(deer ? "#b88758" : "#a99b82", kind) : coat,
      [
        [0, y, 0, w, deer ? 0.27 : bear ? 0.37 : 0.2, len],
        [0, y + 0.025, len * 0.58, w * 0.92, deer ? 0.3 : bear ? 0.4 : 0.23, len * 0.64],
        [0, y - 0.015, -len * 0.6, w * 0.93, deer ? 0.29 : bear ? 0.34 : 0.215, len * 0.65],
      ],
      deer || bear ? 0.09 : 0.052,
      deer || bear ? 0.044 : 0.025,
    );
    if (!cat)
      oval(
        body,
        ivory,
        [0, y - 0.11, len * 0.66],
        [w * 0.72, deer ? 0.22 : bear ? 0.27 : 0.15, len * 0.37],
      );
    for (const z of [-len * 0.63, len * 0.64])
      for (const s of [-1, 1])
        leg(
          coat,
          [s * w * 0.71, deer ? 0.85 : bear ? 0.56 : 0.29, z],
          deer ? 0.063 : bear ? 0.14 : cat ? 0.046 : 0.053,
          z > 0,
          deer,
        );
    head.position.set(0, deer ? 1.04 : bear ? 0.85 : 0.49, deer ? 0.34 : bear ? 0.49 : 0.28);
    const hy = deer ? 0.36 : bear ? 0.17 : 0.1,
      hw = deer ? 0.155 : bear ? 0.245 : fox ? 0.137 : 0.16,
      hz = deer ? 0.14 : bear ? 0.19 : 0.07;
    sculpt(
      head,
      coat,
      [
        [
          0,
          0,
          -0.045,
          deer ? 0.14 : bear ? 0.24 : 0.115,
          deer ? 0.23 : bear ? 0.24 : 0.15,
          deer ? 0.17 : bear ? 0.27 : 0.17,
        ],
        [0, hy, hz, hw, deer ? 0.2 : bear ? 0.215 : 0.152, deer ? 0.2 : bear ? 0.27 : 0.165],
        [
          0,
          hy - 0.06,
          hz + (cat ? 0.005 : 0.08),
          hw * 0.85,
          0.115,
          deer ? 0.19 : bear ? 0.23 : cat ? 0.105 : 0.13,
        ],
      ],
      deer || bear ? 0.055 : 0.038,
      deer || bear ? 0.026 : 0.018,
    );
    if (cat) {
      for (const s of [-1, 1])
        oval(head, ivory, [s * 0.05, hy - 0.066, hz + 0.134], [0.069, 0.045, 0.05]);
      const nose = oval(head, rose, [0, hy - 0.039, hz + 0.19], [0.024, 0.017, 0.018]);
      nose.rotation.z = Math.PI;
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++)
          tube(
            head,
            ivory,
            [
              [s * 0.065, hy - 0.061, hz + 0.163],
              [s * 0.18, hy - 0.04 - i * 0.022, hz + 0.175],
              [s * 0.26, hy - 0.02 - i * 0.035, hz + 0.146],
            ],
            [0.0027, 0.0015, 0.0005],
          );
      for (const s of [-1, 1])
        tube(
          head,
          horn,
          [
            [0, hy - 0.051, hz + 0.191],
            [0, hy - 0.078, hz + 0.18],
            [s * 0.042, hy - 0.085, hz + 0.173],
          ],
          [0.004, 0.003, 0.001],
        );
    } else
      muzzle(
        deer ? coat : ivory,
        deer ? 0.07 : bear ? 0.125 : fox ? 0.055 : 0.081,
        hy - 0.074,
        hz + (bear ? 0.19 : deer ? 0.19 : 0.16),
        fox ? 0.147 : bear ? 0.14 : deer ? 0.14 : 0.1,
      );
    if (fox)
      for (const s of [-1, 1]) {
        const cheek = oval(head, ivory, [s * 0.074, hy - 0.061, hz + 0.112], [0.063, 0.059, 0.056]);
        cheek.rotation.z = s * 0.35;
      }
    eye(
      head,
      hw * 0.72,
      hy + 0.025,
      hz + hw * 0.72,
      deer ? 0.028 : bear ? 0.031 : 0.03,
      deer ? 0.9 : 0.47,
      cat ? "#a6af78" : "#927857",
    );
    for (const s of [-1, 1]) {
      if (bear) pinna(head, coat, [s * 0.205, hy + 0.15, hz - 0.06], 0.16, 0.085, -s * 0.26, true);
      else
        pinna(
          head,
          coat,
          [s * hw * 0.76, hy + 0.11, hz - 0.045],
          deer ? 0.28 : fox ? 0.215 : cat ? 0.16 : 0.19,
          deer ? 0.073 : fox ? 0.081 : 0.083,
          -s * (deer ? 0.8 : 0.2),
        );
      if (deer) {
        tube(
          head,
          horn,
          [
            [s * 0.085, hy + 0.14, hz - 0.06],
            [s * 0.13, hy + 0.34, hz - 0.11],
            [s * 0.2, hy + 0.54, hz - 0.12],
            [s * 0.25, hy + 0.69, hz - 0.05],
          ],
          [0.03, 0.024, 0.015, 0.002],
        );
        tube(
          head,
          horn,
          [
            [s * 0.14, hy + 0.38, hz - 0.11],
            [s * 0.09, hy + 0.49, hz + 0.015],
            [s * 0.075, hy + 0.57, hz + 0.09],
          ],
          [0.017, 0.011, 0.001],
        );
        tube(
          head,
          horn,
          [
            [s * 0.205, hy + 0.55, hz - 0.115],
            [s * 0.32, hy + 0.6, hz - 0.16],
            [s * 0.36, hy + 0.66, hz - 0.12],
          ],
          [0.016, 0.01, 0.001],
        );
      }
      if (kind === "shiba")
        oval(head, ivory, [s * 0.1, hy + 0.066, hz + 0.136], [0.045, 0.022, 0.013]);
    }
    tail.position.set(0, y, -len * 0.83);
    if (cat)
      tube(
        tail,
        coat,
        [
          [0, 0, 0],
          [0.04, 0.1, -0.15],
          [0.1, 0.3, -0.19],
          [0.06, 0.43, -0.16],
          [-0.025, 0.45, -0.12],
        ],
        [0.05, 0.044, 0.037, 0.028, 0.004],
      );
    else if (fox) {
      tube(
        tail,
        coat,
        [
          [0, 0, 0],
          [0.05, -0.12, -0.2],
          [0.09, -0.12, -0.39],
          [0.13, -0.06, -0.53],
        ],
        [0.065, 0.143, 0.12, 0.027],
      );
      tube(
        tail,
        ivory,
        [
          [0.085, -0.127, -0.37],
          [0.115, -0.08, -0.48],
          [0.13, -0.035, -0.58],
        ],
        [0.12, 0.085, 0.002],
      );
    } else if (kind === "shiba")
      tube(
        tail,
        coat,
        [
          [0, 0, 0],
          [0.01, 0.2, -0.1],
          [0.13, 0.26, -0.08],
          [0.18, 0.16, 0.025],
          [0.11, 0.1, 0.06],
        ],
        [0.072, 0.067, 0.063, 0.051, 0.009],
      );
    else if (deer)
      tube(
        tail,
        ivory,
        [
          [0, 0.055, 0],
          [0, 0.04, -0.12],
          [0, -0.025, -0.23],
        ],
        [0.067, 0.07, 0.003],
      );
    else oval(tail, coat, [0, 0.08, -0.07], [0.1, 0.11, 0.11]);
  } else if (kind === "rabbit") {
    sculpt(
      body,
      ivory,
      [
        [0, 0.25, -0.09, 0.205, 0.23, 0.26],
        [0, 0.3, 0.1, 0.155, 0.19, 0.16],
      ],
      0.07,
    );
    head.position.set(0, 0.39, 0.19);
    sculpt(
      head,
      ivory,
      [
        [0, 0.06, 0.02, 0.153, 0.15, 0.15],
        [0, 0.001, 0.12, 0.099, 0.081, 0.102],
      ],
      0.038,
      0.018,
    );
    eye(head, 0.108, 0.089, 0.108, 0.025, 0.7, "#ac836d");
    oval(head, rose, [0, 0.014, 0.219], [0.019, 0.015, 0.012]);
    for (const s of [-1, 1]) {
      pinna(head, ivory, [s * 0.066, 0.162, -0.01], 0.34, 0.05, -s * 0.18);
      leg(ivory, [s * 0.12, 0.15, -0.15], 0.079, false, false, true);
      leg(ivory, [s * 0.089, 0.23, 0.16], 0.038, true);
    }
    tail.position.set(0, 0.26, -0.34);
    oval(tail, ivory, [0, 0, 0], [0.086, 0.079, 0.076]);
  } else if (kind === "tortoise") {
    const green = clay("#83987a"),
      shell = clay("#8a8c60");
    sculpt(body, shell, [[0, 0.24, -0.025, 0.284, 0.205, 0.32]], 0.01);
    oval(body, horn, [0, 0.125, -0.02], [0.287, 0.055, 0.324]);
    // 六角甲片边界贴合龟壳表面。
    for (const [x, z, r] of [
      [0, 0, 0.1],
      [-0.155, -0.12, 0.085],
      [0.155, -0.12, 0.085],
      [-0.15, 0.11, 0.085],
      [0.15, 0.11, 0.085],
      [0, 0.21, 0.07],
      [0, -0.23, 0.06],
    ]) {
      const p = Array.from({ length: 7 }, (_, i) => {
        const a = (i * Math.PI) / 3,
          px = x + Math.sin(a) * r,
          pz = z + Math.cos(a) * r;
        return [
          px,
          0.24 +
            0.207 * Math.sqrt(Math.max(0.02, 1 - (px / 0.29) ** 2 - ((pz + 0.025) / 0.33) ** 2)),
          pz,
        ];
      });
      tube(body, horn, p, [0.005, 0.005]);
    }
    head.position.set(0, 0.19, 0.29);
    sculpt(
      head,
      green,
      [
        [0, 0, 0, 0.061, 0.06, 0.12],
        [0, 0.015, 0.12, 0.089, 0.077, 0.1],
      ],
      0.025,
      0.018,
    );
    eye(head, 0.067, 0.041, 0.157, 0.018, 0.8, "#b8a975");
    for (const z of [-0.17, 0.18])
      for (const s of [-1, 1]) leg(green, [s * 0.22, 0.12, z], 0.051, z > 0);
    tail.position.set(0, 0.15, -0.3);
    tube(
      tail,
      green,
      [
        [0, 0, 0],
        [0, -0.045, -0.1],
        [0, -0.065, -0.16],
      ],
      [0.035, 0.02, 0.001],
    );
  } else if (kind === "heron") {
    const slate = clay("#879fa5"),
      wing = clay("#607b87");
    sculpt(
      body,
      slate,
      [
        [0, 0.85, -0.075, 0.16, 0.235, 0.28],
        [0, 0.94, 0.08, 0.12, 0.17, 0.15],
      ],
      0.045,
    );
    head.position.set(0, 0.99, 0.13);
    tube(
      head,
      ivory,
      [
        [0, -0.07, -0.015],
        [0, 0.07, 0.1],
        [0, 0.24, -0.05],
        [0, 0.39, 0.06],
        [0, 0.43, 0.15],
      ],
      [0.078, 0.066, 0.053, 0.054, 0.055],
    );
    sculpt(head, ivory, [[0, 0.43, 0.16, 0.086, 0.082, 0.122]], 0.01, 0.015);
    tube(
      head,
      horn,
      [
        [0, 0.42, 0.24],
        [0, 0.413, 0.39],
        [0, 0.408, 0.5],
      ],
      [0.04, 0.023, 0.001],
    );
    eye(head, 0.071, 0.452, 0.206, 0.015, 1.05, "#d3af5d");
    for (const s of [-1, 1]) {
      tube(
        head,
        dark,
        [
          [s * 0.057, 0.48, 0.14],
          [s * 0.052, 0.47, -0.005],
          [s * 0.047, 0.4, -0.12],
        ],
        [0.016, 0.012, 0.001],
      );
      const w = pivot(body, [s * 0.123, 0.92, -0.03]);
      wings.push(w);
      for (let i = 0; i < 5; i++) {
        const feather = oval(
          w,
          wing,
          [s * i * 0.011, -i * 0.018, -0.03 - i * 0.035],
          [0.048, 0.14, 0.17],
        );
        feather.rotation.x = -0.28;
      }
      leg(horn, [s * 0.072, 0.76, 0], 0.021, true);
      const foot = limbs[limbs.length - 1].foot;
      for (const j of [-1, 0, 1])
        tube(
          foot,
          horn,
          [
            [0, 0.012, 0.035],
            [j * 0.05, 0.008, 0.125],
            [j * 0.07, 0.004, 0.19],
          ],
          [0.012, 0.008, 0.001],
        );
    }
    tail.position.set(0, 0.84, -0.24);
    tube(
      tail,
      wing,
      [
        [0, 0, 0],
        [0, -0.025, -0.15],
        [0, -0.07, -0.23],
      ],
      [0.08, 0.052, 0.001],
    );
  } else if (kind === "penguin") {
    const slate = clay("#536e7b"),
      beak = clay("#b99462");
    sculpt(
      body,
      slate,
      [
        [0, 0.33, -0.018, 0.207, 0.3, 0.175],
        [0, 0.57, 0.008, 0.157, 0.2, 0.149],
      ],
      0.075,
    );
    oval(body, ivory, [0, 0.35, 0.108], [0.16, 0.265, 0.079]);
    head.position.set(0, 0.63, 0.018);
    sculpt(head, slate, [[0, 0.03, 0, 0.153, 0.15, 0.142]], 0.01, 0.02);
    for (const s of [-1, 1]) oval(head, ivory, [s * 0.083, 0.001, 0.1], [0.055, 0.08, 0.039]);
    eye(head, 0.086, 0.039, 0.131, 0.024, 0.45, "#aa9472");
    tube(
      head,
      beak,
      [
        [0, -0.022, 0.13],
        [0, -0.03, 0.205],
        [0, -0.04, 0.24],
      ],
      [0.042, 0.036, 0.001],
    );
    for (const s of [-1, 1]) {
      const w = pivot(body, [s * 0.18, 0.46, 0]);
      wings.push(w);
      w.userData.side = s;
      tube(
        w,
        slate,
        [
          [0, 0, 0],
          [s * 0.08, -0.17, -0.015],
          [s * 0.095, -0.28, 0.015],
        ],
        [0.05, 0.049, 0.005],
      );
      leg(beak, [s * 0.105, 0.1, 0], 0.06, true, false, true);
    }
    tail.position.set(0, 0.2, -0.15);
    tube(
      tail,
      slate,
      [
        [0, 0, 0],
        [0, -0.07, -0.13],
      ],
      [0.085, 0.002],
    );
  } else {
    const shell = clay("#c8886e"),
      edge = clay("#e0ac8b");
    sculpt(
      body,
      shell,
      [
        [0, 0.185, 0, 0.255, 0.105, 0.191],
        [0, 0.2, 0.068, 0.217, 0.085, 0.155],
      ],
      0.04,
      0.024,
    );
    tube(
      body,
      edge,
      [
        [-0.23, 0.175, 0.08],
        [-0.13, 0.163, 0.176],
        [0, 0.16, 0.205],
        [0.13, 0.163, 0.176],
        [0.23, 0.175, 0.08],
      ],
      [0.012, 0.012],
    );
    for (const s of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const l = pivot(root, [s * 0.18, 0.17, 0.12 - i * 0.085]);
        legs.push(l);
        l.userData.side = s;
        l.userData.index = i;
        tube(
          l,
          shell,
          [
            [0, 0, 0],
            [s * 0.16, 0.025, -0.03],
            [s * 0.31, -0.17, -0.065],
          ],
          [0.029, 0.022, 0.002],
        );
      }
      const claw = pivot(body, [s * 0.2, 0.19, 0.12]);
      wings.push(claw);
      claw.userData.side = s;
      tube(
        claw,
        shell,
        [
          [0, 0, 0],
          [s * 0.105, 0.04, 0.12],
          [s * 0.1, 0.06, 0.19],
        ],
        [0.032, 0.03, 0.035],
      );
      oval(claw, shell, [s * 0.105, 0.055, 0.21], [0.075, 0.065, 0.093]);
      for (const j of [-1, 1])
        tube(
          claw,
          edge,
          [
            [s * 0.105 + j * 0.045, 0.061, 0.25],
            [s * 0.105 + j * 0.055, 0.067, 0.33],
            [s * 0.105 + j * 0.016, 0.062, 0.35],
          ],
          [0.029, 0.023, 0.002],
        );
      tube(
        head,
        shell,
        [
          [s * 0.095, 0.23, 0.1],
          [s * 0.12, 0.34, 0.13],
        ],
        [0.022, 0.015],
      );
    }
    eye(head, 0.12, 0.355, 0.145, 0.031, 0.16, "#b7a27b");
  }
  headBase.copy(head.position);
  headRest = head.rotation.x;
  parts.forEach((p) => (p.userData.dynamic = true));
  const bodyBase = body.position.clone(),
    tailBase = tail.rotation.clone();
  let blendMood = "",
    moodMix = 0,
    lastTime = 0,
    moveBlend = 0,
    airBlend = 0;
  return {
    root,
    head,
    tail,
    legs,
    parts,
    animate(
      phase: number,
      moving: number,
      headYaw: number,
      mood: string,
      time: number,
      footing?: Footing,
      gait = { run: 0, air: false },
    ) {
      const dt = Math.max(0, Math.min(0.1, time - lastTime));
      lastTime = time;
      moveBlend = T.MathUtils.damp(moveBlend, moving, 12, dt);
      airBlend = T.MathUtils.damp(airBlend, gait.air ? 1 : 0, 12, dt);
      if (blendMood !== mood) {
        blendMood = mood;
        moodMix = 0;
      }
      moodMix = Math.min(1, moodMix + dt * 3);
      const pet = mood === "pet" ? moodMix : 0,
        sniff = ["sniff", "graze", "forage"].includes(mood) ? moodMix : 0;
      const groom = ["groom", "preen"].includes(mood) ? moodMix : 0,
        stretch = mood === "stretch" ? moodMix : 0;
      const hop = kind === "rabbit" ? Math.max(0, Math.sin(phase)) * moveBlend * 0.075 : 0;
      const bob = hop + Math.sin(phase * 2) * moveBlend * 0.008,
        breath = Math.sin(time * 2.1) * 0.004;
      body.position.copy(bodyBase);
      body.position.y += bob + breath;
      body.scale.y = 1 + Math.sin(time * 2.1) * 0.009;
      body.rotation.x = stretch * 0.085;
      body.rotation.z = kind === "penguin" ? Math.sin(phase) * moveBlend * 0.075 : 0;
      head.position.copy(headBase);
      head.position.y += bob + breath;
      const targetPitch =
        headRest +
        sniff * (kind === "deer" ? 0.7 : 0.24) +
        stretch * 0.16 -
        pet * 0.14 +
        groom * 0.25;
      head.rotation.x = T.MathUtils.damp(
        head.rotation.x,
        targetPitch + Math.sin(time * 3.4) * sniff * 0.065,
        9,
        dt,
      );
      head.rotation.y = T.MathUtils.damp(
        head.rotation.y,
        headYaw + groom * Math.sin(time * 2) * 0.65,
        9,
        dt,
      );
      head.rotation.z = T.MathUtils.damp(
        head.rotation.z,
        pet * Math.sin(time * 3.5) * 0.13 + (mood === "watch" ? Math.sin(time * 1.8) * 0.075 : 0),
        8,
        dt,
      );
      const blinkCycle = (time + eyePhase) % 4.1,
        blink = blinkCycle < 0.16 ? Math.abs(blinkCycle - 0.08) / 0.08 : 1;
      eyes.forEach((e) => (e.scale.y = Math.max(0.06, blink * (1 - pet * 0.48))));
      ears.forEach((e, i) => {
        e.rotation.z = e.userData.angle + Math.sin(time * 2.5 + i * 2) * pet * 0.12;
        e.rotation.y =
          Math.sin(time * 0.85 + i * 2) * 0.12 +
          Math.pow(Math.max(0, Math.sin(time * 3.1 + i)), 14) * 0.17;
      });
      tail.rotation.copy(tailBase);
      tail.rotation.y =
        Math.sin(time * (pet ? 7 : 2.3)) * (pet ? 0.32 : kind === "shiba" ? 0.18 : 0.08);
      tail.rotation.x = Math.sin(time * 1.8) * 0.035;
      limbs.forEach((l, i) => {
        const offset =
          kind === "rabbit"
            ? i < 2
              ? 0
              : 0.9
            : limbs.length === 2
              ? i * Math.PI
              : i === 0 || i === 3
                ? 0
                : Math.PI;
        const t = phase + offset,
          swing = Math.max(0, Math.sin(t)),
          stride =
            (kind === "deer"
              ? 0.2
              : kind === "polar-bear"
                ? 0.16
                : kind === "heron"
                  ? 0.12
                  : 0.075) *
            moveBlend *
            (1 + gait.run * 0.45) *
            (1 - airBlend);
        const z = l.hip.z + Math.cos(t) * stride,
          x = l.hip.x,
          y =
            (footing?.(x, z) ?? 0) +
            l.foot.userData.sole +
            swing * moveBlend * (kind === "heron" ? 0.12 : 0.07) +
            hop +
            airBlend * 0.18;
        const lift = groom && i === 2 ? 0.1 * groom : 0,
          hipY = l.hip.y + bob;
        const dy = y + lift - hipY,
          dz = z - l.hip.z,
          distance = Math.hypot(dy, dz);
        const d = Math.max(0.001, Math.min(l.l1 + l.l2 - 0.0001, distance)),
          ny = distance > 0.0001 ? dy / distance : -1,
          nz = distance > 0.0001 ? dz / distance : 0;
        const along = (l.l1 * l.l1 - l.l2 * l.l2 + d * d) / (2 * d),
          bend = Math.sqrt(Math.max(0, l.l1 * l.l1 - along * along)) * l.sign;
        const ky = ny * along - nz * bend,
          kz = nz * along + ny * bend;
        l.upper.position.set(x, hipY, l.hip.z);
        l.upper.rotation.x = Math.atan2(-kz, -ky);
        l.lower.position.set(x, hipY + ky, l.hip.z + kz);
        l.lower.rotation.x = Math.atan2(-(dz - kz), -(dy - ky));
        l.foot.position.set(x, y + lift, z);
        l.foot.rotation.x = -swing * moveBlend * 0.18;
      });
      if (kind === "crab")
        legs.forEach((l, i) => {
          l.rotation.z = Math.sin(phase + i * Math.PI * 0.55) * moveBlend * 0.2;
          l.rotation.y = Math.cos(phase + i * Math.PI * 0.55) * moveBlend * 0.19;
          l.position.y = 0.173 + Math.max(0, -Math.sin(l.rotation.z) * l.userData.side * 0.31);
        });
      wings.forEach((w, i) => {
        w.rotation.z =
          kind === "penguin"
            ? (w.userData.side ?? 1) * (-0.08 + Math.sin(time * 3) * 0.08 + pet * 0.45)
            : kind === "crab"
              ? Math.sin(time * 2 + i) * 0.12
              : Math.sin(time * 1.7 + i) * 0.018 + groom * 0.2;
        if (kind === "crab") w.rotation.x = Math.sin(time * 2.5 + i) * 0.14 + pet * 0.25;
      });
    },
  };
}
