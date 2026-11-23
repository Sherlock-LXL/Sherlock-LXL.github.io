/** 独立种子采样避免模坐标序列形成平面。 */
export function precipitationSamples(count, seed = 0x584d19) {
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: random() * 152 - 88,
    y: random() * 56,
    z: random() * 152 - 88,
    speed: 9 + random() * 7,
    length: 0.24 + random() * 0.48,
    tiltX: 0.025 + random() * 0.065,
    tiltZ: (random() - 0.5) * 0.05,
    brightness: 0.55 + random() * 0.45,
  }));
}
