# 可替换音频

把授权使用的音频放在此目录，然后编辑 `/assets/audio/manifest.json`。
四条独立音轨：ambient（环境）、music（背景音乐）、ui（界面）、interaction（展品交互）。
默认没有背景音乐；UI 与交互使用低音量合成提示。首次点击声音按钮才创建 AudioContext。
区域音乐使用 regions[region-id]，值为 `/assets/audio/xxx.mp3`。
