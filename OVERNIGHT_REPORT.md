# XiangMeta Overnight Report

日期：2026-10-02  
分支：`overnight-creative`  
Checkpoint：`a0ff2a4`  
线上基线：`main` / `origin/main` 均保持 `f117105`  
状态：仅本地开发，未 push、未 merge、未 deploy、未 release

## A. 今晚总体做了什么

在不改动核心移动、Portfolio 数据结构和模块加载机制的前提下，加入了一组低成本、可关闭的世界反馈：

- 玩家行走会留下随区域变化的短暂足迹，传送抵达时出现复用波纹。
- 项目环境粒子会根据玩家距离改变节奏和亮度。
- 四个核心区域各发现一个旅行印记后，会完成“四域共鸣”并点亮中央星塔。
- 玩家在区域停留并安静片刻后，可能听见一次克制的区域低语。
- 完成了夜景、舞台粒子方向和移动地图的最终 polish。
- 评审后完整移除了未承载项目内容的潮汐花园、观星台及其四座桥，世界回到中央枢纽与四个核心岛。

所有新增玩法均由 `src/world/features.ts` 中的独立开关控制。

## B. 新增玩法

### 1. 旅行者痕迹

- 体验位置：所有可步行区域。
- 操作：正常 WASD 行走；传送到区域时观察脚下。
- 效果：区域色足迹、抵达波纹。
- 实现：单个 `InstancedMesh` 管理 28 个足迹，复用两个波纹。

### 2. 四域共鸣

- 体验位置：AI 山脉、科学山谷、个人博物馆、未名拾音。
- 操作：在每个核心区域发现至少一个旅行印记并按 `G`。
- 效果：中央星塔逐域点亮；4/4 后出现环绕星尘。
- 进度：旅行印记面板显示“四域共鸣 n / 4”。

### 3. 会回应的项目

- XiangLM：靠近时 token flow 更活跃。
- 音乐区：舞台粒子形成有节奏的音量列。
- 诗歌、科研装置：萤火、气泡和共振粒子随距离增强。

### 4. 区域低语

- 体验位置：中央枢纽与四个核心区域。
- 操作：在区域停留约 5.5 秒，并安静约 2.2 秒。
- 每个区域每次页面会话只出现一次。
- 打开面板、地图、摄影或项目交互时不会触发。

## C. 世界 Polish

- 修正未名拾音舞台粒子方向，使其朝向观众侧。
- 中央星塔增加四盏克制的暖色建筑灯，改善夜景冷硬感。
- 移动端迷你地图隐藏不可读的小字，保留岛屿和点击传送。
- 删除两个公共岛后恢复原四岛岸线装饰生成，不保留朝向空海面的桥口净空带。
- 删除公共岛专属导航、地图标记、碰撞、地形高度、低语、颜色和 feature flag，不留下隐藏死代码。
- 最终截图复核未发现新增悬浮、穿模、Z-fighting、桥口阻挡或 UI 重叠。

## D. UX 改进

- 玩家靠近项目时即可感知反馈，不需要先阅读说明。
- 旅行印记与中央星塔建立跨区域目标，但不会强迫玩家完成。
- 区域低语复用现有 toast，不新增常驻 UI。
- 所有新系统均可单独关闭。
- E2E 键盘辅助函数明确释放 pointer lock，消除 canvas 抢焦点导致的偶发漏触发。

## E. 性能变化

- 主 JS：约 `112.94 KB gzip` → `112.21 KB gzip`；移除公共岛后比前一版减少约 `5.30 KB gzip`。
- Three.js chunk：保持约 `152.20 KB gzip`。
- 最终四岛出生点：`497` draw calls。
- 未增加纹理、模型、音频、第三方依赖或网络 API。
- `dist` 总体积约 `55 MB`，主要仍为原有摄影和音乐资源。

Headless Chromium 使用软件 WebGL，FPS 不代表真实设备；本轮以 calls、triangles、bundle 和请求变化作为主要性能依据。

## F. 修复的 Bugs

- 音乐舞台粒子未继承模块旋转，出现在舞台背面。
- 移动端迷你地图文字重叠且无法阅读。
- 长 E2E 中 pointer lock 会异步夺回焦点，导致 Enter 偶发漏触发。

## G. 尝试后删除或回滚的想法

评审后完整移除了潮汐花园、观星台、四座公共桥及专属响应系统。它们没有接入新的项目内容，却增加了视觉、桥梁和碰撞维护成本；最终版本不保留隐藏开关或死代码。

以下方向在编码前被主动舍弃：

- 常驻任务列表：会增加 UI 压力并削弱 Portfolio 主线。
- 高频全局粒子和天气事件：视觉噪声与性能成本过高。
- 随机生成旁白：无法保证个人真实性。
- 新移动能力和复杂物理：回归范围过大。

后续候选方向记录在 `OVERNIGHT_IDEAS.md`。

## H. Commits

以下为报告生成前的功能与测试 commits：

- `fdfa8a2` `feat: make exploration visibly resonate through the world`
- `6308809` `feat: awaken the public islands on approach`
- `54520b9` `feat: add quiet region whispers for moments of stillness`
- `d354705` `polish: refine night warmth, stage response and mobile atlas`
- `85dee7d` `test: stabilize pointer-lock UI activation`
- `44dff05` `fix: stabilize public bridge joints and remove park tags`
- `07fa4a4` `fix: anchor bridge cables to the deck`
- `082e88c` `refactor: return XiangMeta to the four core islands`
- `f5319c4` `test: harden long browser regression navigation`

相对 checkpoint 的功能与测试代码：26 个文件，293 行新增，324 行删除。

## I. Tests

- Production build：通过。
- TypeScript：通过。
- Unit：`24/24` 通过。
- Smoke：通过，覆盖四岛结构、landing、项目链接、响应式环境、共鸣和移动控制。
- Full Chromium E2E：通过。
- E2E 覆盖：WASD、跳跃、Pointer Lock、F/E/R、项目链接、地图、摄影、记忆、音乐、科研 Worker、10 个展品、港口、移动双指操作、WebGL 降级。
- Console/page errors：0。
- HTTP failures：0。
- Visual walkthrough：首页、中央枢纽、AI 山脉、科学山谷、个人博物馆、未名拾音、世界地图、中央夜景和移动端均已截图复核。

最终截图位于：

- `artifacts/web/`
- `artifacts/overnight/`

## J. 5–10 分钟最佳体验路线

1. 从首页进入 XiangMeta，先在中央枢纽行走几步，观察区域色足迹。
2. 点击左侧“AI 山脉”，靠近 XiangLM Tower，观察 token flow 随距离增强。
3. 前往“科学山谷”，靠近 Bubble Laboratory，并按 `E` 调整科研模拟参数。
4. 前往“未名拾音”，靠近舞台观察朝向观众的节奏粒子；可点击右上角音乐按钮。
5. 前往“个人博物馆”，查看钟楼、画廊、摄影与音乐项目。
6. 打开“旅行印记”，选择不同区域寻找发光装置，靠近按 `G`，观察四域共鸣进度。
7. 打开“海岛时光”切换到月夜，再从“记忆星图”返回中央，查看星塔暖灯和夜景。

## K. 推荐保留

- 旅行足迹与抵达波纹：反馈清晰，成本低。
- 项目距离响应：让 Portfolio 展台不再静止。
- 四域共鸣：自然连接现有旅行印记与中央星塔。
- E2E pointer lock 稳定化：应长期保留。

## L. 可选改动

- 区域低语的具体文案和触发时间。
- 中央星塔四盏暖灯的亮度与造型。
- 足迹的区域配色和保留时长。
- 移动端迷你地图隐藏文字的取舍。
