# 目录维护规则

按“当前源码、运行资源、素材原稿、历史文档、临时产物”整理，当前正式成品为 1.0.0，开发环境与成品运行环境分别独立保留。

## 保留位置

- 当前配置仅放 `data/`；素材来源、转换哈希等维护台账放 `asset-sources/metadata/`。台账里的原始外部地址用于溯源，不参与运行时读取。
- 展示文件随项目放在 `modules/<id>/assets/`，音频 MP3、照片及封面 WebP、视频 MP4；两份论文原稿在 `asset-sources/research/`，原始 WAV 存档在 `asset-sources/audio-wav/`。
- 原稿与标准化展示文件不是完全相同的内容，保留原稿便于以后重新导出。不会清理用户 Pictures、Downloads、Programme 等项目外目录。
- `runtime/` 服务于源码开发；`build/XiangMeta-<版本>/runtime/` 服务于可独立移动的成品。这两份有意分开，不能只因内容相似就删除其中一份。
- `node_modules/` 保留，让本机能继续迭代；`dist/` 保留，让生产网页可以直接启动。
- 版本更新放 `docs/releases/<版本>/README.md`；旧说明中引用的旧截图和旧成品路径仅是历史记录。
- 维护脚本见 `scripts/README.md`。新素材导入需要明确提供来源目录，不再默认读取原来机器上的固定 Pictures 路径。

## 可再生成的文件

`build/staging/` 是 EXE 与解包目录的临时输出；验证并归档完整成品后可以清理。浏览器测试产生的失败截图、调试输出及独立测试配置目录可以清理，保留需要的当前验收报告即可。测试源码即使文件名带旧版号，仍可能验证当前共享规则，因此本轮保留。

不要清理 Windows 用户的 XiangMeta 收藏和设置。本轮删除的 profiles 都是工程 artifacts 内的测试资料，不是用户的正式存档。

## 每次整理前

先归档版本说明，检查 `node scripts/audit-local.mjs`，再确认当前成品完整且旧程序没有占用待删除目录。删除限定在已经核实的项目内路径，避开链接目录；本轮完整清单在 `docs/maintenance/cleanup-plan.json`。
