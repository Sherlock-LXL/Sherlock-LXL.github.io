import * as T from "three";
import { material, mesh, softBox } from "./architecture";
import { sign } from "./scenery";

/** 研究亭仅作装饰，保留五处占地与前方通道。 */
export function researchCamp() {
  const root = new T.Group();
  root.name = "research-camp";
  const shell = material("#dae4e5", 0.85, 0.02, "stone"),
    metal = material("#89aab4", 0.45, 0.24),
    snow = material("#f3f8fb", 0.95, 0, "snow"),
    glass = material("#759ba8", 0.3, 0.22);
  const box = (
    parent: T.Object3D,
    w: number,
    h: number,
    d: number,
    x = 0,
    y = 0,
    z = 0,
    mat: T.Material = shell,
  ) => mesh(parent, softBox(w, h, d), mat, x, y, z);
  const rod = (
    parent: T.Object3D,
    a: number[],
    b: number[],
    radius = 0.045,
    mat: T.Material = metal,
  ) => {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b),
      delta = end.clone().sub(start);
    const m = mesh(
      parent,
      new T.CylinderGeometry(radius, radius, delta.length(), 12),
      mat,
      ...(start.add(end).multiplyScalar(0.5).toArray() as [number, number, number]),
    );
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    return m;
  };
  const titles = ["天文", "力学", "机器人", "计算机", "AI"],
    colors = ["#aab9d6", "#d3bc9b", "#a8c6b6", "#a3c7d2", "#c5b4d8"];
  for (let i = 0; i < 5; i++) {
    const room = new T.Group();
    room.name = `research-lab-${i}`;
    room.position.set(-9 + i * 4.5, 0, -12);
    root.add(room);
    const accent = material(colors[i], 0.45, 0.15);
    box(room, 2.2, 0.16, 1.45, 0, 0.08);
    box(room, 2.1, 3.64, 1.2, 0, 1.98);
    box(room, 2.3, 0.14, 1.45, 0, 3.87);
    box(room, 2.25, 0.07, 1.4, 0, 3.975, 0, snow);
    box(room, 1.64, 1.75, 0.045, 0, 1.65, 0.63, glass);
    for (const x of [-0.88, 0.88]) box(room, 0.065, 2.05, 0.09, x, 1.65, 0.64, accent);
    box(room, 1.8, 0.08, 0.15, 0, 0.72, 0.67);
    box(room, 1.8, 0.08, 0.15, 0, 2.62, 0.67);
    const label = sign(room, titles[i], `0${i + 1}`, colors[i], 1.8, 0.54);
    label.position.set(0, 3.18, 0.69);
    const apparatus = new T.Group();
    apparatus.name = `research-apparatus-${i}`;
    apparatus.position.y = 4.01;
    room.add(apparatus);
    mesh(apparatus, new T.CylinderGeometry(0.7, 0.78, 0.1, 32), metal, 0, 0.05);
    if (i === 0) {
      const hub = new T.Vector3(0, 0.69, 0);
      for (let n = 0; n < 3; n++) {
        const a = (n * Math.PI * 2) / 3;
        rod(apparatus, [Math.cos(a) * 0.55, 0.1, Math.sin(a) * 0.48], hub.toArray(), 0.045);
      }
      mesh(
        apparatus,
        new T.SphereGeometry(0.115, 16, 12),
        accent,
        ...(hub.toArray() as [number, number, number]),
      );
      const tube = new T.Group();
      tube.position.copy(hub).add(new T.Vector3(0, 0.18, 0));
      tube.rotation.x = 0.88;
      apparatus.add(tube);
      rod(apparatus, [0, 0.69, 0], [0, 0.89, 0], 0.09);
      mesh(tube, new T.CylinderGeometry(0.22, 0.19, 1.05, 32), shell);
      for (const y of [-0.4, 0.4])
        mesh(tube, new T.CylinderGeometry(0.238, 0.238, 0.09, 32), accent, 0, y);
      const lens = mesh(tube, new T.CircleGeometry(0.195, 32), glass, 0, 0.532);
      lens.rotation.x = -Math.PI / 2;
      mesh(tube, new T.CylinderGeometry(0.065, 0.065, 0.2, 16), metal, 0, -0.6);
    } else if (i === 1) {
      for (const z of [-0.28, 0.28]) {
        rod(apparatus, [-0.83, 0.2, z], [0.83, 0.2, z]);
        rod(apparatus, [-0.83, 0.2, z], [0, 0.95, z]);
        rod(apparatus, [0, 0.95, z], [0.83, 0.2, z]);
        rod(apparatus, [0, 0.95, z], [0, 0.2, z]);
      }
      for (const x of [-0.83, 0, 0.83]) rod(apparatus, [x, 0.2, -0.28], [x, 0.2, 0.28]);
      box(apparatus, 1.85, 0.12, 0.75, 0, 0.15, 0, accent);
      rod(apparatus, [0, 0.95, -0.28], [0, 0.95, 0.28]);
    } else if (i === 2) {
      mesh(apparatus, new T.CylinderGeometry(0.23, 0.33, 0.3, 24), accent, 0, 0.25);
      const joints = [
        [0, 0.4, 0],
        [-0.35, 1.05, 0],
        [0.36, 1.36, 0.02],
        [0.59, 0.95, 0.05],
      ];
      joints.forEach((p, n) => {
        mesh(
          apparatus,
          new T.SphereGeometry(0.125, 16, 12),
          metal,
          ...(p as [number, number, number]),
        );
        if (n) rod(apparatus, joints[n - 1], p, 0.085, accent);
      });
      for (const x of [0.45, 0.73]) {
        rod(apparatus, [0.59, 0.95, 0.05], [x, 0.77, 0.05], 0.035);
        rod(apparatus, [x, 0.77, 0.05], [x, 0.65, 0.05], 0.035);
      }
    } else if (i === 3) {
      box(apparatus, 0.72, 0.1, 0.5, 0, 0.15, 0, accent);
      box(apparatus, 0.12, 0.45, 0.12, 0, 0.4, 0, metal);
      box(apparatus, 1.35, 0.9, 0.13, 0, 0.94, 0, metal);
      box(apparatus, 1.2, 0.74, 0.025, 0, 0.94, 0.085, glass);
      for (let row = 0; row < 4; row++)
        box(
          apparatus,
          0.35 + row * 0.13,
          0.025,
          0.008,
          -0.2 + row * 0.02,
          1.16 - row * 0.13,
          0.105,
          shell,
        );
      box(apparatus, 1.15, 0.06, 0.34, 0, 0.2, 0.32, metal);
    } else {
      // 依次展示特征图平面与紧凑全连接输出。
      for (let layer = 0; layer < 3; layer++) {
        const x = -0.5 + layer * 0.4,
          size = 0.64 - layer * 0.1;
        rod(apparatus, [x, 0.1, 0], [x, 0.6, 0], 0.035);
        for (let map = 0; map < 3; map++)
          box(apparatus, 0.055, size, size, x + map * 0.07, 0.85, 0, accent);
      }
      for (let n = 0; n < 3; n++) {
        const y = 0.55 + n * 0.25;
        mesh(apparatus, new T.SphereGeometry(0.07, 12, 8), accent, 0.8, y, 0);
        rod(apparatus, [0.46, 0.85, 0], [0.8, y, 0], 0.018);
      }
    }
  }
  // 浅拱两端落于完整桥墩。
  const curve = new T.CatmullRomCurve3(
    [
      [-10.5, 4.25, -12.8],
      [-6, 5.1, -12.8],
      [0, 5.5, -12.8],
      [6, 5.1, -12.8],
      [10.5, 4.25, -12.8],
    ].map((p) => new T.Vector3(...p)),
  );
  mesh(root, new T.TubeGeometry(curve, 64, 0.09, 10, false), metal).name = "camp-supported-arch";
  for (const x of [-10.5, 10.5]) {
    box(root, 0.5, 0.18, 0.5, x, 0.09, -12.8);
    box(root, 0.22, 4.18, 0.22, x, 2.18, -12.8, metal);
  }
  return root;
}
