import test from "node:test";
import assert from "node:assert/strict";
import { interactionScore } from "../shared/interaction-focus.mjs";

const eye = { x: 0, y: 1.7, z: 0 },
  forward = { x: 0, y: 0, z: -1 };
test("hints require both proximity and a generous view of the target", () => {
  const score = (target, range = 2.9, size = 0.35) =>
    interactionScore(eye, forward, target, range, size);
  assert.ok(Number.isFinite(score({ x: 0.8, y: 1.2, z: -2 })));
  assert.equal(score({ x: 0, y: 1.2, z: -3 }), -Infinity);
  assert.equal(score({ x: 0, y: 1.2, z: 1 }), -Infinity);
  assert.equal(score({ x: 2, y: 1.2, z: -0.1 }), -Infinity);
  assert.equal(
    interactionScore(eye, { x: 0, y: 1, z: 0 }, { x: 0, y: 1.2, z: -2 }, 2.9),
    -Infinity,
  );
});
test("small objects have tolerance and large objects never allow a rear hint", () => {
  assert.ok(Number.isFinite(interactionScore(eye, forward, { x: 0.4, y: 0.5, z: -1.5 }, 2, 0.08)));
  assert.ok(
    Number.isFinite(interactionScore(eye, forward, { x: 0, y: 0.18, z: -1.15 }, 1.7, 0.85)),
  );
  assert.equal(interactionScore(eye, forward, { x: 1.5, y: 1.7, z: 0.1 }, 2, 20), -Infinity);
  assert.ok(
    interactionScore(eye, forward, { x: 0, y: 1.7, z: -2 }, 3) >
      interactionScore(eye, forward, { x: 1, y: 1.7, z: -1.5 }, 3),
  );
});
