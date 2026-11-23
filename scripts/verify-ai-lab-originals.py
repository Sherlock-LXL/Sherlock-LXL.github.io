"""使用原项目生成图像与解码回归结果。"""

import argparse
import ast
import importlib.util
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps
import torch

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--poetry-app", type=Path, required=True)
parser.add_argument("--checkpoint", type=Path, required=True)
args = parser.parse_args()
folder = ROOT / "tests/fixtures/ai-lab"
baseline = json.loads((folder / "baseline.json").read_text())
image = ImageOps.exif_transpose(Image.open(ROOT / baseline["expression"]["image"])).convert("RGB")
image.save(folder / "expression-rgb.png")
(folder / "expression-rgba.bin").write_bytes(np.array(image.convert("RGBA")).tobytes())
baseline["expression"]["width"], baseline["expression"]["height"] = image.size

spec = importlib.util.spec_from_file_location(
    "original_poetry", ROOT / "scripts/ai-lab-originals/blind-verse-rnn/model.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
vocab = json.loads((ROOT / "public/assets/ai-lab/verse-v1/vocab.json").read_text())
torch.set_num_threads(2)
model = module.PoetryLSTM(len(vocab), 1536, 1536, 1, 0.1)
model.load_state_dict(torch.load(args.checkpoint, map_location="cpu", weights_only=True))
model.eval()
scope = {
    "torch": torch,
    "model": model,
    "device": torch.device("cpu"),
    "char_to_idx": vocab,
    "idx_to_char": {i: char for char, i in vocab.items()},
    "vocab_size": len(vocab),
    **{key + "_id": vocab[f"<{key.upper()}>"] for key in ["pad", "bos", "eos", "unk"]},
}
names = {"GENERATION_MODES", "MAX_LENGTH", "MAX_PREFIX_LENGTH", "MAX_CONTINUATION_LENGTH"}
functions = {"sample_next_token", "generate_line", "generate_blind_verse", "continue_text"}
tree = ast.parse(args.poetry_app.read_text(encoding="utf-8"))
nodes = [
    node
    for node in tree.body
    if (
        isinstance(node, ast.Assign)
        and any(isinstance(t, ast.Name) and t.id in names for t in node.targets)
    )
    or (isinstance(node, ast.FunctionDef) and node.name in functions)
]
exec(compile(ast.Module(body=nodes, type_ignores=[]), str(args.poetry_app), "exec"), scope)

# 使用原 top-k、softmax 与生成函数，仅替换分类采样
# 为可移植均匀随机流，便于比较 JS 与 torch。
state = 0


def categorical(probabilities, num_samples):
    global state
    assert num_samples == 1
    state = (1664525 * state + 1013904223) & 0xFFFFFFFF
    threshold = state / 4294967296
    for index, probability in enumerate(probabilities.tolist()):
        threshold -= probability
        if threshold < 0:
            return torch.tensor([index])
    return torch.tensor([len(probabilities) - 1])


original_multinomial = torch.multinomial
original_sample = scope["sample_next_token"]
recorded = []


def record_sample(*values, **kwargs):
    token = original_sample(*values, **kwargs)
    recorded.append(token)
    return token


scope["sample_next_token"] = record_sample
torch.multinomial = categorical
evidence = []
try:
    for mode, prefix in [(0, ""), (1, "山月"), (2, "")]:
        seed = 20261123
        state = seed
        settings = list(scope["GENERATION_MODES"].values())[mode]
        lines, tokens = [], []
        for _ in range(1 if prefix else 2):
            recorded = []
            line = (
                scope["continue_text"](prefix, settings["temperature"], settings["top_k"])
                if prefix
                else scope["generate_line"](settings["temperature"], settings["top_k"])
            )
            lines.append(line)
            tokens.append(recorded[:])
        evidence.append(
            {"seed": seed, "mode": mode, "prefix": prefix, "lines": lines, "tokenIds": tokens}
        )
finally:
    torch.multinomial = original_multinomial
baseline["poetry"]["generation"] = evidence
baseline["poetry"]["samplingNote"] = (
    "Original app functions, with torch.multinomial replaced only by LCG1664525/1013904223 cumulative categorical sampling."
)
(folder / "baseline.json").write_text(json.dumps(baseline, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(evidence, ensure_ascii=False, indent=2))
