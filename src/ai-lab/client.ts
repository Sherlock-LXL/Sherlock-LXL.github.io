type Update = { type: string; [key: string]: unknown };
export class ModelClient {
  private worker: Worker | undefined;
  private ready = false;
  private pending: { resolve: (data: Update) => void; reject: (reason: Error) => void } | undefined;
  private idle: ReturnType<typeof setTimeout> | undefined;
  constructor(private update: (message: Update) => void) {}
  initialize(id: string) {
    clearTimeout(this.idle);
    if (this.ready) return;
    if (this.worker) return;
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = ({ data }: MessageEvent<Update>) => {
      if (data.type === "ready") this.ready = true;
      if (data.type === "error") {
        if (this.pending) {
          this.pending.reject(new Error(String(data.message)));
          this.pending = undefined;
          return;
        }
        this.update(data);
        this.dispose();
        return;
      }
      if (data.type === "result") {
        this.pending?.resolve(data);
        this.pending = undefined;
      }
      this.update(data);
    };
    this.worker.onerror = () => {
      this.update({ type: "error", message: "本地推理进程未能运行，请重试或使用更新的浏览器。" });
      this.dispose();
    };
    this.worker.postMessage({ type: "init", id, base: import.meta.env.BASE_URL });
  }
  run(data: object): Promise<Update> {
    if (!this.ready || !this.worker) return Promise.reject(new Error("模型尚未准备好。"));
    if (this.pending) return Promise.reject(new Error("请等待本次推理完成。"));
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      this.worker!.postMessage(data);
    });
  }
  suspend() {
    if (this.pending || !this.ready) this.dispose();
    else this.idle = setTimeout(() => this.dispose(), 60_000);
  }
  dispose() {
    clearTimeout(this.idle);
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = false;
    this.pending?.reject(new Error("推理已取消。"));
    this.pending = undefined;
  }
  get isReady() {
    return this.ready;
  }
}
