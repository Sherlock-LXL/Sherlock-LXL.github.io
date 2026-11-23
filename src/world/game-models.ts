import * as T from "three";
import { mesh, softBox, material } from "./architecture";
import { kit, roof, lantern } from "./vernacular";
import { sign } from "./scenery";

const rod = (g: T.Object3D, a: number[], b: number[], radius: number, mat: T.Material) => {
  const start = new T.Vector3(...a),
    end = new T.Vector3(...b),
    delta = end.clone().sub(start);
  const m = mesh(g, new T.CylinderGeometry(radius, radius, delta.length(), 8), mat);
  m.position.copy(start.add(end).multiplyScalar(0.5));
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  return m;
};
const box = (
  g: T.Object3D,
  w: number,
  h: number,
  d: number,
  mat: T.Material,
  x = 0,
  y = 0,
  z = 0,
) => mesh(g, softBox(w, h, d), mat, x, y, z);
/** 小型车辆共用世界绘画材质与暖木细节。 */
export function gameVehicle(kind: string, rider = true) {
  const root = new T.Group(),
    body = new T.Group();
  root.add(body);
  root.name = "game-vehicle-" + kind;
  const wheels: T.Object3D[] = [],
    paint = material(
      kind === "spring" ? "#a95c52" : kind === "summer" ? "#528b84" : "#d4aa64",
      0.72,
      0,
    );
  let bikeFrame: T.Group | undefined, front: T.Group | undefined, pilot: T.Group | undefined;
  if (kind === "spring") {
    bikeFrame = new T.Group();
    bikeFrame.name = "motorcycle-frame";
    body.add(bikeFrame);
    for (const z of [-0.62, 0.64]) {
      const axle = new T.Group();
      axle.position.set(0, 0.345, z);
      body.add(axle);
      if (z > 0) {
        front = axle;
        axle.name = "motorcycle-steering";
      }
      const wheel = new T.Group();
      axle.add(wheel);
      wheels.push(wheel);
      const tire = mesh(wheel, new T.TorusGeometry(0.27, 0.075, 12, 28), kit.ink());
      tire.rotation.y = Math.PI / 2;
      const rim = mesh(wheel, new T.TorusGeometry(0.22, 0.023, 6, 24), kit.bronze());
      rim.rotation.y = Math.PI / 2;
      const hub = mesh(wheel, new T.CylinderGeometry(0.07, 0.07, 0.18, 12), kit.bronze());
      hub.rotation.z = Math.PI / 2;
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5;
        rod(wheel, [0, 0, 0], [0, Math.sin(a) * 0.21, Math.cos(a) * 0.21], 0.01, kit.marble());
      }
      for (const side of [-1, 1]) {
        const disc = mesh(
          wheel,
          new T.CylinderGeometry(0.14, 0.14, 0.015, 16),
          kit.stoneDark(),
          side * 0.065,
        );
        disc.rotation.z = Math.PI / 2;
      }
    }
    const frame = bikeFrame;
    for (const s of [-1, 1]) {
      rod(frame, [s * 0.1, 0.345, -0.62], [s * 0.12, 0.7, 0.02], 0.035, kit.bronze());
      rod(frame, [s * 0.12, 0.7, 0.02], [s * 0.1, 0.36, 0.64], 0.035, kit.bronze());
      rod(frame, [s * 0.12, 0.7, 0.02], [s * 0.12, 0.83, -0.34], 0.04, paint);
      rod(body, [s * 0.1, 0.36, 0.64], [s * 0.12, 1.06, 0.43], 0.038, kit.marble());
      rod(body, [s * 0.12, 1.06, 0.43], [s * 0.12, 1.12, 0.4], 0.03, kit.bronze());
      rod(frame, [s * 0.14, 0.38, -0.58], [s * 0.14, 0.82, -0.25], 0.03, kit.marble());
      for (let i = 0; i < 5; i++)
        mesh(
          frame,
          new T.TorusGeometry(0.042, 0.012, 5, 12),
          kit.bronze(),
          s * 0.14,
          0.49 + i * 0.055,
          -0.45 + i * 0.027,
        ).rotation.x = Math.PI / 2;
    }
    const tank = box(frame, 0.37, 0.25, 0.48, paint, 0, 0.81, 0.12);
    tank.rotation.x = -0.12;
    box(frame, 0.32, 0.1, 0.55, kit.ink(), 0, 0.92, -0.22);
    const engine = box(frame, 0.27, 0.27, 0.33, kit.stoneDark(), 0, 0.54, -0.05);
    engine.name = "motorcycle-engine";
    for (let i = 0; i < 4; i++)
      box(frame, 0.3, 0.025, 0.33, kit.bronze(), 0, 0.47 + i * 0.053, -0.05);
    rod(body, [-0.32, 1.12, 0.4], [0.32, 1.12, 0.4], 0.025, kit.ink());
    for (const z of [-0.63, 0.66]) box(frame, 0.24, 0.055, 0.35, paint, 0, 0.72, z);
    const light = mesh(frame, new T.SphereGeometry(0.1, 14, 10), kit.lamp(), 0, 0.94, 0.55);
    light.scale.z = 0.38;
    rod(frame, [0.19, 0.52, -0.12], [0.2, 0.46, -0.58], 0.054, kit.bronze());
    for (const s of [-1, 1])
      rod(frame, [s * 0.12, 0.51, -0.1], [s * 0.26, 0.51, -0.1], 0.025, kit.ink());
    const chain = mesh(
      frame,
      new T.TorusGeometry(0.11, 0.018, 5, 20),
      kit.timber(),
      -0.11,
      0.36,
      -0.53,
    );
    chain.rotation.y = Math.PI / 2;
  } else if (kind === "summer") {
    const hull = new T.Shape();
    hull.moveTo(0, 1.8);
    hull.bezierCurveTo(0.58, 1.5, 0.82, 0.45, 0.76, -1.45);
    hull.lineTo(-0.76, -1.45);
    hull.bezierCurveTo(-0.82, 0.45, -0.58, 1.5, 0, 1.8);
    const geo = new T.ExtrudeGeometry(hull, {
      depth: 0.38,
      bevelEnabled: true,
      bevelSize: 0.12,
      bevelThickness: 0.12,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 12,
    });
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0.25, 0);
    mesh(body, geo, paint);
    box(body, 1.25, 0.13, 2.36, kit.paper(), 0, 0.3, -0.12);
    box(body, 0.92, 0.23, 0.67, kit.timberLight(), 0, 0.46, 0.76);
    for (const x of [-0.32, 0.32]) {
      box(body, 0.44, 0.16, 0.52, kit.ink(), x, 0.45, -0.55);
      box(body, 0.44, 0.42, 0.12, kit.paper(), x, 0.61, -0.83);
    }
    const shield = box(body, 1.0, 0.42, 0.07, kit.celadon(), 0, 0.72, 0.33);
    shield.rotation.x = -0.32;
    // 电机上壳高于尾流，仅下轴入水。
    box(body, 0.28, 0.42, 0.25, kit.ink(), 0, 0.34, -1.55);
    box(body, 0.13, 0.35, 0.12, kit.bronze(), 0, 0.03, -1.55);
    rod(body, [-0.52, 0.5, 1.15], [0.52, 0.5, 1.15], 0.025, kit.bronze());
    const wheel = mesh(
      body,
      new T.TorusGeometry(0.13, 0.025, 6, 16),
      kit.bronze(),
      -0.28,
      0.7,
      0.04,
    );
    wheel.rotation.x = -0.5;
  } else {
    const vertices: number[] = [],
      indices: number[] = [],
      uv: number[] = [];
    for (let j = 0; j <= 5; j++)
      for (let i = 0; i <= 32; i++) {
        const x = (i / 32 - 0.5) * 7.5,
          t = x / 3.75,
          z = (j / 5 - 0.5) * 1.8;
        vertices.push(x, 3.0 - 0.9 * t * t + 0.22 * Math.sin((j / 5) * Math.PI), z + 0.4 * t * t);
        uv.push(i / 32, j / 5);
      }
    for (let j = 0; j < 5; j++)
      for (let i = 0; i < 32; i++) {
        const a = j * 33 + i;
        indices.push(a, a + 1, a + 33, a + 1, a + 34, a + 33);
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
    geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const sail = paint.clone();
    sail.side = T.DoubleSide;
    mesh(body, geo, sail).name = "owned-material";
    for (let i = 0; i < 13; i++) {
      const x = (i / 12 - 0.5) * 7.5,
        t = x / 3.75,
        y = 3 - 0.9 * t * t;
      rod(body, [x, y, -0.9 + 0.4 * t * t], [x, y + 0.2, 0.4 * t * t], 0.018, kit.paper());
      if (i % 2 === 0)
        for (const z of [-0.6, 0.7])
          rod(body, [x, y, z + 0.4 * t * t], [Math.sign(x) * 0.22, 0.85, 0], 0.009, kit.timber());
    }
    box(body, 0.55, 0.45, 0.68, kit.ink(), 0, 0.35, 0);
    for (const s of [-1, 1])
      rod(body, [s * 0.23, 0.3, -0.3], [s * 0.24, 0.94, 0.05], 0.025, kit.bronze());
  }
  if (rider) {
    pilot = new T.Group();
    body.add(pilot);
    pilot.position.set(
      kind === "summer" ? -0.3 : 0,
      kind === "spring" ? 0.95 : kind === "summer" ? 0.5 : 0.42,
      kind === "spring" ? -0.22 : kind === "summer" ? -0.5 : 0,
    );
    const coat = mesh(pilot, new T.SphereGeometry(1, 12, 10), kit.paper(), 0, 0.25, 0);
    coat.scale.set(0.19, 0.3, 0.15);
    coat.rotation.x = 0.18;
    mesh(
      pilot,
      new T.SphereGeometry(0.18, 16, 10),
      kind === "spring" ? paint : kit.ink(),
      0,
      0.63,
      0.08,
    );
    const visor = mesh(
      pilot,
      new T.SphereGeometry(0.15, 12, 8),
      kit.celadon(),
      0,
      0.63,
      kind === "spring" ? 0.24 : 0.18,
    );
    visor.scale.set(1, 0.6, 0.5);
    for (const s of [-1, 1]) {
      const reach = kind === "spring" ? 0.62 : 0.37;
      rod(pilot, [s * 0.16, 0.4, 0.04], [s * 0.25, 0.27, reach * 0.55], 0.055, kit.paper());
      rod(
        pilot,
        [s * 0.25, 0.27, reach * 0.55],
        [s * 0.3, kind === "autumn" ? 0.65 : 0.17, reach],
        0.048,
        kit.paper(),
      );
      mesh(
        pilot,
        new T.SphereGeometry(0.055, 10, 6),
        kit.ink(),
        s * 0.3,
        kind === "autumn" ? 0.65 : 0.17,
        reach,
      );
      rod(pilot, [s * 0.13, 0.06, 0], [s * 0.24, -0.2, 0.2], 0.06, kit.timber());
      rod(pilot, [s * 0.24, -0.2, 0.2], [s * 0.24, -0.42, 0.12], 0.05, kit.ink());
    }
  }
  return {
    root,
    animate: (speed: number, bank: number, pitch: number, dt: number, steer = 0) => {
      body.rotation.set(-pitch, 0, kind === "spring" ? 0 : bank, "YXZ");
      if (kind === "summer")
        body.position.y =
          0.04 + 1.65 * Math.sin(Math.max(0, pitch)) + 0.76 * Math.abs(Math.sin(bank));
      if (bikeFrame) bikeFrame.rotation.z = T.MathUtils.clamp(bank, -0.2, 0.2);
      if (front) front.rotation.y = steer * 0.35;
      if (pilot && kind === "spring") pilot.rotation.z = bank * 0.15;
      wheels.forEach((w) => (w.rotation.x += (speed * dt) / (kind === "spring" ? 0.345 : 0.36)));
    },
  };
}
export function gameStall(id: string, title: string, color: string) {
  const root = new T.Group();
  root.name = "seasonal-stall-" + id;
  box(root, 2.65, 0.14, 2.2, kit.stone(), 0, 0.02, 0);
  for (const x of [-1.1, 1.1])
    for (const z of [-0.82, 0.82]) box(root, 0.12, 2.7, 0.12, kit.timber(), x, 1.35, z);
  roof(root, {
    width: 2.3,
    depth: 1.85,
    height: 0.52,
    overhang: 0.3,
    lift: 0.17,
    y: 2.68,
    material: id === "winter" ? kit.marble() : kit.tile(),
  });
  const plaque = sign(
    root,
    title,
    id === "winter" ? "V · 入室游玩" : "V · 竞速 / 自由漫游",
    color,
    2.04,
    0.51,
  );
  plaque.position.set(0, 2.32, 1.03);
  lantern(root, -0.9, 0.8, 0.3, 1.55);
  if (id === "winter") {
    box(root, 2.15, 2.4, 0.1, kit.plaster(), 0, 1.2, -0.88);
    for (const x of [-0.57, 0.57]) {
      box(root, 0.7, 1.26, 0.65, kit.timber(), x, 0.7, -0.2);
      box(root, 0.59, 0.57, 0.07, kit.ink(), x, 1.22, 0.17);
      const screen = box(root, 0.45, 0.38, 0.025, kit.lamp("#9bc7cf"), x, 1.25, 0.22);
      screen.name = "arcade-screen";
      for (let i = 0; i < 4; i++)
        box(root, 0.07, 0.07, 0.018, kit.paper(), x - 0.14 + i * 0.09, 1.2 + (i % 2) * 0.1, 0.24);
      box(root, 0.6, 0.07, 0.38, kit.lacquer(), x, 0.86, 0.26);
      mesh(root, new T.SphereGeometry(0.046, 8, 6), kit.gold(), x - 0.15, 0.96, 0.34);
    }
  } else {
    box(root, 1.65, 0.12, 0.95, kit.timberLight(), 0, 0.37, 0);
    const display = gameVehicle(id, false).root;
    display.scale.setScalar(id === "autumn" ? 0.23 : id === "summer" ? 0.39 : 0.7);
    display.position.y = 0.44;
    display.rotation.y = Math.PI / 2;
    root.add(display);
  }
  return root;
}
export function releaseGameObject(root: T.Object3D) {
  root.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.Line || o instanceof T.Points) {
      o.geometry.dispose();
      if (o.name === "owned-material")
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    }
  });
  root.removeFromParent();
}
