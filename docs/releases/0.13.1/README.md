# XiangMeta 0.13.1 · 运行修复 / Runtime fixes

[中文](#中文) · [English](#english)

## 中文

每次启动使用独立 NSIS 解包目录，修复重复启动后的资源丢失；物理 Esc 松开后重新锁鼠，山路铺装绘入同一曲面。

### 验证

40 项单元测试、真实 Windows Esc 与首次/重复启动/刷新回归通过。electron-builder 26.15.3 使用 unpackDirName: true。

[技术与验收记录](notes.md)保留当时的操作、参数、指标、SHA 和验证范围。旧构建路径仅作历史记录；当前运行方式见[主 README](../../../README.md)。

## English

Used a separate NSIS extraction folder per launch to fix resource loss on repeated launches, restored pointer lock after physical Esc release and painted roads into the terrain.

### Validation

Forty unit tests, real Windows Esc and first/repeated-launch/refresh regression passed. electron-builder 26.15.3 uses unpackDirName: true.

[Technical and validation notes](notes.md) retain the original controls, parameters, metrics, hashes and test scope. Build paths are historical; see the [main README](../../../README.md) for current usage.
