"""导出已有模型供静态浏览器推理。

需要 NumPy、PyTorch、torchvision、ONNX 与 onnxruntime。
仓库参数指向作者的原项目。
"""

import argparse
import hashlib
import importlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys
import types

import numpy as np
import onnx
import onnxruntime as ort
import torch
from PIL import Image, ImageOps
from torchvision import transforms

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public/assets/ai-lab"
ORIGINALS = ROOT / "scripts/ai-lab-originals"


def digest(file):
    return hashlib.sha256(Path(file).read_bytes()).hexdigest()


def write_json(file, value):
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def source_package(name, root):
    package = types.ModuleType(name)
    package.__path__ = [str(root / "src")]
    sys.modules[name] = package
    return importlib.import_module(name + ".model")


def provenance(project, root, files):
    target = ORIGINALS / project
    target.mkdir(parents=True, exist_ok=True)
    for name in [
        "src/model.py",
        "src/config.py",
        "src/ui.py",
        "app.py",
        "LICENSE",
        "MODEL_AND_DATA_NOTICE.md",
    ]:
        source = root / name
        if source.exists():
            shutil.copyfile(source, target / Path(name).name)
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    return {
        "repository": f"https://github.com/Sherlock-LXL/{project}",
        "commit": commit,
        "files": [
            {
                "name": str(Path(file).relative_to(root))
                if Path(file).is_relative_to(root)
                else Path(file).name,
                "bytes": Path(file).stat().st_size,
                "sha256": digest(file),
            }
            for file in files
        ],
    }


def resources(folder):
    return [
        {
            "path": "/assets/ai-lab/" + str(file.relative_to(PUBLIC)),
            "bytes": file.stat().st_size,
            "sha256": digest(file),
        }
        for file in sorted(folder.iterdir())
        if file.is_file()
    ]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--gift", type=Path, required=True)
    parser.add_argument("--expression", type=Path, required=True)
    parser.add_argument("--poetry", type=Path, required=True)
    parser.add_argument("--poetry-checkpoint", type=Path)
    args = parser.parse_args()
    gift_root, expression_root, poetry_root = [
        p.resolve() for p in [args.gift, args.expression, args.poetry]
    ]
    torch.set_num_threads(2)
    projects = []
    baseline = {
        "frameworks": {
            "torch": torch.__version__,
            "onnx": onnx.__version__,
            "onnxruntime": ort.__version__,
        },
        "gift": [],
        "expression": {},
        "poetry": {},
    }

    gift = source_package("gift_original", gift_root)
    gift_checkpoint = gift_root / "models/final_model.npz"
    parameters = gift.load_model(gift_checkpoint)
    gift_folder = PUBLIC / "gift-v1"
    feature_order = [
        "interest_match",
        "need_utility",
        "emotional_personalization",
        "aesthetic_confidence",
        "selection_safety",
        "storage_friendliness",
        "value_fit",
        "cat_jewelry_accessories",
        "cat_fandom_collectibles",
        "cat_books_stationery",
        "cat_electronics_imaging",
        "cat_beauty_fragrance",
        "cat_bags_clothing",
        "cat_daily_life",
    ]
    write_json(
        gift_folder / "model.json",
        {
            "format": "gift-chooser-mlp-v1",
            "featureOrder": feature_order,
            **{key: value.tolist() for key, value in parameters.items()},
        },
    )
    for scores, category in [
        ([7] * 7, 2),
        ([9, 8, 7.5, 6, 9, 7, 8], 0),
        ([0] * 7, 6),
        ([10] * 7, 3),
    ]:
        vector = [value / 10 for value in scores] + [int(i == category) for i in range(7)]
        raw = float(gift.predict(np.array([vector]), parameters)[0, 0])
        baseline["gift"].append(
            {
                "scores": scores,
                "category": category,
                "raw": raw,
                "score": float(np.clip(raw, 0, 1) * 10),
            }
        )
    projects.append(
        {
            "id": "gift-chooser",
            "moduleId": "recommendation",
            "version": "original-f64-v1",
            "precision": "float64",
            "parameters": sum(p.size for p in parameters.values()),
            "source": provenance(
                "gift-chooser", gift_root, [gift_root / "src/model.py", gift_checkpoint]
            ),
            "resources": resources(gift_folder),
        }
    )

    cnn = source_package("expression_original", expression_root)
    cnn_config = importlib.import_module("expression_original.config")
    labels = cnn_config.CLASS_NAMES
    checkpoints = [expression_root / f"checkpoints/best_model_res_{i}.pth" for i in range(1, 4)]

    class Ensemble(torch.nn.Module):
        def __init__(self):
            super().__init__()
            self.models = torch.nn.ModuleList()
            for file in checkpoints:
                model = cnn.NeuralNetwork()
                model.load_state_dict(torch.load(file, map_location="cpu", weights_only=True))
                self.models.append(model.eval())

        def forward(self, image):
            return sum(torch.softmax(model(image), dim=1) for model in self.models) / 3

    ensemble = Ensemble().eval()
    image_file = ROOT / "tests/fixtures/model-inputs/expression.jpg"
    image = ImageOps.exif_transpose(Image.open(image_file)).convert("RGB")
    transform = transforms.Compose(
        [transforms.Grayscale(1), transforms.Resize((48, 48)), transforms.ToTensor()]
    )
    image_tensor = transform(image).unsqueeze(0)
    cnn_folder = PUBLIC / "expression-v3"
    cnn_folder.mkdir(parents=True, exist_ok=True)
    cnn_file = cnn_folder / "ensemble.onnx"
    with torch.inference_mode():
        expected = ensemble(image_tensor).numpy()
        torch.onnx.export(
            ensemble,
            image_tensor,
            str(cnn_file),
            input_names=["image"],
            output_names=["probabilities"],
            opset_version=17,
            dynamo=False,
        )
    session = ort.InferenceSession(str(cnn_file), providers=["CPUExecutionProvider"])
    actual = session.run(None, {"image": image_tensor.numpy()})[0]
    error = float(np.max(np.abs(actual - expected)))
    assert error < 1e-5, f"CNN export mismatch: {error}"
    baseline["expression"] = {
        "image": "tests/fixtures/model-inputs/expression.jpg",
        "sha256": digest(image_file),
        "input": image_tensor.flatten().tolist(),
        "probabilities": expected[0].tolist(),
        "labels": labels,
        "onnxMaxError": error,
    }
    projects.append(
        {
            "id": "expression-recognition-cnn",
            "moduleId": "emotion-recognition",
            "version": "residual-ensemble-v3-f32",
            "precision": "float32",
            "parameters": sum(p.numel() for p in ensemble.parameters()),
            "inputShape": [1, 1, 48, 48],
            "labels": labels,
            "source": provenance(
                "expression-recognition-cnn",
                expression_root,
                [expression_root / "src/model.py", expression_root / "src/config.py", *checkpoints],
            ),
            "resources": resources(cnn_folder),
        }
    )

    poetry = source_package("poetry_original", poetry_root)
    checkpoint = (
        args.poetry_checkpoint or poetry_root / "checkpoints/best_finetuned_model.pth"
    ).resolve()
    vocab_file = poetry_root / "data/processed/vocab_benchmark.json"
    vocab = json.loads(vocab_file.read_text(encoding="utf-8"))
    assert len(vocab) == 5160 and sorted(vocab.values()) == list(range(5160))
    model = poetry.PoetryLSTM(
        vocab_size=len(vocab), embedding_dim=1536, hidden_size=1536, num_layers=1, dropout=0.1
    )
    model.load_state_dict(torch.load(checkpoint, map_location="cpu", weights_only=True))
    model.eval()

    class PoetryStep(torch.nn.Module):
        def __init__(self):
            super().__init__()
            self.original = model

        def forward(self, token, hidden, cell):
            logits, (next_hidden, next_cell) = self.original(token, (hidden, cell))
            return logits[:, -1], next_hidden, next_cell

    step = PoetryStep().eval()
    verse_folder = PUBLIC / "verse-v1"
    verse_folder.mkdir(parents=True, exist_ok=True)
    graph_file = verse_folder / "step.onnx"
    raw_export = graph_file.with_suffix(".temporary.onnx")
    token = torch.tensor([[vocab["<BOS>"]]], dtype=torch.int64)
    hidden, cell = torch.zeros(1, 1, 1536), torch.zeros(1, 1, 1536)
    with torch.inference_mode():
        torch.onnx.export(
            step,
            (token, hidden, cell),
            str(raw_export),
            input_names=["token", "hidden", "cell"],
            output_names=["logits", "next_hidden", "next_cell"],
            opset_version=17,
            dynamo=False,
        )
    graph = onnx.load(str(raw_export))
    onnx.external_data_helper.convert_model_to_external_data(
        graph, all_tensors_to_one_file=False, size_threshold=1024
    )
    for i, tensor in enumerate(graph.graph.initializer):
        if tensor.data_location == onnx.TensorProto.EXTERNAL:
            onnx.external_data_helper.set_external_data(tensor, location=f"weights-{i:02d}.bin")
    # ONNX 会向已有文件追加外部张量，清理本脚本生成的分片
    # 以保证重复导出得到相同字节。
    for file in verse_folder.glob("weights-*.bin"):
        file.unlink()
    onnx.save_model(graph, str(graph_file))
    raw_export.unlink()
    shutil.copyfile(vocab_file, verse_folder / "vocab.json")
    onnx.checker.check_model(str(graph_file))
    session = ort.InferenceSession(str(graph_file), providers=["CPUExecutionProvider"])
    states = []
    h, c = np.zeros((1, 1, 1536), np.float32), np.zeros((1, 1, 1536), np.float32)
    tokens = [vocab["<BOS>"], vocab["山"], vocab["月"], vocab["春"], vocab["风"]]
    max_error = 0
    with torch.inference_mode():
        for token_id in tokens:
            x = torch.tensor([[token_id]])
            logits, hidden, cell = step(x, hidden, cell)
            actual, h, c = session.run(None, {"token": x.numpy(), "hidden": h, "cell": c})
            max_error = max(
                max_error,
                float(np.max(np.abs(actual - logits.numpy()))),
                float(np.max(np.abs(h - hidden.numpy()))),
                float(np.max(np.abs(c - cell.numpy()))),
            )
            states.append(
                {
                    "token": token_id,
                    "logits": logits.flatten().tolist(),
                    "hidden": hidden.flatten().tolist(),
                    "cell": cell.flatten().tolist(),
                }
            )
    assert max_error < 1e-4, f"Poetry state export mismatch: {max_error}"
    baseline["poetry"] = {
        "tokens": tokens,
        "steps": states,
        "onnxMaxError": max_error,
        "vocabularySize": len(vocab),
        "hiddenSize": 1536,
    }
    external = [
        item["path"].rsplit("/", 1)[-1]
        for item in resources(verse_folder)
        if item["path"].endswith(".bin")
    ]
    projects.append(
        {
            "id": "blind-verse-rnn",
            "moduleId": "poetry",
            "version": "finetuned-v1-f32",
            "precision": "float32",
            "parameters": sum(p.numel() for p in model.parameters()),
            "vocabularySize": len(vocab),
            "hiddenSize": 1536,
            "externalData": external,
            "source": {
                **provenance(
                    "blind-verse-rnn",
                    poetry_root,
                    [poetry_root / "src/model.py", vocab_file, checkpoint],
                ),
                "checkpointURL": "https://github.com/Sherlock-LXL/blind-verse-rnn/releases/download/v1.0.0/best_finetuned_model.pth",
            },
            "resources": resources(verse_folder),
        }
    )

    for project in projects:
        assert all(r["bytes"] < 90 * 1024 * 1024 for r in project["resources"])
    write_json(
        ROOT / "data/ai-lab-models.json",
        {"version": 1, "runtimeVersion": "1.23.2", "projects": projects},
    )
    write_json(ROOT / "tests/fixtures/ai-lab/baseline.json", baseline)
    print(
        json.dumps(
            {
                "projects": [
                    {
                        "id": p["id"],
                        "parameters": p["parameters"],
                        "bytes": sum(r["bytes"] for r in p["resources"]),
                    }
                    for p in projects
                ],
                "cnnMaxError": error,
                "poetryMaxError": max_error,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
