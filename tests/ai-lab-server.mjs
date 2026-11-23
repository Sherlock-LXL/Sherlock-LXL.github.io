import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
export async function staticServer(root = "dist", base = "/") {
  root = path.resolve(root);
  const mime = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".wasm": "application/wasm",
    ".json": "application/json",
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".webp": "image/webp",
    ".mp3": "audio/mpeg",
  };
  const server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://local").pathname);
      if (!pathname.startsWith(base)) throw new Error("outside base");
      let file = path.resolve(root, pathname.slice(base.length) || "index.html");
      if (!file.startsWith(root + path.sep) && file !== root) throw new Error("outside root");
      if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
      res.setHeader("Content-Type", mime[path.extname(file)] ?? "application/octet-stream");
      res.end(await readFile(file));
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    origin: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
