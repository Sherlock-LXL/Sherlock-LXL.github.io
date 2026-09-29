# XiangMeta → Web Portfolio：检查报告与最小迁移方案

检查日期：2026-09-29。基线：`f117105`（XiangMeta 1.0.0）。

> 历史检查快照。作者之后已确认迁移路线、媒体权利和音乐外链，并授权实施。最终实现与验收边界见 [迁移记录](web-migration.md)。

**结论：保留现有 Three.js 世界，以静态化改造部署 GitHub Pages。无需迁移引擎，也无需引入 React Three Fiber。**

本轮仅检查、构建验证和制定方案，未修改应用代码、项目配置、资源或部署设置。以下目录与改动均为提案，等待确认后实施。

## A. Current Stack

### 实际技术栈

以源码和 `package-lock.json` 为准：

| 部分 | 当前实现 |
|---|---|
| 3D | Three.js **0.180.0**，`WebGLRenderer` / WebGL2 |
| 前端 | TypeScript **5.9.3**，原生 DOM、CSS、HTML dialog；无 React |
| 构建 | Vite **7.3.6**，已有 `tsc --noEmit && vite build` |
| 数据校验 | Zod **4.5.4**，`shared/schema.mjs` |
| Windows 外壳 | Electron **38.8.6**、electron-builder **26.15.3** |
| 本地服务 | Node.js HTTP，提供清单 API、模块媒体、模型调用 |
| AI 推理 | 5 个 Python worker；依赖本地解释器、源码和模型权重 |
| 科研交互 | 浏览器 Web Worker + JavaScript 数值计算，无 Python 依赖 |
| 验证 | Node test runner、Playwright；部分测试绑定 Windows、Edge 和完整模型包 |

证据入口：`package.json`、`vite.config.ts`、`src/main.ts`、`src/world/world.ts`、`backend/server.mjs`、`desktop/main.cjs`。

### 场景与代码结构

- `data/world.json`：4 个可探索区域——AI 山脉、科学山谷、个人博物馆、未名拾音；另有中央枢纽、港口和未开放远景。
- `modules/*/manifest.json`：10 个展品——XiangLM、猫咪识别、表情识别、双盲诗、礼物推荐、气泡实验、声致发光、摄影、个人音乐、未名拾音。
- `src/world/`：程序化建筑、地形、道路、四季、天气、海面、镜面、摄影、趣味装置、记忆系统。
- `shared/`：角色移动、重力与跳跃、地形高度、碰撞、寻路、交互判定、数值模型及 schema。
- 5 个模块具有 `scene.ts`；5 个 AI 模块具有 `worker.py`。
- 模块契约已有坐标、旋转、碰撞、作品交互及资源释放接口；当前通过 `import.meta.glob(..., { eager: true })` 同步注册场景。

`docs/architecture.md` 含早期版本说明，部分描述已过时，例如“无跳跃”。本报告以当前代码为准。

### 是否已经能构建 Web

**能生成网页构建，但当前构建尚不能独立部署到 Pages。**

启动必须请求 `/api/catalog`；`/assets/modules/...` 由 Node 服务从 `modules/*/assets` 提供。Vite 当前只复制 `public/`，没有导出静态清单，也没有复制模块媒体。上传现有 `dist/` 会缺少这两部分。Python 推理无法在 Pages 上执行。

本轮验证：

- 原版 `npm run build` 成功，包含 TypeScript 检查。
- 主业务 JS 296.53 kB、Three.js chunk 590.33 kB、CSS 44.86 kB；Vite 显示三者 gzip 合计约 **267 kB**。这不包含项目 JSON、模块媒体及初始化计算成本。
- 55 项原有测试：**50 通过、5 失败**。4 项涉及缺失的 Windows Python/本地模型配置；1 项要求已移除的 MV 返回 HTTP 206。
- 本地 Chrome headless 已渲染原世界，并保存总览截图。自动交互流程在后续鼠标锁定状态下访问侧栏时中断，且运行环境报告 Chrome 写入目录的沙箱限制；未完成浏览器端到端验收。
- 本轮没有验证 Windows Chrome/Edge 或 macOS Safari；历史 EXE 验收数据不当作本次 Web 验收。

临时 Node 和检查日志位于已忽略的 `.runtime/web-audit/`；依赖及构建输出也在现有忽略范围内。

## B. What Can Be Reused

| 内容 | 复用方案 |
|---|---|
| 现有世界外观与布局 | 保留四区、枢纽、建筑、道路、树木、海面及装饰，不重新建世界 |
| WASD、鼠标视角、Shift、跳跃 | 保留 `LookControls` 和 `shared/locomotion.mjs`，补浏览器输入验收 |
| 地形、碰撞、传送 | 保留共享高度与碰撞规则 |
| 旅行印记、记忆、收藏、摄影 | 保留逻辑及稳定 ID；沿用浏览器本地保存 |
| 项目介绍与模块契约 | 扩展现有 manifest/schema，不另维护一套项目正文 |
| 科研工作台 | 保留浏览器 Worker、公式和交互曲线，保持“演示参数”的事实边界 |
| 优化代码 | 保留静态合批、实例化、共享材质、低画质模式和阴影节流 |
| 照片、封面、音乐 | 技术上可复用；是否公开以逐项权利核实为准 |
| Python adapters、桌面包装 | 原项目保留作历史及本地运行用途，不进入网站运行路径 |

当前文件中没有 GLB/glTF、FBX、OBJ、KTX2、HDR 或外部动画文件。GLTFLoader 和动画支持是已有扩展能力，尚无实际 `visualAsset` 配置。大部分场景和动画来自仓库内代码。

MusicAI、3D Printing / Clogging Prediction、可交互 Robotics 展品目前未注册。远景机器人岛与科研营地装饰不等于已完成项目，不自动生成相关成果陈述。V1 先接入已有内容，后续按配置扩展。

## C. Web Deployment Strategy

### 推荐：Vite 静态多页面 + 原 Three.js 世界

```text
/                    Landing：李湘伦 / Sherlock-LXL
                     AI · Engineering · Research · Music
                     Enter XiangMeta / View Projects
/projects/           传统作品集、分类筛选、项目详情
/world/              原 XiangMeta，进入后才加载 3D
```

首页包含简洁 About、精选项目、GitHub 和 Contact；普通作品集覆盖 AI、Research、Engineering、Music / Creative。没有确认的邮箱、Demo、项目成果不编造。

选择实际的 `index.html`、`projects/index.html`、`world/index.html`，详情可用片段或查询参数定位。Pages 不需要服务器路由重写，直接访问和刷新均有对应文件。首页与 Projects 不导入 Three.js，不创建 WebGL、音频或世界事件监听。

桌面访客主动进入 3D。手机默认推荐 Projects，并提示 “Desktop experience recommended”。WebGL2 不可用或加载失败时提供 Projects 入口、重试和返回首页。

### 一个项目数据源

```text
modules/*/manifest.json        ← 唯一人工维护的项目资料
          ↓ schema 校验、公开字段规范化
          ├─ 构建普通 Portfolio HTML
          └─ dist/data/projects.json → XiangMeta 项目卡片与展品

data/world.json → dist/data/world.json → 区域、地形、布局
```

推荐扩展原 manifest，增加可选 `portfolio` 字段，包含正式项目名、分类、GitHub、Demo、技术栈、精选状态和截图引用。已有 `description / facts / story / media / position` 继续复用。

生成的 `projects.json` 包含两种页面需要的公开数据，不手工编辑；构建时排除本机路径、worker 配置、权重以及没有获准公开的正文或媒体。保留现有区域局部 X/Z 坐标约定，高度继续从地形计算。

新增普通项目只需增加 manifest 并选择已有建筑预设；需要特别装置时再增加 `scene.ts`。保留并更新现有 `module:new` 生成器。

### GitHub Pages

- 目标仓库：`Sherlock-LXL.github.io`；目标网址：`https://Sherlock-LXL.github.io/`；Vite `base: '/'`。
- 当前 remote 为 `Sherlock-LXL/xiangmeta`。沿用当前仓库名称部署，会得到 `/xiangmeta/` 项目站路径，不能仅靠改 `base` 获得账户根站。
- 若先做 `/xiangmeta/` 预览，除 Vite base 外，JSON 中的 `/assets/...` 和音频路径解析也必须统一处理；Vite 不会自动改写所有运行时字符串。
- `main` push → 安装锁定依赖 → 数据/资源检查 → Web 测试 → Vite build → 上传 **dist** → 官方 Pages deployment。
- 工作流使用 `contents: read`、`pages: write`、`id-token: write`、`github-pages` environment 和并发控制；不部署源码根目录，不启动 Node 服务，不打包 Electron。
- CI 使用满足 Vite 要求的受支持 Node 22/24 补丁版本。首次需将仓库 Pages 发布来源设置为 GitHub Actions。

依据：[GitHub Pages 官方说明](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)、[Vite Pages 部署指南](https://vite.dev/guide/static-deploy.html#github-pages)。

## D. Required Changes

### V1 必须完成

1. **静态数据和资源导出**：增加构建脚本，复用 schema 校验，生成公开 JSON；只复制获准公开的模块资源到 `dist/assets/modules/`。静态构建不得读取本机模型配置。
2. **拆分页面入口**：现有 `src/main.ts` 改为可进入/退出的世界入口，保留世界功能；新增轻量 Landing 与 Projects 页面。普通网页正文尽量构建时输出，便于快速阅读和搜索收录。
3. **Portfolio 内容**：统一分类、项目正式名称、技术栈、事实、截图和外链；补 GitHub / Demo 字段。当前清单仅有未名拾音的通用 `link`，没有其他项目仓库链接。
4. **项目交互卡片**：靠近展品只显示卡片，不自动跳转；项目状态下 F 打开 GitHub、E 打开站内详情、R 打开已配置 Demo。没有链接时隐藏对应动作。
5. **按键状态统一**：项目、独立照片/专辑、趣味装置、记忆和摄影模式采用明确优先级，同一次按键只触发一个动作。保留已有照片/专辑的 F 使用习惯；摄影中的 E 仍用于升高相机，不能同时打开项目详情。
6. **外链与输入恢复**：在真实按键/点击回调中同步打开 HTTPS 链接，使用 `noopener,noreferrer`；同时提供可点击链接。处理退出 Pointer Lock、暂停移动、返回标签页和 Esc；浏览器拒绝重新锁定时提示点击继续，保留拖动视角。
7. **移除网站的本地推理依赖**：五个 AI 展品展示成果、GitHub 和实际可用的外部 Demo；不向 `/api/modules/.../invoke` 发请求，不保留无效输入框或“启动本地服务”提示。资料检索向导可继续运行。
8. **加载和返回流程**：分阶段显示真实加载进度；资源错误可重试并可退出到 Projects。处理页面切换、资源释放和浏览器后退缓存，避免 `pagehide` 销毁后返回空世界。
9. **发布文档和自动部署**：更新 README、`.gitignore`、LICENSE、CREDITS、THIRD_PARTY_NOTICES、Actions；补实际截图。README 覆盖介绍、Controls、架构、本地开发、构建、部署和 Credits，替换 Windows 成品专用指引。

### MV 的最小改法

- 已有 B 站链接：`https://www.bilibili.com/video/BV1kCTX6uEf7/`。
- 原配置唯一缺失的媒体为 `yan-lai-you-sheng.mp4`；按你的要求，不加入网页版本。
- 改为“封面 + 前往 B 站观看”。`modules/weiming/scene.ts` 当前从 `kind: video` 读取 thumbnail，须同步改为独立封面引用，避免删除视频条目后舞台失去封面。
- 已有 WebP 封面约 **525 KiB**；根目录 PNG 约 **2.75 MiB**，两者均为 **1448×1086**。可从你提供的 PNG 生成适合网页的展示副本，保留原图；不把大原图放进首屏。
- 将“完整 MV 已在本馆展出”等文案同步调整为外链观看。

### 版权检查结果

| 范围 | 本地证据与当前判断 | 公开策略 |
|---|---|---|
| 场景、装置、程序化纹理 | 仓库代码生成；未发现外购模型包、外部贴图集或字体文件 | 复用代码；源码授权范围由你确认 |
| Three.js 及 addons | 已核对安装包 LICENSE：MIT | 保留完整版权和许可文本 |
| Zod | 已核对安装包 LICENSE：MIT | 构建/分发时保留必要许可 |
| Vite、TypeScript、Electron、测试工具 | 锁文件记录许可证；393 个依赖条目均有 license 字段 | 按实际发布依赖生成 notices，不把构建工具包当网页资源上传 |
| 14 张摄影与缩略图 | `personal-assets.json` 有来源和标题，manifest 标为个人作品 | 可追溯，但未见明确公开许可声明；确认后发布 |
| 12 首专辑曲、5 张专辑封面、歌词 | 存在李湘伦作词/作曲/编曲署名，也存在合作词作者、歌手、混音等署名 | 逐项核实音频、歌词、封面权利；未知项先保留说明和获准外链 |
| 7 首伴奏、4 首季节曲 | 有本地导入来源；没有完整权利或公开再分发说明 | 不默认复制到公开仓库及部署包 |
| 未名拾音封面、音乐与 MV 内容 | 标为团队项目，文案涉及合作发布 | B 站外链复用；封面公开展示权限仍需确认 |
| 两篇论文公式及说明 | 配置标为本人论文，页面署名 Xiang Li / Guang Chen；原稿未提供在本次文件中 | 不推断发表状态或整篇版权；核实可公开范围，保留真实署名 |
| 测试用 4 张 JPG | 部分注明来自表情项目样图和猫咪验证集，未附原始许可 | 新公开仓库不直接带入；用可授权样本替换或排除相关可选测试 |

“源码 MIT”不自动覆盖歌曲、歌词、照片和合作作品。建议自有代码采用 MIT（待你确认），个人/团队媒体保留各自权利，并在 CREDITS 记录作者、来源、许可证或授权范围、文件对应关系、处理状态。未确认资源默认不进入公开导出。

这些模块资源目前已经被 Git 跟踪，新增 `.gitignore` 不会从历史记录中移除它们。建议目标网站仓库采用**经过核实的干净导出作为初始内容**，保留原项目本地历史；不擅自重写现有 remote 历史。导出要同时检查源码中的歌词、论文内容和资源，而不只是部署包中的媒体。

## E. Performance Risks

### 实际资源盘点

统计初始工作区，排除 `.git`，不含后来安装的依赖及检查产物；MiB = 1024² 字节。

| 类型 | 数量 | 大小 |
|---|---:|---:|
| MP3：12 首专辑、7 首伴奏、4 首季节曲 | 23 | **186.73 MiB** |
| WebP：14 原图、14 缩略图、5 专辑封面、1 MV 封面 | 34 | **9.76 MiB** |
| 根目录 MV 封面 PNG | 1 | **2.75 MiB** |
| 测试 JPG | 4 | 0.07 MiB |
| 其他代码、配置、文档、图标 | — | 约 1.24 MiB |
| 合计 | 364 个文件 | **200.55 MiB** |

当前清单含 58 个唯一媒体地址，其中 57 个文件存在，1 个 MP4 缺失；未发现模块媒体的完全相同 SHA256 副本。照片长边 2400 px，缩略图长边 640 px；专辑封面 1200×1200。

**仓库总大小不等于首访下载量。** 现有专辑音频已经使用 `preload="none"`，并非 23 首全部预载；但世界启动会主动开启背景音乐，所有区域和展廊贴图同时初始化，尚无独立 Landing。

### 优先优化次序

1. **首页与 3D 分包**：首页只取 HTML/CSS/少量 JS；点击 Enter 后才加载世界和 Three.js。避免入口的 `modulepreload` 提前拉取 Three.js。
2. **媒体按需加载**：网页卡片用缩略图；进入区域再取展廊贴图；点开作品才取大图。音乐仅在用户开启声音/试听后请求。获准发布的 MP3 可额外导出 128–160 kbps 展示版本或短试听，保留原始文件，不覆盖母带。
3. **分阶段构建场景**：当前 `new World()` 同步生成全部区域、纹理、碰撞与路线，加载动画可能无法更新。拆成可让出主线程的阶段，报告数据、几何、纹理和着色器准备进度；不以固定计时器假装下载百分比。
4. **纹理显存**：有四张 2048² 地表图和一张 2048² 山路 mask，仅这五张 RGBA8 纹理含 mipmap 的理论占用就约 **107 MiB**；另有 1536 宽标牌和生成纹理。文件体积小不代表显存小。按画质降到 1024、按观看距离设置标牌清晰度，检查文字实际可读性。
5. **保留合批与 instancing**：避免跨整个世界合成一个大网格，保留区域剔除能力。当前合批会生成非索引几何，部分源几何延后至销毁才释放，应测内存峰值。
6. **几何、动画与 LOD**：山地网格约 9.2 万三角形；天气云使用 288 个球体实例，实例化虽减少 draw call，仍有顶点开销。对远景、云和小装饰降低细分，按距离停用不必要动画，必要时增加简单 LOD；保持共享地形碰撞不变。
7. **阴影、镜面**：保留像素倍率上限 1.2、单盏方向阴影灯、1024 阴影约每秒更新 3 次、512×640 镜面在 12–20 米渐隐。低画质可关闭阴影/镜面并减粒子，按实际设备验证效果。

V1 的最小范围是：**网页/3D 分包、分阶段初始化、区域贴图及媒体懒加载**，基础地形与碰撞常驻。现有模块场景 `eager` 注册需要评估改为延迟加载；传送必须等待目标区域可用，不能让玩家落入尚未创建的碰撞场景。

完整区域几何卸载/重载会牵涉季节、合批、共享纹理、导航和记忆生命周期，改动明显大于媒体懒加载；先保留加载接口，再依据性能实测决定是否纳入后续版本。

GLB/glTF 适合未来导入模型；届时按资产选用 Meshopt 或 Draco，并按需加载对应解码器。KTX2 适合较大的 GPU 纹理。当前没有此类模型，先整体转换成 GLB 或接入全部解码器不会解决主要问题。

### 建议验收预算（目标，不是已测结果）

- Landing 首屏总传输尽量 ≤300 KiB，不请求 Three.js、MP3、大图。
- 进入 3D 至可探索，必要资源传输尽量 ≤3 MiB；大型音频及高清作品不计入必要加载。
- 以固定桌面视点、分辨率和网络条件记录冷启动、传输量、FPS/帧时间、draw call 和内存；集显以稳定可用的 30 FPS 为底线，较强设备争取 60 FPS。
- 当前历史 AMD 610M 成品记录约 41–64 FPS，不能外推为全部浏览器和设备的承诺。

## F. Proposed Repository Structure

下列为目标结构；尽量保留原目录，只增加页面、导出和 Web 验证入口。

```text
Sherlock-LXL.github.io/
├── index.html
├── projects/index.html
├── world/index.html
├── src/
│   ├── portfolio/               # Landing、项目列表、详情、筛选
│   ├── world/                   # 原 Three.js 世界及加载调度
│   ├── core/                    # 公共数据类型、事件、详情能力
│   └── audio/                   # 按需播放
├── shared/                     # 保留移动、地形、schema、科研计算
├── modules/<id>/
│   ├── manifest.json           # 唯一项目资料入口
│   ├── scene.ts                # 可选原场景扩展
│   └── assets/                 # 仅已核实可公开的资源
├── data/
│   ├── world.json
│   └── profile.json            # 姓名、简介、社交与联系信息
├── public/                     # 通用网站资源、许可文本
├── scripts/
│   ├── build-catalog.mjs
│   ├── export-web-assets.mjs
│   └── new-module.mjs
├── tests/                      # Web 数据、交互与部署产物检查
├── docs/
│   ├── web-portfolio-audit.md
│   └── asset-rights.json        # 来源、作者、公开范围与核实状态
├── .github/workflows/deploy.yml
├── README.md
├── CREDITS.md
├── THIRD_PARTY_NOTICES.md
├── LICENSE
├── .gitignore
├── package.json / package-lock.json / vite.config.ts
└── dist/                       # 自动生成、Git 忽略
    ├── index.html
    ├── projects/index.html
    ├── world/index.html
    ├── data/projects.json
    ├── data/world.json
    └── assets/modules/...
```

`backend/`、`desktop/`、Python workers、运行环境和原始资源可留在原 XiangMeta 仓库归档，不作为新网站必需文件。与桌面环境绑定的测试保留原处；新仓库的 Web CI 不要求 Windows Python 或完整模型包。

### 确认后的实施顺序

1. 静态数据、媒体导出与无后端启动，先使原世界能由普通静态服务器打开。
2. Landing / Projects、共享数据、F/E/R 项目交互、MV 外链。
3. 加载 UI、媒体与区域懒加载、响应式入口、失败回退和输入生命周期。
4. 核实公开内容及许可，整理干净的网站仓库、README 与 Actions。
5. 运行 Web 验收并部署 Pages：Windows Chrome/Edge、macOS Chrome/Safari；检查首访、行走、跳跃、传送、F/E/R、返回、刷新、外链、移动端 Projects、加载失败和实际发布 URL。自动 Chromium/WebKit 测试不能替代真实 Safari/Windows 验收。

目前需要确认的是这条迁移路线。项目链接、Contact 资料和资源公开权利可以在实施时逐项补齐；尚未核实的内容不阻塞无媒体静态原型，但不进入公开发布。
