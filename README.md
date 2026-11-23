# XiangMeta Web

[中文](#中文) · [English](#english) · [在线体验](https://sherlock-lxl.github.io/)

## 中文

李湘伦（Sherlock-LXL）的个人作品网站，将 AI、工程、科研、摄影与原创音乐放入可探索的 Three.js 3D 世界。

### 主要功能

- 首页进入 3D 世界，项目页提供按分类浏览的轻量作品档案。
- 保留四岛地形、建筑、第一人称行走、碰撞、跳跃、传送、四季、拍照与探索。
- 科研气泡模拟在浏览器 Worker 运行；音乐保留七首 BGM 与四段季节提示，点击 ♪ 后加载、交叉淡化并支持暂停继续。

AI Lab 将送礼选择器、表情识别 CNN 与双盲诗的原模型放在同一静态应用中，独立页面与世界站点共用。触屏支持摇杆、拖动视角、跳跃与上下文按钮；四岛包含 16 件可移动物品和十只动物，支持抚摸与骑乘。

[Teaching Studio](https://sherlock-lxl.github.io/teaching-studio/) 入口跳转至独立教学应用。

### 运行

开发需要 Node.js 22.14+：

```bash
npm ci --ignore-scripts
npm run dev
npm run build
npm test
npm run preview
```

开发/预览地址为 `http://127.0.0.1:5173` / `http://127.0.0.1:4173`。浏览器测试使用 `npx playwright install chromium` 与 `npm run test:ui`；可安装 WebKit 并设置 `TEST_WEBKIT=1`。

页面需要 HTTP(S)，本地也应使用预览服务。Home/Projects 不下载 Three.js；世界按阶段显示加载进度，WebGL 不可用时提供项目页入口。

### 控制与架构

WASD/方向键行走，Shift 跑，Space 跳；点击或拖动转视角，F 执行附近主要动作，E 查看项目详情，R 打开可用演示/音乐，G 查看发现，P 拍照，Esc 关闭面板。侧栏传送，世界概览打开轨道地图。

`modules/<id>/manifest.json` 是项目与世界信息的共同来源；`src/world/` 实现世界，`shared/` 保存物理与导航规则，`data/` 保存个人资料、布局与媒体映射。构建生成 `content/projects.json` / `content/world.json`，新增有效 manifest 自动进入两种体验。

[完整控制、扩展与性能](docs/web-guide.md) · [Web 迁移记录](docs/web-migration.md) · [AI Lab 交付与验证](docs/ai-lab-delivery.md) · [历史版本](docs/releases/README.md)

### 发布与致谢

个人站点为 `https://sherlock-lxl.github.io/`；推送站点仓库 `main` 后由 GitHub Actions 构建、测试并部署。`BASE_PATH` 支持嵌套路径，本地可设置后构建与浏览器验收。`npm run export:pages` 仅生成站点源码，不自动提交或发布。

桌面历史保存在 `backend/`、`desktop/` 与 `docs/releases/`；`test:legacy` 需要相应 Python、模型与媒体环境。

世界与个人作品由李湘伦创作，《燕来有声》保留未名拾音团队署名。代码采用 [MIT](LICENSE)，不重新许可摄影、封面、音乐、歌词、影片或品牌素材；详见 [CREDITS.md](CREDITS.md)。Three.js 通知随构建提供。

## English

Sherlock-LXL's personal portfolio brings AI, engineering, research, photography and original music into an explorable Three.js world.

### Features

- Enter the 3D world from Home or browse a lightweight, filterable project archive.
- Four islands retain terrain, architecture, first-person movement, collisions, jumping, teleportation, seasons, photography and exploration.
- Bubble research simulations run in a browser Worker. Seven BGM tracks and four seasonal cues load after clicking ♪, with crossfades and pause/resume.

AI Lab brings the original Gift Chooser, Expression CNN and Blind Verse models into one static application shared by standalone and world stations. Touch supports a joystick, drag-to-look, jumping and contextual buttons. Four islands contain 16 portable objects and ten animals with petting and mounts.

The [Teaching Studio](https://sherlock-lxl.github.io/teaching-studio/) entry redirects to the separate teaching application.

### Run

Development requires Node.js 22.14+:

```bash
npm ci --ignore-scripts
npm run dev
npm run build
npm test
npm run preview
```

Development/preview use `http://127.0.0.1:5173` / `http://127.0.0.1:4173`. Browser checks use `npx playwright install chromium` and `npm run test:ui`; install WebKit and set `TEST_WEBKIT=1` for additional coverage.

Use HTTP(S), including local preview. Home/Projects do not download Three.js; world construction shows staged progress and WebGL failure offers a Portfolio link.

### Controls and architecture

WASD/arrows walk, Shift runs and Space jumps. Click/drag to look; F performs the nearby primary action, E opens details, R opens available demo/music, G opens discoveries, P enters photo mode and Esc closes panels. Sidebar regions teleport; World Overview opens an orbit map.

`modules/<id>/manifest.json` is the shared project/world content source. `src/world/` implements the world, `shared/` contains physics/navigation and `data/` stores profile, layout and media mappings. Builds generate `content/projects.json` / `content/world.json`; valid new manifests appear in both experiences automatically.

[Controls, extension and performance](docs/web-guide.md) · [Web migration](docs/web-migration.md) · [AI Lab delivery and validation](docs/ai-lab-delivery.md) · [Version history](docs/releases/README.md)

### Publishing and credits

The user site is `https://sherlock-lxl.github.io/`. Pushing the site repository's `main` branch runs GitHub Actions build, tests and deployment. `BASE_PATH` supports nested paths for local build/browser checks. `npm run export:pages` generates site source without committing or publishing it.

Desktop history remains in `backend/`, `desktop/` and `docs/releases/`; `test:legacy` needs the corresponding Python, model and media environment.

World and personal works are by 李湘伦; 《燕来有声》 retains 未名拾音 team attribution. The [MIT](LICENSE) code license does not relicense photography, covers, music, lyrics, films or branding. See [CREDITS.md](CREDITS.md); Three.js notices accompany the build.
