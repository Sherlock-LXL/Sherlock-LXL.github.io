import {
  expressionTensor,
  giftPredict,
  generationModes,
  sampleToken,
  seededRandom,
} from "../../shared/ai-lab.mjs";
import type * as ORT from "onnxruntime-web";

type Resource = { path: string; bytes: number; sha256: string };
type Model = { id: string; version: string; resources: Resource[] };
type State = { hidden: ORT.Tensor; cell: ORT.Tensor; logits: Float32Array };
let model: Model, base: string, ort: typeof ORT, session: ORT.InferenceSession;
let gift: Parameters<typeof giftPredict>[0], vocab: Record<string, number>, characters: string[];
let loaded = 0,
  total = 0,
  busy = false;
const send = (type: string, data: object = {}) => postMessage({ type, ...data });
const url = (path: string) => new URL(base + path.replace(/^\//, ""), self.location.origin).href;
const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function resource(file: Resource) {
  const request = new Request(url(file.path) + `?v=${file.sha256}`);
  let cache: Cache | undefined;
  try {
    cache = await caches.open("xiangmeta-ai-models-v1");
  } catch {
    /** 缓存不可用时继续使用网络。 */
  }
  const cached = await cache?.match(request);
  let bytes: Uint8Array;
  if (cached) bytes = new Uint8Array(await cached.arrayBuffer());
  else {
    const response = await fetch(request);
    if (!response.ok) throw new Error(`模型文件读取失败（${response.status}），请检查网络后重试。`);
    const reader = response.body?.getReader();
    if (reader) {
      bytes = new Uint8Array(file.bytes);
      let offset = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (offset + value.length > bytes.length) throw new Error("模型文件大小异常，请重新加载。");
        bytes.set(value, offset);
        offset += value.length;
        send("progress", { loaded: loaded + offset, total, text: "正在下载原始模型" });
      }
      if (offset !== file.bytes) throw new Error("模型下载不完整，请重试。");
    } else bytes = new Uint8Array(await response.arrayBuffer());
  }
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  if (bytes.length !== file.bytes || digest !== file.sha256) {
    await cache?.delete(request);
    throw new Error("模型校验失败，请重试；未执行推理。");
  }
  if (!cached)
    try {
      await cache?.put(request, new Response(bytes as Uint8Array<ArrayBuffer>));
    } catch {
      /** 存储配额可选。 */
    }
  loaded += bytes.length;
  send("progress", { loaded, total, text: cached ? "已读取校验过的本地缓存" : "已下载并校验模型" });
  return bytes;
}

async function initialize(id: string, siteBase: string) {
  base = siteBase;
  const response = await fetch(url("content/ai-lab.json"));
  if (!response.ok) throw new Error("模型清单无法加载，请刷新后重试。");
  const metadata = await response.json();
  model = metadata.projects.find((p: Model) => p.id === id);
  if (!model) throw new Error("没有找到这个项目。");
  total = model.resources.reduce((sum, file) => sum + file.bytes, 0);
  send("progress", { loaded, total, text: "准备加载原始模型" });
  if (id === "gift-chooser") {
    gift = JSON.parse(new TextDecoder().decode(await resource(model.resources[0])));
  } else {
    ort = await import("onnxruntime-web/wasm");
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = {
      mjs: url("assets/ai-runtime/ort-wasm-simd-threaded.mjs"),
      wasm: url("assets/ai-runtime/ort-wasm-simd-threaded.wasm"),
    };
    const externalData: { path: string; data: Uint8Array }[] = [];
    let graph: Uint8Array | undefined;
    for (const file of model.resources) {
      const bytes = await resource(file);
      if (file.path.endsWith(".onnx")) graph = bytes;
      else if (file.path.endsWith(".bin"))
        externalData.push({ path: file.path.split("/").at(-1)!, data: bytes });
      else if (file.path.endsWith("vocab.json")) {
        vocab = JSON.parse(new TextDecoder().decode(bytes));
        characters = [];
        for (const [char, index] of Object.entries(vocab)) characters[index] = char;
      }
    }
    if (!graph) throw new Error("模型图文件缺失。");
    send("progress", { loaded, total, text: "文件已校验，正在准备 WASM 推理" });
    session = await ort.InferenceSession.create(graph, {
      executionProviders: ["wasm"],
      externalData,
    });
  }
  send("ready", { version: model.version, total });
}

async function step(token: number, hidden: ORT.Tensor, cell: ORT.Tensor) {
  const output = await session.run({
    token: new ort.Tensor("int64", BigInt64Array.of(BigInt(token)), [1, 1]),
    hidden,
    cell,
  });
  return {
    logits: output.logits.data as Float32Array,
    hidden: output.next_hidden,
    cell: output.next_cell,
  };
}
async function generate(request: { mode: number; prefix: string; seed: number }) {
  const settings = generationModes[request.mode];
  if (!settings) throw new Error("请选择生成风格。");
  const prefix = request.prefix.trim(),
    prefixChars = Array.from(prefix);
  if (prefixChars.length > 3 || prefixChars.some((char) => vocab[char] === undefined))
    throw new Error("前缀需为词表内的 1–3 个字，请换一个常用汉字。");
  const random = seededRandom(request.seed),
    lines: string[] = [],
    tokenIds: number[][] = [];
  for (let line = 0; line < (prefix ? 1 : 2); line++) {
    let state: State = {
      hidden: new ort.Tensor("float32", new Float32Array(1536), [1, 1, 1536]),
      cell: new ort.Tensor("float32", new Float32Array(1536), [1, 1, 1536]),
      logits: new Float32Array(0),
    };
    for (const id of [vocab["<BOS>"], ...prefixChars.map((char) => vocab[char])])
      state = await step(id, state.hidden, state.cell);
    let text = prefix;
    const tokens: number[] = [];
    for (let i = 0; i < (prefix ? 20 : 30); i++) {
      const token = sampleToken(state.logits, vocab, settings.temperature, settings.topK, random);
      tokens.push(token);
      if (token === vocab["<EOS>"]) break;
      text += characters[token];
      send("partial", { line, text });
      state = await step(token, state.hidden, state.cell);
    }
    lines.push(text);
    tokenIds.push(tokens);
  }
  return { lines, tokenIds, seed: request.seed };
}

self.onmessage = async ({ data }) => {
  if (busy) return;
  busy = true;
  try {
    if (data.type === "init") {
      await initialize(data.id, data.base);
      return;
    }
    const start = performance.now();
    let result: object;
    if (data.type === "gift") result = giftPredict(gift, data.scores, data.category);
    else if (data.type === "expression") {
      const tensor = expressionTensor(new Uint8ClampedArray(data.rgba), data.width, data.height);
      const output = await session.run({
        image: new ort.Tensor("float32", tensor, [1, 1, 48, 48]),
      });
      result = {
        probabilities: Array.from(output.probabilities.data as Float32Array),
        input: Array.from(tensor),
      };
    } else if (data.type === "verse") result = await generate(data);
    else if (data.type === "steps") {
      // 数值回归使用原模型与输出。
      let state: State = {
        hidden: new ort.Tensor("float32", new Float32Array(1536), [1, 1, 1536]),
        cell: new ort.Tensor("float32", new Float32Array(1536), [1, 1, 1536]),
        logits: new Float32Array(0),
      };
      const states = [];
      for (const token of data.tokens) {
        state = await step(token, state.hidden, state.cell);
        states.push({
          logits: Array.from(state.logits),
          hidden: Array.from(state.hidden.data as Float32Array),
          cell: Array.from(state.cell.data as Float32Array),
        });
      }
      result = { states };
    } else throw new Error("不支持的推理请求。");
    send("result", { result, milliseconds: performance.now() - start });
  } catch (error) {
    send("error", { message: errorText(error) });
  } finally {
    busy = false;
  }
};
