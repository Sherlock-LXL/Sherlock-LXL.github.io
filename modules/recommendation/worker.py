"""XiangMeta adapter. Loads inference assets from the local model bundle."""
import json
import os
import sys
from pathlib import Path

SOURCE = Path(os.environ["XIANGMETA_SOURCE"]).resolve()
sys.path.insert(0, str(SOURCE))
payload = json.load(sys.stdin)

def respond(text, **extra):
    print("XIANGMETA_RESULT:" + json.dumps({"text": text, **extra}, ensure_ascii=False), flush=True)

import numpy as np
from src.model import load_model, predict

categories = ["首饰配饰", "周边收藏", "书籍文创", "电子影像", "美妆香氛", "包袋服饰", "生活日用"]
features = [float(payload[f"feature-{i}"]) for i in range(7)]
one_hot = [float(i == categories.index(payload["category"])) for i in range(7)]
parameters = load_model(SOURCE / "models/final_model.npz")
score = float(np.clip(predict(np.array([features + one_hot]), parameters)[0, 0], 0, 1) * 10)
respond(f"预测喜欢程度：{score:.2f} / 10\n\n这是现有模型根据输入评分给出的预测，学习的是样本中的评分规则。")
