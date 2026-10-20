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

import base64
import io
from PIL import Image, ImageOps
Image.MAX_IMAGE_PIXELS = 16_000_000
raw = base64.b64decode(payload["image"].split(",", 1)[1], validate=True)
if len(raw) > 5 * 1024 * 1024:
    raise ValueError("图片不能超过 5 MB")
image = Image.open(io.BytesIO(raw))
if image.width * image.height > 16_000_000:
    raise ValueError("图片分辨率过高，请缩小到 1600 万像素以内")
image = ImageOps.exif_transpose(image).convert("RGB")

import torch
from torchvision import transforms
from src.model import NeuralNetwork
from src.config import CLASS_NAMES

device = "cuda" if torch.cuda.is_available() else "cpu"
torch.set_num_threads(min(6, os.cpu_count() or 1))
transform = transforms.Compose([transforms.Grayscale(num_output_channels=1),
    transforms.Resize((48, 48)), transforms.ToTensor()])
tensor = transform(image).unsqueeze(0).to(device)
probabilities = torch.zeros((1, len(CLASS_NAMES)), device=device)
with torch.inference_mode():
    for i in range(1, 4):
        model = NeuralNetwork().to(device)
        model.load_state_dict(torch.load(SOURCE / f"checkpoints/best_model_res_{i}.pth", map_location=device, weights_only=True))
        model.eval()
        probabilities += torch.softmax(model(tensor), dim=1) / 3
        del model
values, indices = probabilities[0].topk(3)
predictions = [{"label": CLASS_NAMES[i.item()], "score": p.item()} for p, i in zip(values, indices)]
respond("\n".join(f'{p["label"]}: {p["score"]:.1%}' for p in predictions) + "\n\n仅描述照片中的表情特征，不代表真实内心状态。", predictions=predictions)
