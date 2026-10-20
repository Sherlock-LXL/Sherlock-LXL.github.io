# XiangMeta World Module Contract v1

后续开发入口：先读本文件，再参考 `modules/weiming/scene.ts` 和 `shared/schema.mjs`。项目继续使用现有 `modules/`，原 AI 仓库、权重与 Python 环境保持独立。

## 新增一个项目

```powershell
npm.cmd run module:new -- music-ai ai-mountain --scene
```

不需要自定义模型时省略 `--scene`。生成器拒绝覆盖已有目录。目录名必须与 manifest 的 id 一致。

```text
modules/music-ai/
  manifest.json       内容、位置、能力、记忆与关联
  scene.ts            可选，构建时自动发现的 Three.js 场景
  interactions.ts     可选，本地参观/交互生命周期
  assets/             本模块的图片、GLB、音频、视频
  worker.py           可选，独立模型适配器
  region.json         可选，声明一个新区域
```

1. 编辑清单的标题、所属区域、位置、事实、媒体和输入字段。
2. 声明 `world` 数据；需要特有建筑时编辑生成的 scene.ts。
3. 模型只通过 worker 和本机 `data/local.json` 接入，详见 [推理协议](modules.md)。不要把原项目复制进来。
4. 执行 `npm.cmd test`、`npm.cmd run build`，重启服务；清单在启动时加载，自定义 TypeScript 在构建时编译。
5. 进世界检查入口、F 工作台、R 记忆、碰撞、跳跃、昼夜和摄影模式，再构建 EXE。

## 清单与自动注册

根清单继续使用 `schemaVersion: 1`；原有模块无需迁移。以下 `world` 对象是可选扩展，字段由 `shared/schema.mjs` 校验：

```json
{
  "version": 1,
  "capabilities": ["generation", "listening"],
  "ambience": "stage",
  "audio": "/assets/modules/music-ai/ambient.ogg",
  "fragments": [{
    "id": "first-experiment",
    "title": "从一个声音开始",
    "body": "在这里填写经过确认的项目经历。",
    "position": [4, 7],
    "growth": {"order": 60, "label": "06 / 声音与生成"}
  }],
  "connections": [{
    "target": "xianglm",
    "title": "另一种序列",
    "body": "说明两个项目之间经过确认的概念联系。"
  }]
}
```

示例 audio 只在提供了相应文件时添加。能力枚举：`conversation`、`vision`、`generation`、`recommendation`、`simulation`、`gallery`、`listening`。它们描述已有能力，不会自动生成模型。`gallery` 启用图片的沉浸观看；带 runtime 的 conversation 模块自动成为聊天入口。

| 输入 | 自动得到的世界功能 |
|---|---|
| 根清单 id / title / region / position / visual | 建筑、标签、地图索引、区域导航、传送、F 产品终端、收藏 |
| interface + runtime | 输入校验、产品 UI、统一 invoke API；公开 catalog.tools 描述，不暴露本机路径 |
| world.fragments | R 记忆标记、星图、发现进度和本机保存 |
| fragment.growth | 按 order 排列的成长路线；同一区域内生成避开障碍的金色步道 |
| world.connections | 项目关联卡片与目的地传送；无效目标隔离并给出 catalog warning |
| world.ambience | tokens / fireflies / bubbles / resonance / stage 五种轻量氛围 |
| world.audio | 区域环境音，靠近该模块时优先播放，1.2 秒淡入淡出 |
| facts / story / fragments / connections | 资料向导检索；真实模型回答仍由独立入口提供 |

无需另写重复的 `ai_tools` 表：`GET /api/catalog` 的 tools 从 runtime 和 interface 生成 `{id,title,endpoint,capabilities,fields}`，调用入口为 `POST /api/modules/<id>/invoke`。这只是可调用能力描述，当前没有自主执行外部任务的 Agent。

记忆 ID 保存为 `<module-id>--<fragment-id>`，已发布后保持稳定。删除模块会隐藏内容但保留旧存档，以便重新安装后恢复。标题调整不改变收集记录。fragment.position 相对**区域中心**，不是相对建筑，单轴范围 ±40；建筑 position 范围 ±40，必须结合区域实际半径安排。每模块最多 24 段记忆、12 条关联。

成长顺序是策展顺序，不自动代表履历时间线。不要虚构论文、实习、日期、训练里程碑或摄影原图与训练集的对应关系。新增事实应由本人确认或已有项目档案支持。

## 场景接口

完整类型在 `src/world/module-contract.ts`。模块 default export 满足 `SceneFactory`：

```ts
import * as T from 'three';
import type {SceneFactory} from '../../src/world/module-contract';

export default {
  version: 1,
  create({module, region, invoke}) {
    const root = new T.Group();
    const orb = new T.Mesh(
      new T.IcosahedronGeometry(.55, 1),
      new T.MeshStandardMaterial({color: region.color, roughness: .6})
    );
    orb.position.y = 1.6;
    root.add(orb);
    return {
      root,
      colliders: [{x: 0, z: 0, radius: .6, height: 2.2}],
      update(dt, hour) { orb.rotation.y += dt * .2; }
    };
  }
} satisfies SceneFactory;
```

- root 使用局部坐标，Y 朝上，地面为 0。核心把它放到区域中心 + manifest.position，并按共享地形高度抬升。
- 优先级：scene.ts → visualAsset GLB → visual 预设。实例创建失败会退回预设；语法或导入错误必须在构建时修正。
- colliders 使用**建筑局部坐标**，支持圆形 radius 或矩形 halfX / halfZ 及高度 height。省略时保留 visual 预设碰撞；空数组表示无阻挡。height 表示自地面起算的阻挡高度，低地台按统一角色规则迈上或跳上；参考 `src/world/colliders.ts` 的实际形状。
- `update(dt, hour)` 接收世界动画增量和 0～24 小时。摄影模式 dt 为 0，禁止另开 requestAnimationFrame 或直接依赖墙钟，否则无法暂停。动画回调报错后只停用该回调。
- `dispose()` 清理自行创建的监听器、定时器及不在 root 下的资源；root 下的几何、材质和纹理由核心释放。
- 静态物体尽量共用材质，调用 `batchStatic(root)` 合并；先合批再添加动态物体，或按合批工具的约定标记动画对象。把返回的清理函数接入 dispose。自定义场景不会被核心再次合批。
- 夜灯优先使用 emissive 材质与 `nightGlow`，避免为每盏灯增加 PointLight。真实范例 `modules/weiming/scene.ts` 包含静态舞台、海报和昼夜变化的柔光。

`interactions.ts` default export 满足 `InteractionFactory`：`{version:1, create(context){ return {onVisit(){}, onInteract(){}, dispose(){}}; }}`。onVisit 在使用展品传送时触发，onInteract 在 F 打开产品时触发；不代表任意步行接近。context 提供 module、region 与 `invoke(input, signal?)`。异步任务由模块管理 AbortController，并在适当时机取消。

这些源码扩展属于受信任的本地构建输入，不是从网络清单下载并执行的脚本。新项目复用契约不改核心；全新输入类型或生命周期仍需增加通用契约并做兼容性验证。

## 资源与区域

`modules/<id>/assets/cover.webp` 的 URL 是 `/assets/modules/<id>/cover.webp`。网关只允许图片、GLB、音频、视频和 woff2 文件，真实路径必须留在该模块 assets 内；不提供 TS、JS、worker 或清单下载。推荐 GLB 自包含纹理。旧的 `public/assets/...` 引用继续有效。

新大陆可在模块目录添加 `region.json`：

```json
{
  "id": "robot-island",
  "title": "机器人岛",
  "english": "ROBOT ISLAND",
  "description": "一个新的研究空间",
  "color": "#bbd8cf",
  "position": [70, 70],
  "radius": 17,
  "scenery": "laboratory"
}
```

同一 region ID 只能声明一次。新区域自动生成岛屿、中央连接步道与导航；当前位置需要人工检查，不能与其他岛、远景建筑或步道重叠。大规模扩张仍需分区加载和通用镜头边界适配。当前远处机器人、研究院和城市只是未开放的场景点缀。

## 交给未来开发者的简短指令

> 按 docs/world-module-contract.md 的 XiangMeta World Module Contract v1 加入 MusicAI。先运行模块生成器，所有项目内容放在 modules/music-ai，必要推理权重与代码副本放在 runtime/models/music-ai。复用自动注册的地图、F 工作台、R 记忆、星图和模型调用；不要复制完整训练仓库，不要编造个人经历。参考 modules/weiming/scene.ts 处理合批与昼夜，验证行走碰撞、摄影暂停、资源释放和新增渲染开销。交付构建结果及素材缺口。


## v0.8 可选山地与出生点

region 可声明 `spawn: [x,z]`，默认仍为 `[0,10]`。新增 `terrain: {kind:"mountain", height:14, terraces:[{center:[8,12],height:1,radius:7}], shortcuts:[{title:"视觉捷径",points:[[x,z],[x,z]]}]}`。完整实用示例见 `data/world.json` 的 AI 山脉。山体沿局部负 Z 方向抬升，台地用平缓过渡连接；应给每座建筑及前方终端留出平坦区域。

地形渲染、角色地面、传送、展品位置、记忆和氛围共同读取 `shared/terrain-height.mjs`。场景根节点与 colliders 仍提供局部坐标和局部阻挡高度，由核心加上地形标高。物理只支持地面至顶面的实心阻挡，尚无洞穴、桥下通行或多层室内。

成长路径在山地中生成贴地步道与柔光路灯，shortcuts 使用同一导航网格寻路。修改地形后必须验证上坡、下坡、跳跃、碰撞与路线长度；能找到二维路径不等于一定能走过陡坡，参考 `tests/mountain-world.mjs` 的实际角色积分测试。远景概念岛由 `src/world/future-landmarks.ts` 提供建模，`src/world/horizons.ts` 提供地点说明和远眺镜头；它们未注册为可步行区域或可调用 AI 能力。

## v0.9 可选山地花园路线

在 `terrain` 内添加 `route: {width:3.2, points:[[x,z,height], ...]}`。点为区域局部坐标，至少两个、不超过 32 个，路宽 2.5–5 米。相邻点不能重合；按从山脚到山顶的顺序绘制。`shortcuts[]` 可额外声明同样格式的 `profile`，生成 1.9 米宽的圆滑蓝色捷径；保留 `points` 兼容原有配置。

启用 route 后，主路和捷径按设计曲线生成，不再用 A* 网格决定铺装外形。每个 terrace 的前方 `center.z + 6.6` 自动生成半径 3.35 米的平整驿站，注意给新建筑和 F 控制台留空间。护栏、入口开口、花带与石砌侧墙由 `garden-routes.ts` 自动生成。地表会在驿站处平整，因此这里的实际高度可以偏离曲线的过渡高度。

共享 `surfaceMaterial(color, roughness, metalness, finish)` 支持 plaster、stone、wood、metal、grass、paving、foliage。优先复用共享纹理与实例花簇，不为每株植物创建独立材质。细护栏碰撞可使用 `segment:[ax,az,bx,bz]` 配合 radius 和全局顶高；两端与 height 需要处于同一坐标系。修改路线后执行 garden-route 单元测试与 mountain-world 的双向实际步行验证，检查平台入口与截图。

## v0.10 四季与媒体

region 可配置 `season: "spring" | "summer" | "autumn" | "winter"`，由通用季节布景处理材质、植被和氛围。入口、主路、展品及现有障碍附近留空；新区域仍应检查荷塘等较大布景的位置与半径。

图片 media 除 src 外可提供 `thumbnail`、`width`、`height`。画框按比例容纳图片，完整图用于沉浸观看。仅声明展示图片，不把本机 Pictures 原路径暴露为媒体 URL。

世界音频清单支持 `playlist: [{id,title,src}]` 和 `seasonal: {regionId:{id,title,src}}`。只把适合作为展品的作品加入模块 media；世界背景曲不必成为音乐馆展品。季节曲 id 是首演记录的键，替换为新作品时更换 id。v0.12 起以 sessionStorage 中的当前旅程记录去重：成功播放前不消耗首演，普通区域进出和刷新不清空记录，新应用窗口开启新旅程。春季尚无曲目时不配置 seasonal 条目，自动回退到伴奏轮播。

## v0.11 可选展览字段

`wayfinding: {title, subtitle}` 为实体终端提供简洁标牌；完整 `title / description / story` 继续用于产品界面。第一人称只显示实体标牌，总览保留可点击地图标签。

`albums: [{id, order, title, cover, credit, tracks: [{id, title, src, lyrics}]}]` 自动启用专辑选择、试听与歌词阅读。资产路径使用现有 `/assets/modules/<id>/...` 规则。专辑按 `order` 排序；保留真实归属与原文署名。参考 `modules/personal-music/manifest.json`。

区域可声明 `arrivalPath: [[x,z], ...]`，坐标相对岛心；连接实际桥头与 `[0,7]` 前庭。`shared/region-routes.mjs` 同时提供地面绘制和装饰避让，避免再次单独硬编码入口。自定义建筑需提供本地碰撞，并检查整条路线双向步行。

## v0.12 布局与本地流式模型

模块可声明 `rotation: 0 | 90 | 180 | 270`，单位为度，绕局部 Y 轴旋转整个展品。scene factory 的 root、colliders、grounds 继续输出局部坐标，核心统一转换；不要在 factory 里再旋转一次。`shared/exhibit-layout.mjs` 的 exhibitPoint / exhibitLocal 用于路径和装饰避让，placedCollider 同时旋转矩形半轴和线段。world.fragments 的 position 仍是区域局部坐标，旋转展馆不会移动已收藏的记忆位置。

region 可声明 `forecourt: [x,z]`，默认 `[0,7]`；arrivalPath 接到该前庭。spawn 是区域的进入点，建议前庭与桥头连通。终端和传送朝向根据模块 rotation 自动计算。调整旋转后运行 `tests/refinement-v11.mjs` 检查主路和支路双向实走，并检查门口视图。

模型数据放入 `runtime/models/<id>`，只复制推理必要文件。runtime.requires 相对该目录声明；模块 worker 保留在 modules 内。data/local.json 的 root 相对配置文件所在目录解析，python 和 sources 再相对 root 解析，避免写入机器特有的原仓库路径。

Python 标准输出每行协议：`XIANGMETA_TOKEN:` 后接 JSON `{ "text": "新增片段" }` 并 flush；最终 `XIANGMETA_RESULT:` 后接正常结果 JSON。不得把 prompt、日志或累计全文误当新增片段发送。UTF-8 的未完成字节需等待解码完整。其他日志仍可输出，网关限量收集。

HTTP POST `/api/modules/<id>/invoke` 在 Accept 包含 `application/x-ndjson` 时返回逐行 status、token、done/error 事件；否则仍返回原 JSON。token 的 text 是增量，done.result 为完整结果。校验发生在开始流之前；取消、断开、超时都会停止 Python 并释放单任务槽。前端 invoke 的可选 onToken 回调直接更新结果栏。


## v0.13 独立作品与天气

Scene factory 可返回 `artworks: [{id, label, position:[x,z], approach:[x,z], action}]`，两种动作分别为 `{kind:"album",id:"album-01"}` 和 `{kind:"photo",index:0}`。所有坐标相对建筑根节点，核心自动应用 rotation 和区域平移。照片 index 对应模块 image 媒体的排列，专辑 id 对应 albums。参考两个展廊 scene.ts；新增作品不必给核心增加模块名称判断。

观看位置需处在画面正前方且能实际站立，和墙面距离建议约 1.3 米。F 交互同时校验距离、所在墙面的正反面和观看位置；转角不能只比较到画框的距离。用实际碰撞步行检查所有作品的 approach，确保桌椅没有占据观看路线。media 的可选 location 字段用于“拍摄于 …”，title 仅保留作品名。

`WeatherCycle` 采用完整当前权重作为每次过渡起点。不要在重定向天气时先切成上个预设，不要通过瞬间增加/减少粒子造成跳变。自动选择、手动选择和摄影暂停共享这一状态机；雨雪使用全局有限数量粒子，世界扩展不按展品数叠加天气对象。

## v0.17 区域小互动

区域的旧 `discovery` 继续保留原收藏 ID；额外装置放在 `discoveries[]`，每项必须有区域内稳定且唯一的 `id`，收藏键自动组合为区域 ID 与装置 ID。字段包括 `kind / title / action / description / position`，`position` 是区域局部 X/Z；可选 `scale` 为 0.55–1，默认 1。渲染、地面高度和碰撞共同应用缩放。已有收藏迁移时不要更改 ID。

可复用的装置类型为 butterflies、bubbles、prism、chimes、bloom、orrery、leaves、tides、tokenloom、cloudbell、snowglobe、pendulum、kaleidoscope、vinyl、shell、lighthouse。只增加这些种类的实例时，修改区域数据即可；新增种类的几何与动画可参考 `src/world/pocket-wonders.ts`，同时扩展 schema 的 kind 枚举。运动部件必须标记 dynamic，避免静态合批后失去动画。

装置不附加文字展牌，使用粒子提示和靠近后的 R 名称提示。规划位置时同时避开工作台、独立作品、碎片、道路、路灯与其它装置，并验证实际步行可达；二维坐标没有重叠不代表能走过陡坡。参考 `tests/wonders-v17.mjs` 验证触发、持久化与入口路线。变速循环用累计相位，避免直接将全局时间乘以变化中的速度。

## v0.18 局部入口留白

山地区域可提供 `terrain.arrivalCourt: {center:[x,z],radius,height}`。这是局部圆形前庭的底层高度建议，半径 1–5 m，高度 0–3 m，边缘以 1.5 m 过渡；道路、驿站与建筑基础仍优先保留自己的高度。用于轻量整理坡肩，不用于重建整座山。改变配置后检查整个入口宽度、碎片基座、双向行走和上山路线。

`gardenAccents` 在展品和互动布置后挑选低矮装饰点，额外接收碎片和作品观看点等保护坐标。没有满足净空与坡度条件的位置就减少数量，不强行填满；可复用共享材质和静态合批。三维文字使用 `scenery.sign` 统一清晰度，不为新展品另写小字号画布。
