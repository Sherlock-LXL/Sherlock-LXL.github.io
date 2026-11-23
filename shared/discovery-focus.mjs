import { interactionScore } from "./interaction-focus.mjs";
// G 提示与动作共用焦点排序。
export function discoveryScore(x, z, targetX, targetZ, radius, heading, targetY = 0) {
  if (!heading) {
    const distance = Math.hypot(targetX - x, targetZ - z);
    return distance < radius ? -distance : -Infinity;
  }
  return interactionScore(
    { x, y: heading.eyeY ?? targetY, z },
    { x: heading.x, y: heading.y ?? 0, z: heading.z },
    { x: targetX, y: targetY, z: targetZ },
    radius,
  );
}
