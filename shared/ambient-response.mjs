export function proximityEnergy(distance, near = 4, far = 14) {
  if (distance <= near) return 1;
  if (distance >= far) return 0;
  const t = (distance - near) / (far - near);
  return 1 - t * t * (3 - 2 * t);
}

/** 通过积分处理变速，避免直接乘接近程度导致相位跳变。 */
export function advanceAmbientPhase(phase, dt, activity, reduced = false) {
  return (
    phase +
    (reduced ? 0 : Math.max(0, Math.min(0.1, dt)) * (1 + Math.max(0, Math.min(1, activity)) * 0.45))
  );
}

export function resonantRegions(entries, found) {
  return new Set(
    entries.filter((entry) => found.has(entry.id) && entry.regionId).map((entry) => entry.regionId),
  );
}
