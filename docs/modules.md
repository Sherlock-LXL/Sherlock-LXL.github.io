# 模块开发指南

v0.7 新项目先读 [World Module Contract v1](world-module-contract.md)：自定义场景、模块资源、区域、记忆星图与关联都可以自动注册。

## 最小模块

`npm.cmd run module:new -- new-project ai-mountain` 生成一个目录。模块 ID 采用小写字母开头的字母、数字与连字符，不允许与已有 ID 重复。

```json
{
  "schemaVersion": 1,
  "id": "new-project",
  "title": "新的研究空间",
  "subtitle": "从一个问题开始",
  "region": "ai-mountain",
  "owner": "personal",
  "category": "AI PROJECT",
  "description": "项目介绍",
  "tags": ["Research"],
  "position": [0, 8],
  "visual": "gallery",
  "facts": [{"label": "阶段", "value": "探索中"}],
  "story": [{"title": "起点", "body": "为什么做这件事"}],
  "media": []
}
```

`position` 为所属区域中心的 x/z 相对坐标，单轴范围 -40～40，实际位置仍需位于所属岛屿内。添加后检查展品与步道、树木、其他展品的间距。重启服务会自动生成世界标签、索引、资料页与收藏入口。

`visual` 目前支持 tower、forest、mirror、garden、gift、bubble、light、gallery、music、studio。新项目复用预设即可。特有美术可配置：

```json
"visualAsset": {"src": "/assets/models/new-project.glb", "scale": 1, "rotation": 0}
```

GLB 放进 `public/assets/models/`，原点位于地面，Y 朝上，rotation 单位为弧度。建议自包含纹理、不依赖外部 URL，不使用暂未配置的压缩解码器。模型自带动画会播放。默认沿用 visual 预设的圆形/矩形与高度碰撞；自定义 scene.ts 可返回局部 colliders，需与实际模型一致。

## 增加推理

在清单里增加界面和运行配置：

```json
"interface": {
  "action": "运行模型",
  "fields": [{"key": "prompt", "label": "你的输入", "type": "text", "default": "你好", "max": 500}]
},
"runtime": {
  "kind": "python",
  "sourceKey": "new-project",
  "entry": "worker.py",
  "requires": ["models/best.pt"]
}
```

`data/local.json` 中增加 `sources["new-project"]`，必要时增加 `pythonByModule["new-project"]`。路径不会发送到渲染器，也不会随通用应用打包。

worker 协议：

```python
import json, os, sys
from pathlib import Path
source = Path(os.environ["XIANGMETA_SOURCE"])
sys.path.insert(0, str(source))
request = json.load(sys.stdin)
# 导入原项目的纯推理 API，不导入会启动 GUI 的 app.py
answer = your_inference(request["prompt"])
print("XIANGMETA_RESULT:" + json.dumps({"text": answer}, ensure_ascii=False))
```

响应必须包含字符串 `text`；可附带 `predictions: [{label, score}]`，其中 score 是 0～1 的概率。后端标注 `mode: live`。日志可写 stderr；stdout 中以 `XIANGMETA_RESULT:` 开头的一行作为结构化响应。错误应抛出异常并非零退出，不能用固定假答案代替推理失败。

字段类型：

| type | 约束 |
|---|---|
| text | 非空字符串；max 为字符上限，默认 1000 |
| number | 必须给出 min/max，可给 step/default |
| select | 必须提供非空 options，默认值应在 options 中 |
| image | PNG / JPEG / WebP 的 data URL，文件 <=5 MB；原生图片由 worker 解码并检查像素上限 |

API：

```text
GET  /api/catalog
GET  /api/health
POST /api/modules/<id>/invoke
```

调用必须是 `application/json`。成功返回 `{text, mode:"live"}`。常见状态码：400 无效输入，413 请求过大，429 其他模型正在运行，503 模块未配置，502 推理或依赖失败。取消 HTTP 请求会终止本次 worker。

## 新增区域

可在模块目录添加 `region.json`，也可在 `data/world.json` 的 regions 追加唯一 ID、名称、英文名、颜色、中心坐标和 radius。世界会自动生成岛屿与中央枢纽步道。选择不相交的岛屿位置，避免步道穿过其他展品；当前生成器不会自动规划复杂城市道路。新增模块将 region 指向新 ID。

默认总览镜头适配首批四区。世界规模显著变大时，应实现通用的按区域边界适配镜头和分区加载；无需改动模型 API。

区域可选添加趣味装置，缺省时不创建，也不计入旅行印记：

```json
"discovery": {
  "kind": "butterflies",
  "title": "纸蝶来信",
  "action": "唤起纸蝶",
  "description": "打开书页，看纸蝶从花园升起。",
  "position": [5, 11]
}
```

kind 支持 `butterflies`、`bubbles`、`prism`、`chimes`。坐标相对区域中心，需避开展品、道路家具和边缘；当前每区一座装置，底座半径 1 米，玩家碰撞额外留 0.35 米，R 触发范围 2.8 米。印记保存区域 ID，修改名称或位置不重置已有发现。复用装置不需修改核心代码。

## 替换媒体与音频

图片、音乐、视频放入 `public/assets/`，清单通过 `/assets/...` 引用；只允许本地静态资源，不接受脚本 URI。媒体示例：

```json
"media": [{"kind":"audio", "title":"个人原创作品", "src":"/assets/audio/my-song.mp3"}]
```

全局音频由 `public/assets/audio/manifest.json` 控制。替换资源后重新构建 Windows 包。新增外部网页链接时，还需更新桌面 `setWindowOpenHandler` 的 URL 白名单，这是出站导航权限的显式边界。

## 验收

1. `npm.cmd run doctor` 检查清单、路径与环境。
2. `npm.cmd test` 检查公共契约。
3. 打开世界确认位置、碰撞、面板、关闭/取消生命周期。
4. 使用 `scripts/model-smoke.mjs <id>` 调用真实权重。
5. 只有验证成功才把模型称为可运行；配置了路径不等于已经完成推理。
