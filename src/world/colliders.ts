import type { Obstacle } from "./scenery";

/** 预设几何体配套碰撞体，保持门洞与展厅地面可通行。 */
export function exhibitColliders(kind: string, x: number, z: number): Obstacle[] {
  const shapes: Obstacle[] = [];
  const box = (dx: number, dz: number, halfX: number, halfZ: number, height: number) =>
    shapes.push({ x: x + dx, z: z + dz, radius: 0, halfX, halfZ, height });
  const circle = (dx: number, dz: number, radius: number, height: number) =>
    shapes.push({ x: x + dx, z: z + dz, radius, height });
  circle(0, 0, 4.05, 0.07);
  const presets: Record<string, () => void> = {
    tower: () => box(0, 0, 2.35, 2.35, 11.8),
    forest: () => {
      circle(0, 1, 0.8, 2.85);
      for (const [dx, dz] of [
        [-2, -1],
        [2, -1],
        [0, -2.5],
      ])
        circle(dx, dz, 0.22, 5);
      box(0, -3.6, 2.14, 0.15, 2.9);
    },
    mirror: () => {
      box(0, 0, 2.25, 1.5, 0.47);
      box(0, 0, 2.05, 0.3, 5.6);
      for (const dx of [-1.93, 1.93]) box(dx, 0, 0.21, 0.75, 0.81);
    },
    garden: () => {
      box(0, 0, 1.4, 0.75, 1.75);
      for (const dx of [-2, 2]) box(dx, 0, 0.17, 0.21, 5.9);
      for (const dx of [-1.65, 1.65]) box(dx, 1.25, 0.48, 0.33, 1.02);
      for (const [dx, dz] of [
        [-2.65, -0.7],
        [2.65, -0.7],
        [0, -2.55],
      ])
        circle(dx, dz, 0.4, 1.2);
    },
    gift: () => box(0, 0, 1.55, 1.55, 3.6),
    bubble: () => {
      circle(0, 0, 3.5, 0.5);
      circle(0, 0, 2.6, 0.68);
      circle(0, 0, 2.15, 3.5);
      for (const dx of [-3, 3]) box(dx, 0, 0.15, 0.15, 3);
    },
    light: () => presets.bubble(),
    gallery: () => {
      box(0, 0, 3.5, 2.5, 0.5);
      box(0, -2, 3.5, 0.2, 4.8);
      box(-3.3, 0, 0.2, 2, 4.8);
      box(0, 1, 1.5, 0.4, 1.15);
    },
    music: () => {
      circle(0, 0, 3.6, 0.5);
      box(0, 0, 1.8, 0.8, 2.85);
      box(0, 1, 1.8, 0.35, 2);
    },
    studio: () => {
      box(0, 0, 4, 3, 0.5);
      box(0, -2, 4, 0.25, 6);
      for (const dx of [-3.2, 3.2]) box(dx, 0.9, 0.4, 0.33, 2.1);
      box(2, 1.1, 0.65, 0.48, 2.15);
      circle(-1.5, 1.3, 0.15, 2.25);
      for (const dx of [-3.85, 3.85]) circle(dx, 2.8, 0.22, 6.4);
    },
  };
  (presets[kind] ?? (() => circle(0, 0, 2.1, 6)))();
  return shapes;
}
