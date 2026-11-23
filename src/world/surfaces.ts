import * as T from "three";
export type Finish =
  | "plaster"
  | "stone"
  | "wood"
  | "metal"
  | "grass"
  | "paving"
  | "foliage"
  | "cliff"
  | "sand"
  | "snow";
const maps = new Map<Finish, T.CanvasTexture>();
/** 确定性小材质纹理共用贴图，保留静态合并与 mip 过滤。 */
export function surfaceMap(kind: Finish) {
  const existing = maps.get(kind);
  if (existing) return existing;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const c = canvas.getContext("2d")!;
  let seed = 71423;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  c.fillStyle = {
    plaster: "#faf9f2",
    stone: "#f1f3eb",
    wood: "#f6eedf",
    metal: "#f3f6f2",
    grass: "#e9efdb",
    paving: "#f3f0e5",
    foliage: "#f1f6e9",
    cliff: "#f2eedf",
    sand: "#fbf2dd",
    snow: "#fafcff",
  }[kind];
  c.fillRect(0, 0, 512, 512);
  // 皴笔使用短干刷线表现岩石纹理。
  if (kind === "cliff" || kind === "stone")
    for (let i = 0; i < (kind === "cliff" ? 260 : 120); i++) {
      const x = random() * 512,
        y = random() * 512,
        len = 10 + random() * (kind === "cliff" ? 34 : 18),
        angle = (kind === "cliff" ? -0.25 : 0.1) + (random() - 0.5) * 0.5;
      c.strokeStyle = `rgba(${kind === "cliff" ? "96,82,62" : "110,102,88"},${0.05 + random() * 0.08})`;
      c.lineWidth = 0.8 + random() * 1.8;
      c.lineCap = "round";
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(
        x + Math.cos(angle) * len * 0.5 + random() * 3,
        y + Math.sin(angle) * len * 0.5 + random() * 3,
        x + Math.cos(angle) * len,
        y + Math.sin(angle) * len,
      );
      c.stroke();
    }
  if (kind === "cliff")
    for (let i = 0; i < 32; i++) {
      const y = i * 16;
      c.strokeStyle = "rgba(170,158,137,.035)";
      c.lineWidth = 3;
      c.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const v = y + Math.sin((x * Math.PI) / 256 + i * 0.7) * 3;
        if (x) c.lineTo(x, v);
        else c.moveTo(x, v);
      }
      c.stroke();
    }
  if (kind === "paving") {
    for (let row = 0; row < 8; row++)
      for (let col = -1; col < 5; col++) {
        const x = col * 128 + (row % 2) * 64,
          y = row * 64;
        c.fillStyle = `rgba(175,153,121,${0.03 + random() * 0.075})`;
        c.fillRect(x + 2, y + 2, 124, 60);
        c.strokeStyle = "rgba(135,121,103,.26)";
        c.lineWidth = 2;
        c.strokeRect(x + 1, y + 1, 126, 62);
        c.strokeStyle = "rgba(255,255,246,.7)";
        c.beginPath();
        c.moveTo(x + 3, y + 60);
        c.lineTo(x + 3, y + 3);
        c.lineTo(x + 124, y + 3);
        c.stroke();
      }
  }
  if (kind === "wood" || kind === "metal")
    for (let i = 0; i < 190; i++) {
      const y = random() * 512;
      c.strokeStyle = `rgba(100,85,61,${kind === "metal" ? 0.025 : 0.035 + random() * 0.05})`;
      c.lineWidth = 0.4 + random();
      c.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const v =
          y +
          (kind === "wood"
            ? Math.sin((x * Math.PI) / 256 + i) * 2 + Math.sin((x * Math.PI) / 128) * 0.6
            : 0);
        if (x === 0) c.moveTo(x, v);
        else c.lineTo(x, v);
      }
      c.stroke();
    }
  if (kind === "stone")
    for (let i = 0; i < 16; i++) {
      const y = i * 32;
      c.strokeStyle = "rgba(127,119,101,.08)";
      c.lineWidth = 2 + random() * 2;
      c.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const v = y + Math.sin((x * Math.PI) / 256 + i) * 5;
        if (!x) c.moveTo(x, v);
        else c.lineTo(x, v);
      }
      c.stroke();
    }
  for (let i = 0; i < 11000; i++) {
    const x = random() * 512,
      y = random() * 512;
    c.fillStyle = i % 3 === 0 ? "rgba(105,117,91,.07)" : "rgba(255,255,248,.17)";
    if (kind === "grass") {
      c.strokeStyle = i % 3 ? "rgba(102,134,84,.2)" : "rgba(255,252,202,.24)";
      c.lineWidth = 0.7;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + random() * 3 - 1.5, y - 2 - random() * 4);
      c.stroke();
    } else c.fillRect(x, y, 0.5 + random() * 1.5, 0.5 + random() * 1.5);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.anisotropy = 4;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.name = `surface-${kind}`;
  maps.set(kind, texture);
  return texture;
}
export function surfaceMaterial(
  color: T.ColorRepresentation,
  roughness = 0.7,
  metalness = 0.05,
  finish: Finish = metalness > 0.2 ? "metal" : "plaster",
) {
  const texture = surfaceMap(finish),
    detail = surfaceDetail(finish),
    relief = finish !== "foliage" && finish !== "grass";
  const m = new T.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    map: texture,
    roughnessMap: detail.roughness,
    normalMap: relief ? detail.normal : null,
  });
  m.normalScale.setScalar(
    finish === "plaster" ? 0.2 : finish === "metal" ? 0.15 : finish === "paving" ? 0.6 : 0.4,
  );
  m.userData.finish = finish;
  // 米级纹理颗粒保持批处理兼容，避免大墙面拉伸小纹理。
  const reflections = metalness > 0.18 || roughness < 0.4;
  m.onBeforeCompile = (shader) => {
    if (!reflections) shader.fragmentShader = "#undef USE_ENVMAP\n" + shader.fragmentShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
    vec3 grainAxis=abs(normal);vec2 grainUv=grainAxis.y>max(grainAxis.x,grainAxis.z)?position.xz:grainAxis.x>grainAxis.z?position.zy:position.xy;
    grainUv/=2.0;
    #ifdef USE_MAP
      vMapUv=grainUv;
    #endif
    #ifdef USE_NORMALMAP
      vNormalMapUv=grainUv;
    #endif
    #ifdef USE_ROUGHNESSMAP
      vRoughnessMapUv=grainUv;
    #endif
  `,
    );
  };
  m.customProgramCacheKey = () => `surface-metric-v2-${finish}-${reflections}`;
  return m;
}

const details = new Map<Finish, { normal: T.DataTexture; roughness: T.DataTexture }>();
/** 共享可平铺微起伏与粗糙度纹理，保持几何数量与逐帧开销。 */
export function surfaceDetail(kind: Finish) {
  const known = details.get(kind);
  if (known) return known;
  const size = 256,
    height = new Float32Array(size * size),
    rough = new Uint8Array(size * size * 4),
    norm = new Uint8Array(size * size * 4);
  let seed = 61927;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size,
        noise = random() - 0.5;
      let h = noise * 0.12;
      if (kind === "wood")
        h =
          Math.sin(v * Math.PI * 80 + Math.sin(u * Math.PI * 2) * 1.7) * 0.16 +
          Math.sin(v * Math.PI * 196) * 0.025 +
          noise * 0.08;
      if (kind === "stone" || kind === "cliff")
        h =
          Math.sin(u * Math.PI * 8) * Math.cos(v * Math.PI * 6) * 0.14 +
          Math.sin((u + v) * Math.PI * 24) * 0.035 +
          noise * 0.13;
      if (kind === "metal") h = Math.sin(v * Math.PI * 240) * 0.06 + noise * 0.015;
      if (kind === "paving") {
        const row = Math.floor(y / 32),
          xx = (x + (row % 2) * 32) % 64;
        h = (xx < 1.5 || y % 32 < 1.5 ? -0.45 : 0.08) + noise * 0.05;
      }
      if (kind === "sand")
        h = Math.sin(v * Math.PI * 10 + Math.sin(u * Math.PI * 4) * 0.7) * 0.11 + noise * 0.1;
      if (kind === "snow")
        h = Math.sin(u * Math.PI * 4) * Math.cos(v * Math.PI * 6) * 0.05 + noise * 0.025;
      height[y * size + x] = h;
      const k = (y * size + x) * 4,
        r = Math.round(T.MathUtils.clamp(0.88 - h * 0.24 + noise * 0.05, 0.55, 1) * 255);
      rough.set([r, r, r, 255], k);
    }
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const at = (a: number, b: number) => height[((b + size) % size) * size + ((a + size) % size)];
      const n = new T.Vector3(
        (at(x - 1, y) - at(x + 1, y)) * 1.2,
        (at(x, y - 1) - at(x, y + 1)) * 1.2,
        1,
      ).normalize();
      norm.set(
        [
          Math.round((n.x * 0.5 + 0.5) * 255),
          Math.round((n.y * 0.5 + 0.5) * 255),
          Math.round((n.z * 0.5 + 0.5) * 255),
          255,
        ],
        (y * size + x) * 4,
      );
    }
  const make = (data: Uint8Array) => {
    const t = new T.DataTexture(data, size, size, T.RGBAFormat);
    t.wrapS = t.wrapT = T.RepeatWrapping;
    t.generateMipmaps = true;
    t.minFilter = T.LinearMipmapLinearFilter;
    t.magFilter = T.LinearFilter;
    t.anisotropy = 4;
    t.needsUpdate = true;
    return t;
  };
  const value = { normal: make(norm), roughness: make(rough) };
  details.set(kind, value);
  return value;
}
