import * as T from "three";
import { material, mesh } from "./architecture";
import { paintedTree } from "./vernacular";
/** 四季配色：石绿春景、明亮夏景、朱砂藤黄秋景、铅白冬景。 */
export const seasonalColors = {
  spring: { ground: "#98bc89", trees: ["#f1bdcc", "#ecccdc", "#f7dfce"], label: "春 · 桃花山径" },
  summer: { ground: "#b9cd99", trees: ["#74a888", "#95c197", "#69a994"], label: "夏 · 海风绿洲" },
  autumn: { ground: "#cfb57f", trees: ["#dc9170", "#e9bf6b", "#c87a66"], label: "秋 · 金色回忆" },
  winter: { ground: "#e3e9ec", trees: ["#dfe9e8", "#d3e3e8", "#edf0eb"], label: "冬 · 初雪实验室" },
};
/** 夏岸使用临水垂柳。 */
export function palm(g: T.Object3D, x: number, z: number, scale = 1) {
  paintedTree(g, x, z, scale * 0.95, "willow");
}
export { material, mesh };
