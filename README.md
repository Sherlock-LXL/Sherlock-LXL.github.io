# XiangMeta · Sherlock-LXL

[中文](#中文) · [English](#english) · [主站](https://sherlock-lxl.github.io/) · [进入世界](https://sherlock-lxl.github.io/world/) · [AI Lab](https://sherlock-lxl.github.io/ai-lab/)

## 中文

李湘伦（Sherlock-LXL）的个人作品网站。从语言模型、气泡研究到摄影与原创音乐，每一次探索都有自己的坐标。

你可以在二维页面中浏览作品与子站，也可以走进 XiangMeta 的山海世界，沿着山径、庭院和展廊找到它们。部分作品可以直接在浏览器中体验，三个 AI 项目还可以在世界内打开小窗使用。

### 从哪里开始

| 入口                                                               | 内容                                                                                          |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| [主站](https://sherlock-lxl.github.io/)                            | 个人介绍、子站推荐、精选作品与世界入口                                                        |
| [项目档案](https://sherlock-lxl.github.io/projects/)               | 十个项目与创作档案，支持分类、搜索、详情与源码链接                                            |
| [XiangMeta 世界](https://sherlock-lxl.github.io/world/)            | 第一人称探索、展项交互、科学模拟、音乐、摄影与四季游乐                                        |
| [AI Lab](https://sherlock-lxl.github.io/ai-lab/)                   | 送礼选择、表情识别和双盲诗，使用原始模型在浏览器中推理                                        |
| [Teaching Studio](https://sherlock-lxl.github.io/teaching-studio/) | 教师备课工作台；跳转至 [独立教学应用](https://teaching-studio.de5.net/)，账号权限由该应用管理 |
| [Gift Lab](https://sherlock-lxl.github.io/gift-lab/)               | 用幸福感雷达、礼物评分与两两选择探索个人偏好                                                  |
| [Sketch2Link](https://sherlock-lxl.github.io/sketch2link/)         | 从手绘闭合轨迹出发，探索四杆与五杆机构的运动                                                  |

本仓库维护主站、项目档案、3D 世界、AI Lab，以及 Teaching Studio 的跳转页。Gift Lab、Sketch2Link 和独立教学应用分别维护与发布，主站提供它们的入口。

### 作品所在的世界

世界以中央枢纽和四个核心岛屿展开，保留十个展项。视觉沿用青绿山水、矿物色、绢纸与墨线，界面采用清爽的蓝绿色调。

| 核心岛屿   | 季节 | 作品                                                |
| ---------- | ---- | --------------------------------------------------- |
| AI 山脉    | 春   | XiangLM、校园猫咪识别、送礼选择器、表情识别、双盲诗 |
| 科学山谷   | 冬   | 单气泡声致发光、壁面附着气泡生长                    |
| 个人博物馆 | 秋   | 原创音乐档案、摄影长廊                              |
| 未名拾音   | 夏   | 《燕来有声》与团队创作档案                          |

- **探索与交互**：行走、奔跑、跳跃、地图与传送。靠近主体并看向它的范围时，才出现小型半透明操作提示；小物件无需精确命中模型。世界向导可从侧栏打开。
- **模型与科学**：三处 AI 展台打开当前页面内的体验窗口；两种气泡模拟在浏览器 Worker 中计算，使用演示参数呈现方程行为。
- **音乐与摄影**：主动开启七首 BGM 与四段季节音乐；展廊提供专辑与摄影详情，支持摄影模式、照片与明信片导出。完整专辑和 MV 使用原有外部播放链接。
- **四季生活与游乐**：十只动物可观察、抚摸，梅花鹿和北极熊可骑乘；十六件季节小物可拿起、搬运与摆放。四季摊位提供摩托环游、快艇航行、空中巡游和六款街机小游戏。
- **旅行记录**：收藏、记忆星图、发现印记与游戏成绩在本机保存；物品摆放保持在当前访问中。手机支持摇杆、拖动环顾、跳跃及多点触控。

### AI Lab

独立页面与世界内嵌窗口共用同一套应用。世界中的「礼物驿站」「镜子房间」「双盲诗花园」分别打开对应项目，关闭后回到原来的位置与视角。

| 项目                                                                                                    | 体验                                       | 原始模型与浏览器实现                                                           |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| [Gift Chooser](https://sherlock-lxl.github.io/ai-lab/?project=gift-chooser)                             | 选择礼物类别，调整七项评分，查看预测与建议 | NumPy 手写 `14 → 8 ReLU → 1` 网络；原参数以 JSON 导出，JavaScript 执行前向计算 |
| [Expression Recognition CNN](https://sherlock-lxl.github.io/ai-lab/?project=expression-recognition-cnn) | 上传面部图片，或主动开启摄像头拍摄一帧识别 | 三个残差 CNN 的 Softmax 概率等权平均；FP32 ONNX + ONNX Runtime Web WASM        |
| [Blind Verse](https://sherlock-lxl.github.io/ai-lab/?project=blind-verse-rnn)                           | 生成两句双盲诗，或输入短前缀续写           | 原字符级单层 LSTM；FP32 ONNX、显式隐状态与自回归采样                           |

推理在浏览器 Worker 内完成，无需运行 Python 服务或云端 GPU。模型按项目加载并校验哈希，不随主页下载；双盲诗的资源约 139 MB，首次进入需要下载。模型来源、预处理和原始结果对照见 [AI Lab 交付与验证](docs/ai-lab-delivery.md)。

摄像头需主动授权，图片与画面不上传至推理服务器，离开体验会停止摄像头。XiangLM 和校园猫咪识别目前提供作品档案与源码入口，浏览器内的 AI 推理范围为上表三个项目。

### 基本操作

以下为世界探索模式；游戏和摄影模式的专用操作可在各自页面查看。

| 操作                            | 按键或入口                                                          |
| ------------------------------- | ------------------------------------------------------------------- |
| 行走 / 奔跑 / 跳跃              | WASD 或方向键 / Shift / Space                                       |
| 环顾                            | 点击画面进入鼠标环顾，或按住拖动                                    |
| 附近主要动作                    | F；具体效果以当前提示为准，包括 AI 体验、源码、展览、作品和港口航线 |
| 项目详情 / 可用 Demo、音乐或 MV | E / R                                                               |
| 记忆、发现与近身世界向导        | G                                                                   |
| 拿起、放下小物或抚摸动物        | Q                                                                   |
| 骑乘 / 下乘                     | T                                                                   |
| 游戏摊位 / 摄影模式             | V / P                                                               |
| 关闭面板或释放鼠标              | Esc                                                                 |
| 地图、岛屿传送与探索工具        | 侧栏；手机左上角菜单                                                |
| 开启 / 暂停音乐与音效           | 右上角 ♪                                                            |

触屏直接点击附近操作按钮；左下摇杆外圈用于奔跑，拖动画面环顾，右下按钮跳跃。提示在横竖屏均避开移动控件。WebGL 不可用时，可继续使用二维项目档案。

### 本地开发

使用 Node.js 22（已验证 22.14+）：

```bash
git clone https://github.com/Sherlock-LXL/Sherlock-LXL.github.io.git
cd Sherlock-LXL.github.io
npm ci --ignore-scripts
npm run dev
```

开发地址为 `http://127.0.0.1:5173/`，世界与 AI Lab 分别位于 `/world/` 和 `/ai-lab/`。浏览网站无需安装开发依赖；主站和项目档案不加载 Three.js。

构建并检查静态产物：

```bash
npm run build
npm test
npm run preview
```

构建输出到 `dist/`，默认预览地址为 `http://127.0.0.1:4173/`。`npm test` 包含静态产物检查，应在构建后运行。页面与模型需要 HTTP(S) 服务，不能直接双击 `dist/index.html` 代替预览。

### 代码与内容

```text
index.html                    主站入口
projects/                     二维项目档案入口
world/                        按需加载的 3D 世界入口
ai-lab/                       AI Lab 独立页面入口
teaching-studio/               独立教学应用跳转页
src/portfolio-page.ts          主站、子站介绍与项目档案
src/main.ts                   世界界面、面板与交互
src/interaction-hint.css       统一近身提示样式
src/world/                    场景、移动、动物、摄影与游戏
src/ai-lab/                   AI 界面、Worker 与模型生命周期
src/core/ai-lab-frame.ts        世界内共享 AI 体验窗口
shared/                       模型适配、物理、导航与游戏规则
data/                         个人资料、世界、音频与模型清单
modules/<id>/                 项目 manifest、场景与原始素材
public/assets/ai-lab/          版本化浏览器模型资源
scripts/web-content.mjs        内容校验、资源筛选与静态构建
tests/                        基础与浏览器回归测试
docs/                         使用说明、模型验证与历史记录
.github/workflows/             验证与 GitHub Pages 发布
```

项目内容以 `modules/<id>/manifest.json` 为共同来源；个人资料、岛屿布局和音频分别维护在 `data/profile.json`、`data/world.json`、`data/audio.json`。构建生成 `content/projects.json`、`content/world.json` 和 `content/ai-lab.json`，应修改源文件而非生成文件。

模型版本、来源、大小与 SHA-256 记录在 [模型清单](data/ai-lab-models.json)。构建校验公开资源及模型哈希，排除私有配置、训练数据和完整音视频母带。

### 测试与发布

安装浏览器后，可运行对应检查：

```bash
npx playwright install chromium
npm run test:smoke
npm run test:ui
npm run test:interactions
npm run test:ai-lab
```

这些脚本为 `dist/` 启动测试静态服务，覆盖路由、世界功能、桌面与手机提示、模型真实推理以及内嵌窗口。`test:ui` 可在安装 WebKit 后通过 `TEST_WEBKIT=1` 增加覆盖。

游戏与长距离骑乘测试需要另开预览服务，默认端口为 4191：

```bash
npm run preview -- --port 4191
```

然后在另一终端运行 `npm run test:games` 或 `npm run test:mounts`；更多玩法与验证命令见 [四季游乐](docs/seasonal-games.md)。

本仓库的 `main` 通过 GitHub Actions 发布至 `https://sherlock-lxl.github.io/`。[Pages 工作流](.github/workflows/pages.yml) 依次执行类型检查、构建、基础测试、浏览器 smoke 与原始 AI 模型推理验证，再上传 `dist/` 并部署。[完整浏览器 E2E](.github/workflows/e2e.yml) 可手动触发。

AI Lab 也可用 `npm run build:ai-lab` 单独构建到 `dist-ai-lab/`。`BASE_PATH` 用于适配其他静态部署路径；正式主站使用根域名，旧 `/xiangmeta/` 和已退役 `/jiahui/` 入口保持停用。

`backend/`、`desktop/`、`runtime/` 与历史版本文档保留桌面版相关实现。它们不属于当前网页的运行前提；旧桌面命令和 `test:legacy` 依赖对应的 Python、模型与媒体环境。

### 文档与署名

- [Web 使用与架构](docs/web-guide.md)
- [AI Lab 交付与验证](docs/ai-lab-delivery.md) · [原始源码与模型调查](docs/ai-lab-investigation.md)
- [四季游乐](docs/seasonal-games.md)
- [Web 迁移记录](docs/web-migration.md) · [历史版本](docs/releases/README.md)

世界与个人作品由李湘伦创作，《燕来有声》保留未名拾音团队署名。代码采用 [MIT](LICENSE)；摄影、封面、音乐、歌词、影片和品牌素材的权利及模型原项目说明见 [CREDITS.md](CREDITS.md) 与各自许可证。构建同时提供第三方软件与模型通知。

## English

XiangMeta is 李湘伦 / Sherlock-LXL's personal portfolio: language models, bubble research, photography and original music share one evolving world.

Browse the ordinary pages for project archives and subsite introductions, or explore the Three.js world on foot. Three AI projects can also be used in embedded windows without leaving the world.

### Explore

| Entry                                                              | Experience                                                                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| [Home](https://sherlock-lxl.github.io/)                            | Profile, subsites, selected work and the world entrance                                                                  |
| [Projects](https://sherlock-lxl.github.io/projects/)               | Ten project and creative archives with categories, search, details and source links                                      |
| [World](https://sherlock-lxl.github.io/world/)                     | First-person exploration, exhibits, science simulations, music, photography and seasonal games                           |
| [AI Lab](https://sherlock-lxl.github.io/ai-lab/)                   | Original Gift Chooser, Expression CNN and Blind Verse models running in the browser                                      |
| [Teaching Studio](https://sherlock-lxl.github.io/teaching-studio/) | Redirects to the [separate teaching application](https://teaching-studio.de5.net/), which manages its own account access |
| [Gift Lab](https://sherlock-lxl.github.io/gift-lab/)               | Preference exploration through a happiness radar, gift ratings and pairwise choices                                      |
| [Sketch2Link](https://sherlock-lxl.github.io/sketch2link/)         | Hand-drawn closed paths and four-bar / five-bar mechanism motion                                                         |

This repository builds Home, Projects, World, AI Lab and the Teaching Studio redirect. Gift Lab, Sketch2Link and the teaching application are maintained and published separately.

### The world

A central hub connects four core islands and ten exhibits: AI Mountain in spring, Science Valley in winter, Personal Museum in autumn and Weiming Studio in summer. The visual style combines Chinese landscape painting, mineral pigments, silk and ink with a light blue-green interface.

Explore on foot, jump, teleport or open the map. Small translucent action hints appear only when a target is nearby and within a generous view region. The world includes ten animals, sixteen movable seasonal objects, petting, deer and polar-bear mounts, memories and local collections.

Seasonal stalls offer motorcycle tours, boat routes, aerial tours and six arcade games. Two bubble simulations calculate in browser Workers using demonstration parameters. Music starts with an explicit click; photo mode exports images and postcards. Full albums and the MV retain their external listening/viewing links.

### Original AI models

| Project                    | Browser implementation                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Gift Chooser               | Original NumPy `14 → 8 ReLU → 1` weights exported as JSON; JavaScript forward pass                              |
| Expression Recognition CNN | Three residual CNNs with equally averaged Softmax probabilities; FP32 ONNX and ONNX Runtime Web WASM            |
| Blind Verse                | Original character-level, single-layer LSTM; FP32 ONNX, explicit hidden/cell states and autoregressive sampling |

Standalone and embedded modes share one application. Inference runs in browser Workers without a Python server or cloud GPU. Models load on demand and are hash-checked; Blind Verse needs about 139 MB on first use. Camera access is opt-in, inference images stay local, and leaving the experience stops the camera. XiangLM and campus cat recognition remain project archives with source links.

See [AI Lab delivery and validation](docs/ai-lab-delivery.md) for model provenance, preprocessing, original-result comparisons and compatibility.

### Controls

WASD/arrows walk, Shift runs and Space jumps. Click or drag to look. F performs the displayed nearby action, E opens project details, R opens an available demo/music/MV, G interacts with discoveries/memories or the nearby guide, Q picks up/places objects or pets animals, T mounts/dismounts, V opens a game stall and P enters photo mode. Esc closes a panel or releases the pointer.

Sidebar regions teleport; World Overview opens the map. Touch uses a joystick, drag-to-look, jump and contextual action buttons; the joystick's outer ring enables running. Portrait and landscape hints leave the movement controls clear. The ordinary project archive remains available when WebGL is unavailable.

### Development and validation

Use Node.js 22; 22.14+ has been validated:

```bash
git clone https://github.com/Sherlock-LXL/Sherlock-LXL.github.io.git
cd Sherlock-LXL.github.io
npm ci --ignore-scripts
npm run dev
```

Development uses `http://127.0.0.1:5173/`. Build with `npm run build`, run `npm test` after building, then use `npm run preview` at `http://127.0.0.1:4173/`. Output is `dist/`; use HTTP(S), including local preview. Home and Projects do not load Three.js.

Install Chromium with `npx playwright install chromium`, then run `test:smoke`, `test:ui`, `test:interactions` or `test:ai-lab` through npm. These scripts serve the production build for browser checks. Game and mounted-travel checks need a separate preview at port 4191; see [Seasonal games](docs/seasonal-games.md).

Author project content in `modules/<id>/manifest.json`, with profile, world, audio and model metadata in `data/`. The build validates resources and generates `content/projects.json`, `content/world.json` and `content/ai-lab.json`. Edit their sources, not the generated JSON. World code lives in `src/world/`; AI UI and Workers in `src/ai-lab/`; shared model, physics and navigation logic in `shared/`.

### Publishing and credits

The [`main` Pages workflow](.github/workflows/pages.yml) runs typecheck, build, core tests, browser smoke and original-model inference checks before deploying `dist/` to the root user site. [Full browser E2E](.github/workflows/e2e.yml) is manually triggered. `npm run build:ai-lab` produces an independent `dist-ai-lab/` build; `BASE_PATH` supports other static hosting paths. Retired `/xiangmeta/` and `/jiahui/` routes stay disabled.

Desktop implementations and release history remain in `backend/`, `desktop/`, `runtime/` and `docs/releases/`. They are not required to run the website. Legacy desktop commands/tests require their corresponding Python, model and media environment.

[Web guide](docs/web-guide.md) · [AI Lab investigation](docs/ai-lab-investigation.md) · [Migration notes](docs/web-migration.md) · [Release history](docs/releases/README.md)

World and personal works are by 李湘伦; 《燕来有声》 retains 未名拾音 team attribution. Code uses the [MIT License](LICENSE); media rights and original-model notices are documented in [CREDITS.md](CREDITS.md) and their respective licenses. Third-party software and model notices accompany the build.
