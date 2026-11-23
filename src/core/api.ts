import type { Catalog, ModelResult } from "./types";
import { readContent } from "./portfolio";
export async function catalog(): Promise<Catalog> {
  return readContent<Catalog>("world");
}
/** 保留旧扩展签名；静态 Pages 不发送模型输入。 */
export async function invoke(
  _id: string,
  _input: Record<string, unknown>,
  _signal: AbortSignal,
  _onToken?: (text: string) => void,
): Promise<ModelResult> {
  throw new Error("请在项目 GitHub 仓库查看模型运行说明。");
}
