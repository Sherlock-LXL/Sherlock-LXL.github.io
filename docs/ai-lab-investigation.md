# XiangMeta AI Lab：源码与模型调查

## 调查结论

三个原项目的源码、最终权重和必要映射均已找到。浏览器可直接运行原模型，无需 Python 服务、云端 GPU 或远程大模型。统一界面、世界内三处嵌入和静态构建均已完成，Chromium 桌面/移动端及 WebKit 移动布局的真实模型推理已通过。完整验收、截图、使用说明与兼容性边界见 [交付报告](ai-lab-delivery.md)。

| 项目 | 原始算法 | 参数 | 浏览器方案 |
| --- | --- | ---: | --- |
| Gift Chooser | NumPy 手写 `14 → 8 ReLU → 1`，线性输出 | 129 | 原参数 JSON + JavaScript 双精度前向计算 |
| Expression Recognition CNN | 四个残差阶段，三个独立网络 Softmax 概率等权平均 | 每个 453,447，共 1,360,341 | FP32 ONNX + ONNX Runtime Web WASM |
| Blind Verse | 5,160 字符词表；E1536 / H1536 / 单层 LSTM；Embedding 与输出层不共享权重 | 34,743,336 | 原 FP32 参数、单 token ONNX 与显式 h/c 状态 |

## 原始实现与资产来源

### Gift Chooser

源码来自作者仓库版本 `029c186b55120073bc7d34e62bfcca8a34ade63f`，本地位于 `/Users/bytedance/Documents/ByteDance/gift-chooser`。

七项评分除以 10，再拼接固定顺序的七类 one-hot 输入。前向公式为 `ReLU(X @ W1 + b1) @ W2 + b2`。原值不经过 Sigmoid；只在展示时裁剪到 0–1 并乘 10。原 App 还提供评分解释、分数段评语和规则建议，这些说明与网络预测应保持区分。

- `final_model.npz`：1,998 字节。
- SHA256：`b156aca374a911bd9b1594103a633d4da86bdf9f535c700f8e903df129f52380`。
- 这是原仓库随后重新训练的当前版本；与 XiangMeta 历史清单中的旧 NPZ 哈希不同，未混用旧参数。
- 另有 `/Users/bytedance/gift-chooser/gift-lab` 浏览器实现。其神经网络计算已移植，但权重使用密码加密；本次直接采用原项目当前 NPZ，不破解加密文件，也不复用问卷作为模型替代品。
- 训练数据不随 AI Lab 部署；保留原项目的模型与数据用途说明。

### Expression Recognition CNN

源码来自版本 `cfd71e55f49b0df9af7ab283e648a74ff9173910`，本地位于 `/Users/bytedance/Documents/trae_projects/保研ppt/AI_Project_Sources/expression-recognition-cnn`。

原 App 对图片执行 `Grayscale(1) → Resize(48×48) → ToTensor`，没有额外标准化，也没有人脸检测器。三个模型各自输出 Softmax，随后等权平均；不是投票类别，也不是预训练 torchvision ResNet。

标签顺序必须保留为 `angry, disgust, fear, happy, neutral, sad, surprise`。界面可另附中文译名，但索引不能改变。

| 权重 | 字节 | SHA256 |
| --- | ---: | --- |
| `best_model_res_1.pth` | 1,846,197 | `9703be9df90b28457e13aed9455d1593cb6eba4d579e18bec5b3caf5024596ec` |
| `best_model_res_2.pth` | 1,846,197 | `71f302e80d83256ff995044735a4e4a788431c727428aca1ffa45f5bda86bf64` |
| `best_model_res_3.pth` | 1,846,197 | `1add8f94a45e6985e2a7089e9411b776e9b33144957f5fe7713fc8ceb56a1279` |

三份权重均与 XiangMeta 历史清单一致。导出模型包含实际网络和概率平均操作，体积 5,457,394 字节。

### Blind Verse

源码来自版本 `4abc105b799ccdc92efe769ccf555122d2396f7c`，本地位于同一 `AI_Project_Sources` 目录下的 `blind-verse-rnn`。本地源码没有 checkpoint，已从作者的 `v1.0.0` Release 取回：

`https://github.com/Sherlock-LXL/blind-verse-rnn/releases/download/v1.0.0/best_finetuned_model.pth`

- checkpoint：138,976,287 字节；SHA256 `76ba8ffc97af8302d8cec64ffc5b04e2f7934414097935150eca95b399a5d754`。
- 词表：76,300 字节；SHA256 `7a7e3a11df1be662bcdf31e1fc07b5656feb587638fda15d2a0112fa1f09f798`。
- 两者均与 XiangMeta 历史清单一致。

每句从 BOS 和全新的 h/c 开始；B 句不读取 A 句。原 App 双盲生成最多 30 个字符；续写接收 1–3 字前缀，最多追加 20 个字符。采样屏蔽 PAD/BOS/UNK，保留 EOS，并使用三档设置：

| 模式 | Temperature | Top-k |
| --- | ---: | ---: |
| 稳健 | 0.55 | 5 |
| 适中 | 0.70 | 15 |
| 激进 | 0.90 | 30 |

导出没有量化、重训练或替换模型。FP32 外部参数拆成六个 `.bin` 文件，最大 37,748,736 字节；总资源 139,051,579 字节，单文件均低于 GitHub 100 MB 限制。

## 已完成的结果对照

转换环境：Python 3.12.15、NumPy 1.26.4、PyTorch 2.6.0、torchvision 0.21.0、Pillow 11.3.0、ONNX 1.18.0、Python ONNX Runtime 1.22.1。浏览器使用 ONNX Runtime Web 1.23.2，WASM 单线程，无 WebGPU、后端或远程推理请求。

CNN 输入使用已有回归图片 `tests/fixtures/model-inputs/expression.jpg`，原始出处是项目 `samples/sample_01.jpg`。原模型预处理后的 tensor 与七类概率保存在 `tests/fixtures/ai-lab/baseline.json`，仅用于测试，不作为应用输出。

| 对照 | 最大绝对误差 |
| --- | ---: |
| CNN：PyTorch 与 Python ONNX Runtime | 2.980232238769531e-7 |
| CNN：PyTorch 与 Chromium WASM | 2.384185791015625e-7 |
| LSTM：PyTorch 与 Python ONNX Runtime，连续五步 logits / h / c | 6.67572021484375e-6 |
| LSTM：PyTorch 与 Chromium WASM，连续五步 logits / h / c | 5.7220458984375e-6 |

CNN 在 Chromium 中的实际输出按原始标签顺序为：

```json
[0.0079238070, 0.0001209883, 0.0766024217, 0.0303877387,
 0.2225959748, 0.6479622722, 0.0144067788]
```

最大类别为 `sad`。这是一张回归图片的推理结果，不是准确率评估。LSTM 五步输入为 BOS、山、月、春、风；每一步保留完整原始 logits 和 h/c 作为后续浏览器回归基线。

完整浏览器验收在生产构建的静态 HTTP 服务完成。上传 PNG 与原 JPEG 的像素预处理 tensor 均与 Pillow 基线完全一致；实际生成、Worker、三处世界嵌入、摄像头拒绝/停止、重复打开和失败重试均已通过。另已验证 `/nested/ai-lab/` 独立构建路径与 WebKit 推理。耗时只记录本机推理，不代表公网下载速度或实体手机性能；线上状态以交付报告中的发布记录为准。

## 世界接入位置

三个网点均已存在于 AI 山脉：

| 原项目 ID | XiangMeta 模块 ID | 局部坐标 |
| --- | --- | --- |
| `gift-chooser` | `recommendation` | `[8, 12]` |
| `expression-recognition-cnn` | `emotion-recognition` | `[-8, 5]` |
| `blind-verse-rnn` | `poetry` | `[8, -2]` |

`src/core/nearby-actions.ts` 和 `src/main.ts` 中这三个模块的 F/interact 已改为「体验 AI」，使用 `src/core/ai-lab-frame.ts` 的同一个 iframe 打开对应项目。原 `src/core/api.ts` 的历史 Python 调用不参与本次静态体验。项目详情与源码链接继续保留，主页面不导航、不打开新标签；关闭恢复世界控制。其余展项、中央枢纽、四岛及原有功能继续保留。

## 来源

1. [Gift Chooser 原版本源码](https://github.com/Sherlock-LXL/gift-chooser/tree/029c186b55120073bc7d34e62bfcca8a34ade63f)，`src/model.py`、`src/ui.py`、`app.py`、`MODEL_AND_DATA_NOTICE.md`。
2. [Expression Recognition 原版本源码](https://github.com/Sherlock-LXL/expression-recognition-cnn/tree/cfd71e55f49b0df9af7ab283e648a74ff9173910)，`src/model.py`、`src/config.py`、`app.py` 及三份 checkpoint。
3. [Blind Verse 原版本源码](https://github.com/Sherlock-LXL/blind-verse-rnn/tree/4abc105b799ccdc92efe769ccf555122d2396f7c)，`src/model.py`、`app.py`、冻结词表及 `v1.0.0` Release checkpoint。
4. 本项目 `runtime/model-inventory.json`、`modules/*/worker.py`、`scripts/export-ai-lab.py`、`data/ai-lab-models.json` 与 `tests/fixtures/ai-lab/baseline.json`。
