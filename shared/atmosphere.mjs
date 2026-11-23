const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** 完整天体轨道：06:00 日出、18:00 日落，月亮与太阳相对。 */
export function daylight(hour) {
  const angle = ((hour - 6) / 24) * Math.PI * 2,
    altitude = Math.sin(angle);
  return {
    angle,
    altitude,
    day: smooth(-0.16, 0.32, altitude),
    twilight: 1 - smooth(0, 0.4, Math.abs(altitude)),
    sun: smooth(-0.04, 0.3, altitude),
    moon: smooth(-0.04, 0.3, -altitude),
  };
}
/** 连续包络重触发时仅更新目标，保持当前姿态。 */
export function advanceFlight(state, age, dt) {
  const target = 1 - smooth(4.5, 8, age);
  state.energy += (target - state.energy) * (1 - Math.exp(-Math.max(0, dt) * 2.4));
  state.phase += Math.max(0, dt) * (3 + state.energy * 7);
  return state;
}
