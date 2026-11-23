import { mkdir, cp, writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { webContent } from "./web-content.mjs";

const root = process.cwd(),
  destination = path.join(root, ".runtime/pages-source");
// 保留现有发布检出目录与用户修改。
try {
  await stat(destination);
  throw new Error(`${destination} already exists. Move it aside before exporting again.`);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const { catalog, assets } = await webContent(root);
await mkdir(destination, { recursive: true });
const copy = async (relative) => {
  await mkdir(path.dirname(path.join(destination, relative)), { recursive: true });
  await cp(path.join(root, relative), path.join(destination, relative), {
    recursive: true,
    filter: (file) => file !== path.join(root, "src/audio/media-mixer.ts"),
  });
};
for (const file of [
  "src",
  "shared",
  "index.html",
  "projects",
  "world",
  "teaching-studio",
  "ai-lab",
  "vite.config.ts",
  "tsconfig.json",
  "README.md",
  "LICENSE",
  "CREDITS.md",
  ".gitignore",
  ".github/workflows/e2e.yml",
  "data/profile.json",
  "data/world.json",
  "data/audio.json",
  "data/image-previews.json",
  "data/media-sizes.json",
  "data/ai-lab-models.json",
  "backend/catalog.mjs",
  "scripts/web-content.mjs",
  "scripts/export-pages.mjs",
  "scripts/sync-pages.mjs",
  "scripts/pages-workflow.yml",
  "scripts/build-ai-lab.mjs",
  "scripts/ai-lab-originals",
  "scripts/export-ai-lab.py",
  "scripts/export-gift-ui.py",
  "scripts/verify-ai-lab-originals.py",
  "docs/web-migration.md",
  "docs/web-portfolio-audit.md",
  "docs/ai-lab-delivery.md",
  "docs/ai-lab-investigation.md",
  "docs/ai-lab-images",
  "docs/images",
])
  await copy(file);
await cp(
  path.join(root, "scripts/pages-workflow.yml"),
  path.join(destination, ".github/workflows/pages.yml"),
);
const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
const tests = pkg.scripts.test.match(/tests\/[\w.-]+\.mjs/g);
for (const file of [
  ...tests,
  "tests/web-smoke.mjs",
  "tests/web-browser.mjs",
  "tests/ai-lab-browser.mjs",
  "tests/ai-lab-server.mjs",
  "tests/ai-lab-webkit.mjs",
  "tests/fixtures/ai-lab",
  "tests/fixtures/model-inputs",
])
  await copy(file);
for (const module of catalog.modules) {
  const { status, ...manifest } = module;
  const dir = path.join(destination, "modules", module.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  for (const file of ["scene.ts", "interactions.ts", "region.json"]) {
    try {
      await copy(`modules/${module.id}/${file}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}
for (const { file } of assets.values())
  if (!file.includes(`${path.sep}node_modules${path.sep}`)) await copy(path.relative(root, file));
const scripts = {
  dev: "vite",
  typecheck: pkg.scripts.typecheck,
  build: pkg.scripts.build,
  "build:ai-lab": pkg.scripts["build:ai-lab"],
  preview: pkg.scripts.preview,
  test: pkg.scripts.test,
  "test:ai-lab": pkg.scripts["test:ai-lab"],
  "test:smoke": pkg.scripts["test:smoke"],
  "test:ui": pkg.scripts["test:ui"],
  "export:pages": "node scripts/export-pages.mjs",
};
const { electron, "electron-builder": builder, ...devDependencies } = pkg.devDependencies;
const webPackage = {
  name: "xiangmeta-portfolio",
  version: pkg.version,
  private: true,
  type: "module",
  description: pkg.description,
  author: "李湘伦 / Sherlock-LXL",
  license: "MIT",
  engines: { node: ">=22.14.0" },
  scripts,
  dependencies: pkg.dependencies,
  devDependencies,
};
await writeFile(path.join(destination, "package.json"), JSON.stringify(webPackage, null, 2) + "\n");
// 使用固定版本初始化，再移除历史桌面专用依赖。
const lock = JSON.parse(await readFile(path.join(root, "package-lock.json"), "utf8"));
lock.name = webPackage.name;
lock.packages[""] = {
  name: webPackage.name,
  version: webPackage.version,
  dependencies: webPackage.dependencies,
  devDependencies,
};
await writeFile(path.join(destination, "package-lock.json"), JSON.stringify(lock, null, 2) + "\n");
execFileSync(
  process.execPath,
  [
    process.env.npm_execpath,
    "install",
    "--package-lock-only",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
  ],
  { cwd: destination, stdio: "inherit" },
);
console.log(`Ready to review and publish: ${destination}`);
