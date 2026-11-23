import { exhibitLocal } from "./exhibit-layout.mjs";
import { footprintsOverlap } from "./decoration-clearance.mjs";
/** 以不同径向带分隔围栏、树干与灯柱。 */
export function shoreLayout(region, exhibits = []) {
  const [rx, rz] = region.position,
    distance = Math.hypot(rx, rz),
    entries = [];
  for (let i = 0; i < 28; i++) {
    const angle = (i * Math.PI * 2) / 28,
      c = Math.cos(angle),
      s = Math.sin(angle);
    if ((c * -rx + s * -rz) / distance > 0.88) continue;
    const fence = { x: c * (region.radius - 0.45), z: s * (region.radius - 0.45) };
    const plant = { x: c * (region.radius - 1.8), z: s * (region.radius - 1.8) };
    // 到达花园、后方建筑与展品占地保持畅通。
    const occupied =
      (Math.abs(plant.x) < 7 && plant.z > 9) ||
      (plant.z < -10 && region.scenery !== "woodland") ||
      (Math.abs(plant.x) > 8 && Math.abs(plant.x) < 12 && plant.z > 7 && plant.z < 13) ||
      (region.scenery === "laboratory" &&
        [-12, 12].some((x) => Math.hypot(plant.x - x, plant.z + 9) < 3.2)) ||
      exhibits.some((m) => Math.hypot(plant.x - m.position[0], plant.z - m.position[1]) < 4.7) ||
      (region.scenery === "museum" &&
        exhibits.some((m) => {
          const p = exhibitLocal(m, plant.x, plant.z);
          return Math.abs(p.x) < 6.3 && p.z < 5.6 && p.z > -10;
        }));
    // 设备廊延至后岸，添加切向栏杆前预留完整柜体角点。
    const rail = {
      segment: [fence.x - s * 0.75, fence.z + c * 0.75, fence.x + s * 0.75, fence.z - c * 0.75],
      radius: 0.04,
    };
    const equipment =
      region.scenery === "laboratory"
        ? Array.from({ length: 5 }, (_, n) => ({
            x: -9 + n * 4.5,
            z: -12,
            halfX: 1.1,
            halfZ: 0.65,
          }))
        : [];
    const fenceClear = !equipment.some((o) => footprintsOverlap(rail, o, 0.3));
    entries.push({
      angle,
      fence,
      fenceClear,
      plant: occupied ? null : plant,
      kind: i % 4 === 0 ? "lamp" : "tree",
      index: i,
    });
  }
  return entries;
}
