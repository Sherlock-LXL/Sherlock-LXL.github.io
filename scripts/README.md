# 维护工具 / Maintenance tools

[中文](#中文) · [English](#english)

## 中文

从工程根目录运行；Windows 本地 Python 为 `runtime/python/python.exe`，模型与素材路径位于项目内。

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

EXE 回归使用 `tests/portable-regression.mjs`。桌面解包与媒体检查先生成 staging；当前报告放 `artifacts/current/`，临时 profile 放 `artifacts/tmp/`。

## English

Run from the project root. The local Windows interpreter is `runtime/python/python.exe`; model and media paths are inside the project.

| Tool | Purpose |
|---|---|
| `measure-audio.py` | Measure music/MV loudness and maintain calibration records |
| `build-icon.py` | Build app icons from the eight-point emblem |
| `audit-local.mjs` | Check configs, model hashes, media and paper paths |
| `doctor.mjs` | Check module and interpreter availability |
| `model-smoke.mjs` | Run real model inference; --config checks a packaged runtime |
| `dev.mjs` | Start frontend and backend development services |
| `new-module.mjs` | Create a module skeleton |
| `import-albums.py --source <directory>` | Import album archives from an explicit source |
| `import-research.py` | Extract equations from the two local papers; --output selects a draft |
| `media_import.py` | Shared audio import helpers using local FFmpeg |
| `normalize-media.py` | Normalize new WAV copies while retaining lossless originals |
| `stage-portable.py` | Assemble a complete portable release folder |
| `verify-packed-media.py` | Compare staging media with project files |

Use `tests/portable-regression.mjs` for EXE regression. Build staging before unpacking or media checks. Current reports go in `artifacts/current/`, temporary profiles in `artifacts/tmp/`.
