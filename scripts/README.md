# 维护工具

从 XiangMeta 工程根目录运行。Python 工具统一使用 `runtime/python/python.exe`；模型与素材的当前运行路径均在项目内。

| 工具 | 用途 |
|---|---|
| `measure-audio.py` | 测量全部音乐与 MV 音轨，维护响度校准台账，不修改录音 |
| `build-icon.py` | 从八向星芒标志生成多尺寸应用图标 |
| `audit-local.mjs` | 检查开发/便携配置、模型哈希、媒体和论文本地路径 |
| `doctor.mjs` | 检查模块状态和解释器能力 |
| `model-smoke.mjs` | 真实模型调用，可用 `--config=build/XiangMeta-<版本>/local.json` 检查成品环境 |
| `dev.mjs` | 启动前后端开发服务 |
| `new-module.mjs` | 创建新的模块结构 |
| `import-albums.py --source <目录>` | 显式导入新专辑档案；当前专辑不需重新导入 |
| `import-research.py` | 从本地两份论文原稿重新提取方程；`--output <文件>` 可先生成检查稿 |
| `media_import.py` | 音频导入共用函数，调用本地 FFmpeg |
| `normalize-media.py` | 标准化新增 WAV，保留无损原稿与转换记录 |
| `stage-portable.py` | 把 staging 中的成品与本地模型环境整理为独立版本目录 |
| `verify-packed-media.py` | 检查刚生成的 staging 内容与工程媒体是否一致 |

早期一次性脚本 `curate-world-v1.mjs`、`localize-runtime.py`、`import-personal-assets.py` 已完成迁移任务并移除。当前数据、媒体、模型以及早期说明均已归档；不再依靠旧脚本读取固定的外部仓库、缓存环境或旧素材目录。

EXE 回归使用 `tests/portable-regression.mjs`；桌面解包测试和 packed-media 检查需要先生成 staging。视觉截图和当前报告放入 `artifacts/current/`，临时测试 profile 可以放 `artifacts/tmp/`。
