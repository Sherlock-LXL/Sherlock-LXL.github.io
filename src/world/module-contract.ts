import type * as T from "three";
import type { Exhibit, Region, ArtworkAction } from "../core/types";
import type { Obstacle } from "./scenery";
import { invoke } from "../core/api";

/** 扩展在可信构建期加载，不执行下载清单中的 TypeScript 源码。 */
export interface WorldModuleContext {
  module: Exhibit;
  region: Region;
  invoke(input: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>;
}
export interface WorldModuleScene {
  root: T.Group;
  /** 局部 x/z 坐标；省略时沿用预设的碰撞布局。 */
  colliders?: Obstacle[];
  /** 墙面与观察使用局部坐标，核心负责区域位置与旋转。 */
  artworks?: {
    id: string;
    label: string;
    position: [number, number];
    approach: [number, number];
    action: ArtworkAction;
  }[];
  update?(delta: number, hour: number): void;
  dispose?(): void;
}
export interface SceneFactory {
  version: 1;
  create(context: WorldModuleContext): WorldModuleScene;
}
export interface InteractionFactory {
  version: 1;
  create(context: WorldModuleContext): { onVisit?(): void; onInteract?(): void; dispose?(): void };
}
// Vite 自动发现后续源码模块。
const scenes = import.meta.glob<{ default: SceneFactory }>("../../modules/*/scene.ts", {
  eager: true,
});
const interactions = import.meta.glob<{ default: InteractionFactory }>(
  "../../modules/*/interactions.ts",
  { eager: true },
);
export function moduleExtensions(module: Exhibit, region: Region) {
  const context: WorldModuleContext = {
    module,
    region,
    invoke: (input, signal) => invoke(module.id, input, signal ?? new AbortController().signal),
  };
  const scene = scenes[`../../modules/${module.id}/scene.ts`]?.default,
    hooks = interactions[`../../modules/${module.id}/interactions.ts`]?.default;
  if ((scene && scene.version !== 1) || (hooks && hooks.version !== 1))
    throw new Error(`Unsupported scene contract: ${module.id}`);
  return { scene: scene?.create(context), hooks: hooks?.create(context) };
}
