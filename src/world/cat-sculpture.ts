import * as T from "three";

/** 卧猫后腿收于身体轮廓，露出两只前爪，采用纸白与墨色。 */
export function catSculpture() {
  const cat = new T.Group();
  cat.name = "resting-cat";
  const fur = new T.MeshStandardMaterial({ color: "#ebe3d3", roughness: 0.86 }),
    cream = new T.MeshStandardMaterial({ color: "#f7f1e4", roughness: 0.88 }),
    pink = new T.MeshStandardMaterial({ color: "#c98f86", roughness: 0.8 }),
    ink = new T.MeshStandardMaterial({ color: "#2b2824", roughness: 0.65 });
  const ball = (
    name: string,
    m: T.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) => {
    const o = new T.Mesh(new T.SphereGeometry(1, 32, 24), m);
    o.name = name;
    o.position.set(x, y, z);
    o.scale.set(sx, sy, sz);
    o.castShadow = o.receiveShadow = true;
    cat.add(o);
    return o;
  };
  ball("cat-body", fur, 0, 0.63, 0.91, 0.7, 0.51, 0.87);
  ball("cat-head", fur, 0, 1.48, 1.42, 0.56, 0.5, 0.47);
  ball("cat-chest", cream, 0, 1.01, 1.5, 0.34, 0.36, 0.16);
  for (const side of [-1, 1]) {
    ball(
      side < 0 ? "cat-paw-left" : "cat-paw-right",
      cream,
      side * 0.265,
      0.21,
      1.56,
      0.21,
      0.14,
      0.3,
    );
    const outline = new T.Shape();
    outline.moveTo(-0.22, -0.15);
    outline.quadraticCurveTo(-0.2, -0.2, 0.2, -0.15);
    outline.quadraticCurveTo(0.24, -0.1, 0.035, 0.24);
    outline.quadraticCurveTo(0, 0.29, -0.035, 0.24);
    outline.quadraticCurveTo(-0.24, -0.1, -0.22, -0.15);
    const ear = new T.Mesh(
      new T.ExtrudeGeometry(outline, {
        depth: 0.09,
        bevelEnabled: true,
        bevelThickness: 0.045,
        bevelSize: 0.025,
        bevelSegments: 3,
        curveSegments: 12,
      }),
      fur,
    );
    ear.position.set(side * 0.34, 1.93, 1.37);
    ear.rotation.z = -side * 0.19;
    ear.castShadow = true;
    cat.add(ear);
    const inner = new T.Mesh(new T.ShapeGeometry(outline, 12), pink);
    inner.scale.set(0.63, 0.64, 1);
    inner.position.set(0, 0, 0.138);
    ear.add(inner);
    ball("cat-eye", ink, side * 0.195, 1.53, 1.858, 0.048, 0.068, 0.027);
    ball("cat-eye-highlight", cream, side * 0.195 - 0.01, 1.553, 1.883, 0.013, 0.016, 0.008);
    ball("cat-muzzle", cream, side * 0.095, 1.365, 1.829, 0.14, 0.11, 0.105);
  }
  ball("cat-nose", pink, 0, 1.402, 1.929, 0.045, 0.032, 0.025);
  const stroke = (points: number[][], radius: number, m: T.Material) => {
    const curve = new T.CatmullRomCurve3(
        points.map((p) => new T.Vector3(...(p as [number, number, number]))),
      ),
      o = new T.Mesh(new T.TubeGeometry(curve, 20, radius, 6, false), m);
    cat.add(o);
    return o;
  };
  for (const side of [-1, 1]) {
    stroke(
      [
        [0, 1.38, 1.94],
        [side * 0.025, 1.326, 1.936],
        [side * 0.07, 1.342, 1.928],
      ],
      0.009,
      ink,
    );
    for (let i = 0; i < 2; i++)
      stroke(
        [
          [side * 0.22, 1.37 - i * 0.065, 1.87],
          [side * 0.38, 1.39 - i * 0.08, 1.87],
          [side * 0.56, 1.42 - i * 0.1, 1.84],
        ],
        0.0075,
        ink,
      );
  }
  const tail = stroke(
    [
      [0.18, 0.43, 0.19],
      [0.66, 0.31, 0.16],
      [0.97, 0.24, 0.55],
      [1.0, 0.235, 1.02],
      [0.86, 0.24, 1.34],
      [0.69, 0.26, 1.43],
    ],
    0.12,
    fur,
  );
  tail.name = "cat-curled-tail";
  // 管环向中心逐渐收缩，形成柔和尖端。
  const pos = tail.geometry.attributes.position,
    curve = (tail.geometry as T.TubeGeometry).parameters.path;
  for (let i = 0; i <= 20; i++) {
    const centre = curve.getPointAt(i / 20),
      scale = 1 - 0.65 * Math.pow(i / 20, 2);
    for (let j = 0; j <= 6; j++) {
      const k = i * 7 + j;
      pos.setXYZ(
        k,
        centre.x + (pos.getX(k) - centre.x) * scale,
        centre.y + (pos.getY(k) - centre.y) * scale,
        centre.z + (pos.getZ(k) - centre.z) * scale,
      );
    }
  }
  tail.geometry.computeVertexNormals();
  tail.castShadow = true;
  ball("cat-tail-tip", fur, 0.69, 0.26, 1.43, 0.043, 0.043, 0.043);
  const face = new T.Group();
  face.name = "cat-face";
  for (const part of [...cat.children])
    if (
      !["cat-body", "cat-paw-left", "cat-paw-right", "cat-curled-tail", "cat-tail-tip"].includes(
        part.name,
      )
    )
      face.add(part);
  face.position.y = -0.2;
  cat.add(face);
  return cat;
}
