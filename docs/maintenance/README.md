# 维护记录 / Maintenance records

[中文](#中文) · [English](#english)

## 中文

2026-09-11 的首次清理保留 v0.19.0 成品，移除旧构建、重复运行环境与迁移中间件，目录净减少约 31.51 GiB。

成品 SHA-256：`029375e8687011e86082a6583b741e1227b86a5148a5645d7b5d68b13ce0a1a9`。

50 项测试与构建通过，开发环境调用三个模型、便携环境调用五个模块通过；本轮未测 Windows 物理 Esc。统计口径、删除清单、依赖核查与验收范围见[完整清理记录](cleanup-2026-09-11.md)。后续正式版清理见[1.0.0 记录](release-1.0-cleanup.md)。

## English

The first cleanup on 2026-09-11 retained the v0.19.0 build while removing older builds, duplicate runtimes and migration intermediates. The directory shrank by about 31.51 GiB.

Build SHA-256: `029375e8687011e86082a6583b741e1227b86a5148a5645d7b5d68b13ce0a1a9`.

Fifty tests and the build passed; three models ran in development and five modules in the portable runtime. Physical Windows Esc was not tested in this round. See the [cleanup record](cleanup-2026-09-11.md) for accounting, deletion lists, dependency checks and validation scope, and the [1.0.0 cleanup](release-1.0-cleanup.md) for the later stable release.
