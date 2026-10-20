# XiangMeta

一个随个人项目、科研与创作持续生长的 3D 数字世界。当前版本 **v0.19 雨幕与留白**：打散雨滴排列，整理山路座椅与护栏，重排轻薄积雪，清理科研区岸边设备及树冠穿插。详见 [v0.19 更新说明](docs/v0.19-rain-and-clearance.md)。五个模型、两篇论文工作台、本地 MV 和十六个 R 互动继续可用。

**v0.13.1 修复版**：便携启动使用独立解压目录，避免重复启动清掉正在使用的图片和音乐；原生 Esc 松开后恢复环顾；山路铺装合入地形表面，展台底座周围保持平整。详见 [修复记录](docs/v0.13.1-reliability.md)。

AI 山脉改为带石砌台地的山地花园：3.2 米宽的浅金色折返步道、圆滑转弯、双侧护栏、花带与五个驿站平台。顺序仍为 **礼物选择器 → CNN 表情识别 → RNN 双盲诗 → CNN 猫咪识别 → Transformer / XiangLM**，两座 CNN 台地之间保留蓝色捷径。全世界补充共享的石材、木纹、草叶及铺装纹理；保留第一人称、跳跃、F 工作台、R 记忆星图、P 摄影、量化交易所岛与机器人岛。详见 [v0.9 更新说明](docs/v0.9-mountain-garden.md)。[v0.8](docs/v0.8-mountain-horizons.md) 和 [v0.7](docs/v0.7-growth-and-memory.md) 的便携 EXE 继续保留。

v0.11 修正启动页居中，精简路牌，加入统一星光碎片石座，修复桥头道路避让，重做两种科研气泡动画。秋岛改为十四幅摄影与五张专辑的双展廊，十二首精选人声作品可试听并阅读原始歌词；《燕来有声》明确标注团队归属。详见 [v0.11 星光与双展廊](docs/v0.11-galleries-and-starlight.md)。当前七首伴奏自动轮播，四首季节曲每次旅程各首演一次，同一窗口刷新、反复进出不重播。春季《春》已接入；v0.14 已接入团队 MV。

## 运行

### Windows 桌面

双击 **`build/XiangMeta-0.19.0/XiangMeta-0.19.0-x64.exe`**。完整目录内包含五个模型、独立 Python、世界与媒体；换位置时复制整个 `XiangMeta-0.19.0` 文件夹，保留 `runtime` 与 `local.json`。更新时先关闭旧版本窗口，再启动新版。

目录版的 `local.json` 使用 `root: "."`；所有模型路径相对该目录。上一级 `build/XiangMeta-0.19.0-x64.exe` 则使用 `build/local.json`，读取工程内的 runtime。单独移动这个 EXE 不会携带模型。

桌面内部地址固定为 `http://127.0.0.1:4319`，保留跨次启动的收藏。应用采用单实例；如端口被其他程序占用，会显示启动错误。Windows 成品未签名，当前使用 Electron 默认图标。

### 源码开发

推荐 Node.js 22.12+，本次实际验证 Node.js 26.7。依赖版本由 `package-lock.json` 固定。

```powershell
npm.cmd ci
npm.cmd run dev
```

打开 `http://127.0.0.1:5173`。Vite 提供界面热更新，网关监听 `127.0.0.1:4318`。修改模块或世界清单后重启开发服务。

```powershell
npm.cmd run build
npm.cmd start
```

打开 `http://127.0.0.1:4318` 验证生产资源。桌面开发入口为 `npm.cmd run desktop`（需先构建且已安装 Electron 二进制）。

### 模型运行环境

当前 `runtime/python/python.exe` 是独立 CPython 3.12，五个推理模块位于 `runtime/models`，运行不依赖原仓库或 Codex 缓存。`data/local.json` 的 `root: ".."` 相对配置文件定位工程根目录。原项目只读，复制清单与哈希见 `runtime/model-inventory.json`。

```powershell
npm.cmd run doctor
# 重新构建 EXE 后，把本地 runtime 一并复制到版本目录：
.\runtime\python\python.exe -B scripts/stage-portable.py
```

`backend/requirements-lock.txt` 记录本次实际环境。复现 CPU 环境时安装锁文件需额外加 `--extra-index-url https://download.pytorch.org/whl/cpu`。可用 `pythonByModule` 为不同模块指定不同解释器，未来 CUDA 环境也可独立替换。

## 已实现

- 四大区域、中央枢纽、连续步道、角色漫游、镜头旋转缩放、快速抵达、基础地面及展品碰撞。
- 十个独立展品：XiangLM、猫咪识别、表情识别、双盲诗、礼物预测、Bubble、声致发光、摄影、个人音乐、未名拾音。
- 清单驱动的注册、输入表单、成长档案、媒体展示；坏模块隔离，不阻断其他展品。
- 五个独立 Python 适配器，统一输入校验、超时、取消与单任务并发限制。
- 资料型世界向导与可配置的语言模型入口；真实模型输出显式标识。
- 收藏、探索进度、手动摄像头拍摄；关闭面板自动取消推理和停止摄像头。
- 环境音、背景音乐、UI、交互四条音轨及区域音乐清单。
- GLB 建筑/展品替换与自带动画播放；缺失资源保留程序化占位。
- Windows EXE 构建与本地浏览器预览。

## 操作

| 操作 | 效果 |
|---|---|
| WASD / 方向键 | 相对镜头方向移动，5.2 米/秒 |
| Shift + 移动 | 加速至 8.5 米/秒 |
| 空格 | 跳跃；可跳上矮障碍，落地后再次起跳 |
| 点击 / 拖动鼠标 | 第一人称环顾；地图模式支持滚轮缩放 |
| F | 靠近终端，打开产品工作台 |
| R | 靠近记忆标记点亮星图；靠近趣味装置收集旅行印记 |
| P | 摄影模式：WASD 平移、Q/E 升降、拖动环顾、调整视野和光线，导出 PNG / 明信片 |
| 右上角 ✶ / 左侧成长路径 | 记忆星图、路线追踪与抵达记忆附近 |
| 左侧远方岛屿 | 查看量化交易所岛与机器人岛，远眺摄影后恢复原位置 |
| 右上角 ✧ | 查看旅行印记 |
| 左侧区域入口 | 快速进入区域 |
| 世界标签 / 展品索引 | 查看展品并体验模型 |
| 抵达展品 | 移动到展品附近 |
| Esc | 关闭面板、取消推理、停止摄像头并继续环顾；世界中再次按下释放鼠标 |
| 右上角时钟 | 调整时刻、预览昼夜，开启或暂停 16 分钟一昼夜的自然循环 |

## 架构

```text
src/
  core/            类型、事件、存档、API 客户端
  world/           场景、角色、导航、建筑预设、GLB 生命周期
  agents/          资料检索导览
  audio/           清单驱动音轨
  main.ts          展览界面和应用组装
shared/            清单校验、输入契约、导航规则、示意曲线
modules/<id>/      manifest.json + 可选 scene.ts / interactions.ts / assets / worker.py
backend/           注册表、受限本地 HTTP 网关、独立进程执行
data/              世界/Agent 配置及本机路径映射
public/assets/     audio / images / models
desktop/           Electron 生命周期与安全边界
scripts/           开发、诊断、模块生成、真实模型冒烟测试
tests/             契约、网关、运行时、浏览器与桌面验证
docs/              架构决策、扩展规范、阶段规划、素材清单
build/             Windows 成品（不入库）
```

详细设计见 [架构决策](docs/architecture.md)、[模块开发指南](docs/modules.md)、[阶段与素材清单](docs/roadmap.md)。

## 扩展一个项目

```powershell
npm.cmd run module:new -- music-ai ai-mountain --scene
```

编辑生成的 `modules/music-ai/manifest.json`，填写内容、位置和界面。推理逻辑放入该模块自己的 `worker.py`；路径只写在本机配置中。**复用已有交互契约和展示预设时，不修改核心系统。** 全新输入类型或新的交互机制仍需要增加一个通用扩展点，而非为某个项目写分支。

## 验证与构建

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:ui     # 使用已安装的 Edge，测试会自启临时服务
node tests/mountain-world.mjs # 五层山地、双向主路与捷径、各层跳跃/F、未来岛屿
node tests/living-world.mjs # 成长路径、九段记忆、摄影导出、时间还原、展品关联
node tests/jump-browser.mjs # 空格、跃石落顶、传送复位、面板禁用
node tests/discoveries.mjs # 字体、真实诗歌、R 装置、声音和印记存档
node tests/movement.mjs # 实测行走/加速、终端碰撞及地面画面
node tests/refinement.mjs # 原生鼠标恢复、相机稳定性、四个光照时刻
node tests/scene-fixtures.mjs # 标牌背面、杯子、四面导览亭与纸蝶连续帧
node tests/performance.mjs # 相同视口下测量绘制调用及帧时间
node tests/desktop.mjs  # 验证已打包桌面程序，自动关闭测试窗口
node tests/portable.mjs # 验证当前版本便携 EXE
node tests/portable.mjs --visible # 实际桌面窗口验证原生鼠标恢复，完成后自动关闭
node scripts/model-smoke.mjs recommendation poetry xianglm
npm.cmd run dist:win
```

真实模型测试读取外部权重，不会训练或改写源项目。图片模型的测试文件通过 `XIANGMETA_TEST_EMOTION_RECOGNITION` / `XIANGMETA_TEST_CAT_RECOGNITION` 环境变量指定。

## 当前边界

这是可成长的基础版本，尚不是最终美术成品。科研交互是明确标注的示意曲线，尚未接入真实实验测量或验证过的求解器。音乐、摄影、封面和建筑当前使用占位。XiangLM 保留原模型单轮能力，资料导览不会伪装为模型回答。CPU 推理以正确接通为先，逐次加载权重，后续再做常驻服务与流式输出。最终成品不包含 Python、GPU 驱动和模型权重。

