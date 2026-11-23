import { onGround, overlaps } from "./navigation.mjs";
import { groundHeight } from "./terrain-height.mjs";
export const GRAVITY = 22;
export const JUMP_SPEED = 8;
export const STEP_HEIGHT = 0.48;
export function createWalker(x = 0, z = 0, regions = []) {
  return { x, y: groundHeight(x, z, regions), z, vy: 0, grounded: true, stepOffset: 0 };
}
function topAt(x, z, obstacles, regions, radius = 0.35, footprint = [{ x: 0, z: 0 }]) {
  let top = groundHeight(x, z, regions);
  for (const obstacle of obstacles)
    if (footprint.some((p) => overlaps(x + p.x, z + p.z, obstacle, radius)))
      top = Math.max(top, obstacle.height ?? Infinity);
  return top;
}
/** 动物身体使用有边界表面；沿表面解算接触，包括动物移动造成的玩家重叠。 */
export function separateBodies(point, bodies, radius = 0.35) {
  const p = { ...point };
  for (let pass = 0; pass < 3; pass++)
    for (const o of bodies) {
      if (p.y >= (o.height ?? Infinity) || p.y + 1.4 < (o.base ?? -Infinity)) continue;
      let cx = o.x,
        cz = o.z;
      if (o.segment) {
        const [ax, az, bx, bz] = o.segment,
          dx = bx - ax,
          dz = bz - az;
        const t = Math.max(
          0,
          Math.min(1, ((p.x - ax) * dx + (p.z - az) * dz) / (dx * dx + dz * dz || 1)),
        );
        cx = ax + dx * t;
        cz = az + dz * t;
      }
      const dx = p.x - cx,
        dz = p.z - cz,
        d = Math.hypot(dx, dz),
        r = radius + o.radius;
      if (d < r) {
        p.x += (d ? dx / d : 1) * (r - d + 0.0001);
        p.z += (d ? dz / d : 0) * (r - d + 0.0001);
      }
    }
  return p;
}
/** 按脚底位置计算垂直扫掠落点与短碰撞子步，独立于渲染器。 */
export function advanceWalker(state, input, dt, regions, obstacles, options = {}) {
  const bodies = obstacles.filter((o) => o.dynamic),
    solid = obstacles.filter((o) => !o.dynamic),
    radius = options.radius ?? 0.35;
  const footprint = options.footprint ?? [{ x: 0, z: 0 }],
    stepHeight = options.stepHeight ?? STEP_HEIGHT;
  const top = (x, z) => topAt(x, z, solid, regions, radius, footprint);
  const clear = (x, z) =>
    onGround(x, z, regions) &&
    (!options.canEnter || options.canEnter(x, z)) &&
    state.y >= groundHeight(x, z, regions) - 0.001 &&
    !solid.some(
      (o) =>
        footprint.some((p) => overlaps(x + p.x, z + p.z, o, radius)) &&
        state.y < (o.height ?? Infinity) - 0.001,
    );
  if (input.jump && state.grounded) {
    state.vy = options.jumpSpeed ?? JUMP_SPEED;
    state.grounded = false;
  }
  const steps = Math.max(1, Math.ceil(Math.min(0.1, Math.max(0, dt)) / (1 / 120))),
    h = Math.min(0.1, Math.max(0, dt)) / steps;
  for (let i = 0; i < steps; i++) {
    const before = state.y;
    state.y += state.vy * h - (GRAVITY * h * h) / 2;
    state.vy -= GRAVITY * h;
    const floor = top(state.x, state.z);
    if (state.vy <= 0 && before >= floor - 0.002 && state.y <= floor) {
      state.y = floor;
      state.vy = 0;
      state.grounded = true;
    } else state.grounded = false;
    const start = { x: state.x, z: state.z, y: state.y };
    for (const axis of ["x", "z"]) {
      const x = state.x + (axis === "x" ? input.x * h : 0),
        z = state.z + (axis === "z" ? input.z * h : 0);
      if (!onGround(x, z, regions)) continue;
      if (options.canEnter && !options.canEnter(x, z)) continue;
      const floor = top(x, z);
      if (state.grounded && Math.abs(floor - state.y) <= stepHeight) {
        const rise = floor - state.y;
        if (Math.abs(rise) > 0.055)
          state.stepOffset = Math.max(-0.6, Math.min(0.6, (state.stepOffset ?? 0) - rise));
        state.y = floor;
        state[axis] = axis === "x" ? x : z;
      } else if (clear(x, z)) state[axis] = axis === "x" ? x : z;
    }
    const separated = separateBodies(state, bodies, radius);
    const correction = Math.hypot(separated.x - state.x, separated.z - state.z);
    let safe = true;
    for (let j = 1, n = Math.ceil(correction / 0.08); j <= n; j++) {
      if (
        !clear(
          state.x + ((separated.x - state.x) * j) / n,
          state.z + ((separated.z - state.z) * j) / n,
        )
      ) {
        safe = false;
        break;
      }
    }
    if (safe) {
      state.x = separated.x;
      state.z = separated.z;
    } else {
      // 角落中的动物接触仅保留减少已有穿透的修正，允许后退且避免推入墙体。
      const was = separateBodies(start, bodies, radius);
      if (correction > Math.hypot(was.x - start.x, was.z - start.z) + 0.0001) {
        state.x = start.x;
        state.z = start.z;
        state.y = start.y;
      }
    }
    // 离开边缘后在下一子步开始下落，禁止空中再次起跳。
    if (top(state.x, state.z) < state.y - 0.002) state.grounded = false;
    const terrainFloor = groundHeight(state.x, state.z, regions);
    if (state.y < terrainFloor) {
      state.y = terrainFloor;
      state.vy = 0;
      state.grounded = true;
    }
    state.stepOffset = (state.stepOffset ?? 0) * Math.exp(-h * 15);
  }
  return state;
}
