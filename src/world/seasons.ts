import * as T from "three";
import { exhibitLocal } from "../../shared/exhibit-layout.mjs";
import { onRegionRoute } from "../../shared/region-routes.mjs";
import { material, mesh, softBox, tree } from "./architecture";
import { kit, paintedTree } from "./vernacular";
import { flowerDrifts, type FlowerPoint } from "./garden-details";
import { batchStatic } from "./optimizer";
import { groundHeight } from "../../shared/terrain-height.mjs";
import { mountainRoutes, closestRoute, landings } from "../../shared/mountain-route.mjs";
import { overlaps, pointSegmentDistance } from "../../shared/navigation.mjs";
import { footprintsOverlap } from "../../shared/decoration-clearance.mjs";
import type { Catalog, Region } from "../core/types";
import type { Obstacle } from "./scenery";

/** 季节植物使用原有花园空地，避开路径与项目占地。 */
export class Seasons {
  readonly snowDrifts: {
    x: number;
    y: number;
    z: number;
    halfX: number;
    halfZ: number;
    top: number;
  }[] = [];
  private fields: { points: T.Points; base: Float32Array; region: Region; kind: string }[] = [];
  private release: (() => void)[] = [];
  private time = 0;
  constructor(
    private scene: T.Scene,
    catalog: Catalog,
    obstacles: Obstacle[],
  ) {
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const ink = sprite.getContext("2d")!;
    const soft = ink.createRadialGradient(16, 16, 1, 16, 16, 15);
    soft.addColorStop(0, "#fff");
    soft.addColorStop(0.6, "#ffffffdd");
    soft.addColorStop(1, "#ffffff00");
    ink.fillStyle = soft;
    ink.fillRect(0, 0, 32, 32);
    const particleMap = new T.CanvasTexture(sprite);
    for (const r of catalog.regions) {
      if (!r.season) continue;
      const root = new T.Group();
      root.position.set(r.position[0], 0, r.position[1]);
      root.name = `season-${r.season}`;
      scene.add(root);
      const exhibits = catalog.modules.filter((m) => m.region === r.id),
        routes = mountainRoutes(r);
      let seed = 1937 + r.id.length;
      const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
      const height = (x: number, z: number) =>
        groundHeight(x + r.position[0], z + r.position[1], catalog.regions);
      const clear = (x: number, z: number, margin = 0.8) =>
        Math.hypot(x, z) < r.radius - 2.4 &&
        !(Math.abs(x) < 7 && z > 8) &&
        !exhibits.some((m) => Math.hypot(x - m.position[0], z - m.position[1]) < 5.5 + margin) &&
        !obstacles.some((o) => overlaps(x + r.position[0], z + r.position[1], o, margin)) &&
        (routes.length
          ? !routes.some((road) => closestRoute(x, z, road).distance < road.width / 2 + margin) &&
            !landings(r).some((p) => Math.hypot(x - p.x, z - p.z) < p.radius + margin)
          : !onRegionRoute(x, z, r, exhibits, margin));
      if (r.season === "spring") {
        const flowers: FlowerPoint[] = [];
        for (let i = 0; i < 1800 && flowers.length < 330; i++) {
          const x = (random() * 2 - 1) * r.radius,
            z = (random() * 2 - 1) * r.radius;
          if (clear(x, z, 0.5)) {
            const y = height(x, z);
            if (
              Math.max(
                ...[
                  [0.3, 0],
                  [-0.3, 0],
                  [0, 0.3],
                  [0, -0.3],
                ].map(([dx, dz]) => Math.abs(height(x + dx, z + dz) - y)),
              ) < 0.18
            )
              flowers.push({ x, y: y + 0.06, z });
          }
        }
        root.add(flowerDrifts(flowers));
      }
      if (r.season === "summer") {
        const grass = new T.InstancedMesh(
            new T.ConeGeometry(0.065, 0.22, 3),
            material("#6f9a62", 1, 0, "foliage"),
            650,
          ),
          pose = new T.Object3D();
        let blades = 0;
        for (let i = 0; i < 4500 && blades < 650; i++) {
          const x = (random() * 2 - 1) * (r.radius - 3),
            z = (random() * 2 - 1) * (r.radius - 3);
          if (!clear(x, z, 0.35) || Math.hypot(x - 11.2, z + 2.3) < 2.8) continue;
          pose.position.set(x, 0.08, z);
          pose.rotation.set(0, random() * 6, 0.18);
          pose.scale.set(1, 0.5 + random() * 0.5, 1);
          pose.updateMatrix();
          grass.setMatrixAt(blades++, pose.matrix);
        }
        grass.count = blades;
        grass.receiveShadow = true;
        root.add(grass);
        // 书房旁的荷池避开入口与岸栏。
        const x = 11.2,
          z = -2.3;
        mesh(root, new T.CylinderGeometry(2.35, 2.5, 0.28, 24), kit.stone(), x, 0.14, z);
        mesh(
          root,
          new T.CylinderGeometry(2.19, 2.19, 0.035, 48),
          new T.MeshStandardMaterial({ color: "#4f8a80", roughness: 0.25, metalness: 0.12 }),
          x,
          0.3,
          z,
        );
        const rim = mesh(root, new T.TorusGeometry(2.28, 0.07, 6, 24), kit.marble(), x, 0.31, z);
        rim.rotation.x = Math.PI / 2;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          mesh(
            root,
            new T.BoxGeometry(0.2, 0.16, 0.2),
            kit.marble(),
            x + Math.cos(a) * 2.3,
            0.36,
            z + Math.sin(a) * 2.3,
          ).rotation.y = -a;
        }
        for (let i = 0; i < 17; i++) {
          const a = i * 2.4,
            rad = 0.25 + Math.sqrt(i) * 0.42,
            px = x + Math.cos(a) * rad,
            pz = z + Math.sin(a) * rad;
          const leaf = mesh(
            root,
            new T.CircleGeometry(0.25 + (i % 3) * 0.07, 18, 0.12, Math.PI * 2 - 0.3),
            material(i % 2 ? "#4f8a62" : "#6f9d6a", 0.85, 0, "foliage"),
            px,
            0.34 + (i % 2) * 0.016,
            pz,
          );
          leaf.rotation.x = -Math.PI / 2;
          leaf.rotation.z = a;
          leaf.castShadow = false;
          if (i % 4 === 0) {
            const flower = new T.Group();
            flower.position.set(px, 0.42, pz);
            root.add(flower);
            for (let n = 0; n < 7; n++) {
              const t = (n * Math.PI * 2) / 7,
                p = mesh(
                  flower,
                  new T.SphereGeometry(1, 8, 6),
                  material("#e7a4b6", 0.85, 0, "foliage"),
                  Math.cos(t) * 0.12,
                  0.07,
                  Math.sin(t) * 0.12,
                );
              p.scale.set(0.085, 0.18, 0.07);
              p.rotation.z = Math.cos(t) * 0.4;
              p.rotation.x = Math.sin(t) * 0.4;
            }
            mesh(flower, new T.SphereGeometry(0.07, 8, 6), material("#dcb04c"), 0, 0.16);
          }
        }
        obstacles.push({ x: r.position[0] + x, z: r.position[1] + z, radius: 2.4, height: 0.4 });
        for (let i = 0; i < 24; i++) {
          const a = i * 2.4,
            rad = r.radius - 1.2,
            x = Math.cos(a) * rad,
            z = Math.sin(a) * rad;
          if (pointSegmentDistance(x, z, 0, 0, -r.position[0], -r.position[1]) < 3) continue;
          const shell = mesh(
            root,
            new T.SphereGeometry(1, 8, 6),
            material("#f4e5cf", 0.95, 0),
            x,
            0.04,
            z,
          );
          shell.scale.set(0.11, 0.045, 0.15);
          shell.rotation.y = a;
          shell.castShadow = false;
        }
      }
      if (r.season === "autumn") {
        for (const [i, [x, z]] of [
          [-12, 5],
          [12, 5],
          [0, 12],
          [-7, 12],
          [7, 12],
        ].entries()) {
          if (
            onRegionRoute(x, z, r, exhibits, 1.3) ||
            obstacles.some((o) => overlaps(x + r.position[0], z + r.position[1], o, 1.2))
          )
            continue;
          tree(root, x, z, 0.95 + (i % 2) * 0.16, ["#da8249", "#c86447", "#e4b34e"][i % 3]);
          obstacles.push({ x: x + r.position[0], z: z + r.position[1], radius: 0.25, height: 4 });
        }
        // 实例化枫叶散落于地面。
        const shape = new T.Shape();
        const outline = [
          [0, 1],
          [0.15, 0.5],
          [0.43, 0.68],
          [0.36, 0.26],
          [0.83, 0.34],
          [0.65, 0.05],
          [1, -0.12],
          [0.45, -0.27],
          [0.47, -0.53],
          [0.1, -0.38],
          [0, -0.72],
          [-0.1, -0.38],
          [-0.47, -0.53],
          [-0.45, -0.27],
          [-1, -0.12],
          [-0.65, 0.05],
          [-0.83, 0.34],
          [-0.36, 0.26],
          [-0.43, 0.68],
          [-0.15, 0.5],
        ];
        outline.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
        shape.closePath();
        const leafMaterial = new T.MeshStandardMaterial({
          color: "#ffffff",
          side: T.DoubleSide,
          roughness: 1,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -2,
        });
        const leaves = new T.InstancedMesh(new T.ShapeGeometry(shape), leafMaterial, 1900),
          pose = new T.Object3D();
        let count = 0;
        for (let i = 0; i < 11000 && count < 1900; i++) {
          const x = (random() * 2 - 1) * (r.radius - 1),
            z = (random() * 2 - 1) * (r.radius - 1);
          if (
            Math.hypot(x, z) > r.radius - 1 ||
            exhibits.some((m) => {
              const p = exhibitLocal(m, x, z);
              return Math.abs(p.x) < 4.9 && p.z > -8.9 && p.z < 4;
            }) ||
            obstacles.some((o) => overlaps(x + r.position[0], z + r.position[1], o, 0.12))
          )
            continue;
          if (onRegionRoute(x, z, r, exhibits, 0.2) && random() > 0.08) continue;
          const size = 0.1 + random() * 0.13;
          pose.position.set(x, 0.06 + random() * 0.025, z);
          pose.rotation.set(-Math.PI / 2, 0, random() * 6.28);
          pose.scale.set(size, size, 1);
          pose.updateMatrix();
          leaves.setMatrixAt(count, pose.matrix);
          leaves.setColorAt(
            count++,
            new T.Color(["#ce7854", "#d99650", "#d5aa59", "#b9664b", "#e6bd6b"][i % 5]),
          );
        }
        leaves.count = count;
        leaves.receiveShadow = true;
        root.add(leaves);
      }
      if (r.season === "winter") {
        const snow = material("#f5f7f5", 1, 0);
        for (const [x, z] of [
          [-12, -5],
          [12, 3],
          [-9, 6],
        ])
          if (clear(x, z, 1)) {
            paintedTree(root, x, z, 1.05, "snowpine", height(x, z));
            obstacles.push({
              x: r.position[0] + x,
              z: r.position[1] + z,
              radius: 0.17,
              height: 3.7,
            });
          }
        let snowmen = 0;
        const candidates = [
          [-12, 3.5],
          [8, 11.5],
          [-11, -5],
          [11, 8],
          [5, 11],
          [-7, 7],
          [-12, 1],
          ...Array.from({ length: 120 }, (_, i) => [
            Math.cos(i * 2.4) * (10 + (i % 4)),
            Math.sin(i * 2.4) * (10 + (i % 4)),
          ]),
        ];
        for (const [x, z] of candidates) {
          if (snowmen >= 2 || !clear(x, z, 1)) continue;
          snowmen++;
          const man = new T.Group();
          man.name = "snowman";
          man.position.set(x, 0, z);
          man.rotation.y = Math.atan2(-x, 7 - z);
          root.add(man);
          mesh(man, new T.SphereGeometry(0.52, 20, 14), snow, 0, 0.47);
          mesh(man, new T.SphereGeometry(0.36, 20, 14), snow, 0, 1.12);
          const coal = kit.ink(),
            scarf = material("#b8432f", 0.9, 0);
          for (const side of [-1, 1])
            mesh(man, new T.SphereGeometry(0.035, 8, 6), coal, side * 0.105, 1.21, 0.325);
          const nose = mesh(
            man,
            new T.ConeGeometry(0.06, 0.27, 8),
            material("#c98a4c"),
            0,
            1.12,
            0.41,
          );
          nose.rotation.x = Math.PI / 2;
          mesh(man, new T.CylinderGeometry(0.38, 0.38, 0.12, 24), scarf, 0, 0.96);
          mesh(man, softBox(0.12, 0.36, 0.055), scarf, 0.21, 0.79, 0.39);
          // 采用编织斗笠。
          const hat = new T.LatheGeometry(
            [
              [0, 0.32],
              [0.08, 0.3],
              [0.3, 0.12],
              [0.5, 0.02],
              [0.52, 0],
              [0, 0],
            ].map(([w, h]) => new T.Vector2(w, h)),
            20,
          );
          mesh(man, hat, kit.straw(), 0, 1.38);
          mesh(man, new T.TorusGeometry(0.51, 0.018, 4, 24), kit.timber(), 0, 1.385).rotation.x =
            Math.PI / 2;
          for (let i = 0; i < 3; i++)
            mesh(man, new T.SphereGeometry(0.033, 8, 6), coal, 0, 0.41 + i * 0.13, 0.5);
          obstacles.push({ x: r.position[0] + x, z: r.position[1] + z, radius: 0.53, height: 1.7 });
        }
      }
      if (r.season !== "summer") {
        const count = r.season === "spring" ? 160 : r.season === "winter" ? 150 : 80,
          base = new Float32Array(count * 3),
          positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const a = random() * Math.PI * 2,
            d = Math.sqrt(random()) * (r.radius - 2),
            x = Math.cos(a) * d,
            z = Math.sin(a) * d;
          base.set([x, height(x, z) + 1 + random() * 5, z], i * 3);
        }
        positions.set(base);
        const geometry = new T.BufferGeometry();
        geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
        const mat = new T.PointsMaterial({
          map: particleMap,
          color: r.season === "winter" ? "#f4f8ff" : r.season === "spring" ? "#f7c8dc" : "#e5b561",
          size: r.season === "winter" ? 0.075 : 0.1,
          transparent: true,
          opacity: 0.72,
          depthWrite: false,
        });
        const points = new T.Points(geometry, mat);
        root.add(points);
        this.fields.push({ points, base, region: r, kind: r.season });
      }
      this.release.push(batchStatic(root));
    }
  }
  /** 家具、花园与记忆台座布置完成后再添加浅层落叶。 */
  settleSnow(catalog: Catalog, obstacles: Obstacle[], reserved: { x: number; z: number }[]) {
    const root = new T.Group();
    root.name = "winter-snow-drifts";
    this.scene.add(root);
    const snow = material("#f5f7f5", 1, 0),
      shape = new T.SphereGeometry(1, 20, 12);
    let seed = 29137;
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    for (const r of catalog.regions.filter((r) => r.season === "winter")) {
      const exhibits = catalog.modules.filter((m) => m.region === r.id);
      let count = 0;
      for (let i = 0; i < 1400 && count < 55; i++) {
        const x = (random() * 2 - 1) * r.radius,
          z = (random() * 2 - 1) * r.radius,
          halfX = 0.38 + random() * 0.62,
          halfZ = 0.35 + random() * 0.6,
          wx = x + r.position[0],
          wz = z + r.position[1],
          radius = Math.max(halfX, halfZ),
          footprint = { x: wx, z: wz, halfX, halfZ };
        if (
          Math.hypot(x, z) + radius > r.radius - 3 ||
          onRegionRoute(x, z, r, exhibits, radius + 0.35) ||
          exhibits.some((m) => Math.hypot(x - m.position[0], z - m.position[1]) < 5.5 + radius)
        )
          continue;
        if (
          obstacles.some((o) => footprintsOverlap(footprint, o, 0.45)) ||
          reserved.some((p) => footprintsOverlap(footprint, { ...p, radius: 1.5 }, 0.25)) ||
          this.snowDrifts.some((p) => footprintsOverlap(footprint, p, 0.2))
        )
          continue;
        const y = groundHeight(wx, wz, catalog.regions) - 0.025,
          h = 0.09 + random() * 0.07;
        const drift = mesh(root, shape, snow, wx, y, wz);
        drift.scale.set(halfX, h, halfZ);
        drift.castShadow = false;
        this.snowDrifts.push({ ...footprint, y, top: y + h });
        count++;
      }
    }
    this.release.push(batchStatic(root));
  }
  update(dt: number, reduced: boolean) {
    this.time += dt;
    for (const { points, base, kind } of this.fields) {
      points.visible = !reduced;
      if (reduced) continue;
      const p = points.geometry.attributes.position as T.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const phase = this.time * (kind === "winter" ? 0.42 : 0.35) + i * 0.73,
          drift = Math.sin(phase) * 0.55;
        p.setXYZ(
          i,
          base[i * 3] + drift,
          base[i * 3 + 1] + Math.sin(phase * 0.8) * 0.65,
          base[i * 3 + 2] + Math.cos(phase * 0.7) * 0.35,
        );
      }
      p.needsUpdate = true;
    }
  }
  dispose() {
    this.release.forEach((f) => f());
  }
}
