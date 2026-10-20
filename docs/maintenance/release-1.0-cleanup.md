# 1.0.0 成品整理 · 2026-09-12

在最终 EXE 的完整 Windows 验收通过、SHA256 与验收报告一致后执行清理。

- 删除 v0.19–v0.22 的旧便携成品、staging 重复包、项目内测试 profile、旧截图报告及模型源码缓存。
- 共清理 120 个已核实目标，合计 13,962,004,991 字节（约 13.00 GiB）。详细路径见 `release-1.0-cleanup-plan.json`，执行结果见 `release-1.0-cleanup-result.json`。
- `build/` 仅保留 `XiangMeta-1.0.0/`。源码、开发依赖、素材原稿、当前 dist、独立开发模型和成品模型均保留。
- 历版 README、发布说明及校验值继续保存在 `docs/releases/`；当前验收截图统一到 `artifacts/current/`，通用巡检产物位于其 `world-review/` 子目录。
- 两张模型回归样图固定到 `tests/fixtures/model-inputs/`，模型检查不再需要从外部仓库取图。
- 清理后再次通过模型哈希、开发／便携路径、58 个媒体地址和两份论文的本地依赖检查。未触碰项目外的用户素材、Windows 收藏与设置。

成品 SHA256：`1031bfe14b40cdfdffe2fa799ad55c9295824732759bc735f45142ee90471208`。

## 三处外观定稿后的整理

同版重新封装完成后，再清理本轮 staging 临时副本 1,505,387,446 字节（约 1.40 GiB）。源码目录未发现遗留的 tmp、bak、log 或 pyc 文件；保留有效工具、回归用例、素材、运行环境和历版说明。清理前核对最终 EXE 的 SHA256 一致，清理目标限定为工程内 staging，拒绝符号链接或重解析目录。

最终 EXE SHA256：`8c574afefe915ced78227c567f6b7aa3a5c15ff649b41c53175e449725109397`。执行记录见 `release-1.0-final-polish.json`。本次按要求只做类型检查与构建，不重复功能复核。
