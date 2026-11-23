# 模型回归样图 / Model regression images

[中文](#中文) · [English](#english)

## 中文

样图仅用于推理管线回归。

- `expression.jpg`：来自表情项目 `samples/sample_01.jpg`。
- `cat.jpg`：来自猫咪验证集龟苓膏样图 `v2_cat_093_e392737c1dc79d53__cat_093_000021.jpg`。

`scripts/model-smoke.mjs` 默认使用这两张本地图，也可用对应环境变量指定输入。样图不用于训练或准确率评测。

## English

These fixtures test inference pipelines.

- `expression.jpg`: from the expression project's `samples/sample_01.jpg`.
- `cat.jpg`: the Guilinggao validation image `v2_cat_093_e392737c1dc79d53__cat_093_000021.jpg`.

`scripts/model-smoke.mjs` uses these local images by default; environment variables can select alternatives. They are not training samples or an accuracy benchmark.
