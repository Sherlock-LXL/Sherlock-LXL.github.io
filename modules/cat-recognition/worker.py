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

import tempfile
import torch
from torchvision import transforms
torch.set_num_threads(min(6, os.cpu_count() or 1))
device = "cuda" if torch.cuda.is_available() else "cpu"
with tempfile.TemporaryDirectory(prefix="xiangmeta-cat-") as scratch:
    os.environ["YOLO_CONFIG_DIR"] = scratch
    from src.detect_crop import CatCropper
    from src.model import NeuralNetwork
    image_path = Path(scratch) / "input.png"
    image.save(image_path)
    cropper = CatCropper(model_path=str(SOURCE / "models/yolo26s.pt"))
    crops = cropper.crop(image_path)
    if not crops:
        respond("没有检测到猫咪。请尝试一张主体清晰、无遮挡的照片。")
    else:
        if len(crops) > 8:
            crops = crops[:8]
        names = [n.strip() for n in (SOURCE / "classes.txt").read_text(encoding="utf-8").splitlines() if n.strip()]
        transform = transforms.Compose([transforms.ToTensor(), transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])])
        tensor = torch.stack([transform(crop) for crop in crops]).to(device)
        probabilities = torch.zeros((len(crops), len(names)), device=device)
        with torch.inference_mode():
            for backbone in ["resnet50", "resnet101", "convnexttiny"]:
                model = NeuralNetwork(num_classes=len(names), backbone=backbone, freeze_backbone=False, pretrained=False).to(device)
                model.load_state_dict(torch.load(SOURCE / f"checkpoints/{backbone}_finetuned.pth", map_location=device, weights_only=True))
                model.eval()
                probabilities += torch.softmax(model(tensor), dim=1) / 3
                del model
        sections = []
        for i, row in enumerate(probabilities):
            values, indices = row.topk(3)
            sections.append(f"猫咪 {i+1}\n" + "\n".join(f"{names[index.item()]}: {value.item():.1%}" for value,index in zip(values,indices)))
        respond("\n\n".join(sections) + "\n\n每次最多展示 8 只猫咪的候选身份。")
