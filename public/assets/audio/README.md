# 音频配置 / Audio configuration

[中文](#中文) · [English](#english)

## 中文

将有使用授权的音频放入本目录，编辑 `/assets/audio/manifest.json`。

| 音轨 | 用途 |
|---|---|
| `ambient` | 环境音 |
| `music` | 背景音乐 |
| `ui` | 界面提示 |
| `interaction` | 展品交互 |

默认清单没有背景音乐，UI 与交互使用低音量合成提示；首次点击声音按钮后创建 AudioContext。区域音乐在 `regions[region-id]` 配置，值为 `/assets/audio/xxx.mp3`。

## English

Place authorized audio in this directory and edit `/assets/audio/manifest.json`.

| Track | Purpose |
|---|---|
| `ambient` | Ambient sound |
| `music` | Background music |
| `ui` | UI feedback |
| `interaction` | Exhibit interactions |

The default manifest has no background music; UI and interaction feedback uses quiet synthesized sounds. AudioContext is created after the first sound-button click. Configure regional music at `regions[region-id]` with a path such as `/assets/audio/xxx.mp3`.
