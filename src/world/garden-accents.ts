import * as T from "three";
import { material, mesh } from "./architecture";
import { kit, lantern, scholarRock } from "./vernacular";
import { groundHeight } from "../../shared/terrain-height.mjs";
import { mountainRoutes, closestRoute, landings } from "../../shared/mountain-route.mjs";
import { onRegionRoute } from "../../shared/region-routes.mjs";
import { overlaps } from "../../shared/navigation.mjs";
import { batchStatic } from "./optimizer";
import type { Catalog } from "../core/types";
import type { Obstacle } from "./scenery";

/** 展品与交互预留空间后采样小型种植区。 */
export function gardenAccents(
  scene: T.Scene,
  catalog: Catalog,
  obstacles: Obstacle[],
  reserved: { x: number; z: number }[] = [],
) {
  const root = new T.Group();
  root.name = "garden-accents";
  scene.add(root);
  const entries: { region: string; x: number; y: number; z: number }[] = [];
  const glaze = kit.celadon(),
    stone = kit.stone(),
    leaf = material("#4f7d5e", 0.95, 0, "foliage"),
    snow = material("#f1f5ee", 0.98, 0, "snow");
  for (const r of catalog.regions) {
    let seed = 1271 + r.id.length;
    const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296,
      routes = mountainRoutes(r),
      exhibits = catalog.modules.filter((m) => m.region === r.id);
    let count = 0;
    for (let attempt = 0; attempt < 500 && count < 6; attempt++) {
      const x = (random() * 2 - 1) * (r.radius - 3.8),
        z = (random() * 2 - 1) * (r.radius - 3.8),
        wx = x + r.position[0],
        wz = z + r.position[1];
      if (
        Math.hypot(x, z) > r.radius - 3.5 ||
        (z > 15 && r.terrain) ||
        exhibits.some((m) => Math.hypot(x - m.position[0], z - m.position[1]) < 6.1) ||
        reserved.some((p) => Math.hypot(wx - p.x, wz - p.z) < 2.3) ||
        obstacles.some((o) => overlaps(wx, wz, o, 1.1))
      )
        continue;
      if (
        routes.length
          ? routes.some((road) => closestRoute(x, z, road).distance < road.width / 2 + 1.2) ||
            landings(r).some((p) => Math.hypot(x - p.x, z - p.z) < p.radius + 1.1)
          : onRegionRoute(x, z, r, exhibits, 1.3)
      )
        continue;
      const y = groundHeight(wx, wz, catalog.regions),
        heights = [
          [0.65, 0],
          [-0.65, 0],
          [0, 0.65],
          [0, -0.65],
        ].map(([dx, dz]) => groundHeight(wx + dx, wz + dz, catalog.regions));
      if (Math.max(...heights, y) - Math.min(...heights, y) > 0.14) continue;
      const g = new T.Group();
      g.position.set(wx, y, wz);
      g.rotation.y = random() * Math.PI * 2;
      root.add(g);
      for (let i = 0; i < 4; i++) {
        const a = i * 2.4,
          rock = mesh(
            g,
            new T.DodecahedronGeometry(1, 1),
            r.season === "winter" ? snow : kit.rock(),
            Math.cos(a) * 0.45,
            0.07,
            Math.sin(a) * 0.42,
          );
        rock.scale.set(0.16 + i * 0.02, 0.1, 0.14 + i * 0.018);
        rock.rotation.y = a;
      }
      if (count % 3 === 0) {
        // 石间布置低矮园灯。
        lantern(g, 0, 0, 0.42);
      } else if (r.season === "summer") {
        // 赏石旁布置芦苇。
        scholarRock(g, -0.15, 0, 0.55);
        for (let i = 0; i < 7; i++) {
          const reed = mesh(
            g,
            new T.CylinderGeometry(0.008, 0.012, 0.55 + (i % 3) * 0.12, 4),
            leaf,
            0.25 + Math.cos(i * 2.4) * 0.12,
            0.3,
            Math.sin(i * 2.4) * 0.12,
          );
          reed.rotation.z = i % 2 ? 0.12 : -0.1;
        }
      } else {
        // 青瓷花盆栽种兰叶，秋冬搭配浆果。
        const profile = [
          [0.15, 0],
          [0.26, 0.07],
          [0.32, 0.33],
          [0.33, 0.36],
          [0.29, 0.36],
          [0.28, 0.31],
          [0.25, 0.09],
        ].map(([x, y]) => new T.Vector2(x, y));
        mesh(g, new T.LatheGeometry(profile, 20), r.season === "winter" ? stone : glaze);
        mesh(g, new T.CylinderGeometry(0.27, 0.27, 0.035, 20), kit.soil(), 0, 0.29);
        for (let i = 0; i < 9; i++) {
          const a = (i * Math.PI * 2) / 9,
            stalk = new T.Group();
          stalk.rotation.y = a;
          g.add(stalk);
          const blade = mesh(
            stalk,
            new T.SphereGeometry(1, 10, 6),
            leaf,
            0,
            0.43 + (i % 3) * 0.035,
            0.13,
          );
          blade.scale.set(0.05, 0.22, 0.02);
          blade.rotation.x = 0.75;
          if (r.season === "autumn" || r.season === "winter")
            mesh(
              stalk,
              new T.SphereGeometry(0.035, 8, 6),
              material(r.season === "winter" ? "#b8432f" : "#dcb04c"),
              0,
              0.61,
              0.2,
            );
        }
      }
      obstacles.push({ x: wx, z: wz, radius: 0.55, height: y + 0.7 });
      entries.push({ region: r.id, x: wx, y, z: wz });
      count++;
    }
  }
  return { entries, release: batchStatic(root) };
}
