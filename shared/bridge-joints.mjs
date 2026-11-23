/** 按侧弦测量，在圆灯前留出间距。 */
export function bridgeLightSpan(distance, islandRadius, offset = 2.65) {
  const clearance = 1.25;
  const start = Math.sqrt(7.9 ** 2 - offset ** 2) + clearance,
    end = distance - Math.sqrt((islandRadius - 0.28) ** 2 - offset ** 2) - clearance;
  return { start, end, length: Math.max(0, end - start), mid: (start + end) / 2 };
}
