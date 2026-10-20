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

def emit(text):
    print('XIANGMETA_TOKEN:'+json.dumps({'text':text},ensure_ascii=False),flush=True)

import torch
from src.model import PoetryLSTM

torch.set_num_threads(min(6, os.cpu_count() or 1))
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
vocab = json.loads((SOURCE / "data/processed/vocab_benchmark.json").read_text(encoding="utf-8"))
reverse = {i: c for c, i in vocab.items()}
model = PoetryLSTM(vocab_size=len(vocab), embedding_dim=1536, hidden_size=1536, num_layers=1, dropout=0.1).to(device)
model.load_state_dict(torch.load(SOURCE / "checkpoints/best_finetuned_model.pth", map_location=device, weights_only=True))
model.eval()
def generate(prefix=""):
    if any(c not in vocab for c in prefix):
        raise ValueError("前缀包含词表以外的字符，请换一个前缀")
    ids = [vocab["<BOS>"]] + [vocab[c] for c in prefix]
    hidden = None
    text = prefix
    if prefix: emit(prefix)
    with torch.inference_mode():
        x = torch.tensor([ids], device=device)
        for _ in range(32):
            logits, hidden = model(x, hidden)
            scores = logits[0, -1].clone() / float(payload["temperature"])
            for reserved in ["<PAD>", "<BOS>", "<UNK>"]:
                scores[vocab[reserved]] = -float("inf")
            values, indices = torch.topk(scores, min(15, len(vocab)))
            next_id = indices[torch.multinomial(torch.softmax(values, -1), 1)].item()
            if next_id == vocab["<EOS>"]:
                break
            text += reverse[next_id]
            emit(reverse[next_id])
            x = torch.tensor([[next_id]], device=device)
    return text or "（模型在起点结束了生成）"
if payload["mode"] == "前缀续写":
    prefix = payload["prefix"].strip()
    if not 1 <= len(prefix) <= 3:
        raise ValueError("续写前缀需要 1～3 个汉字")
    respond(generate(prefix))
else:
    first=generate()
    emit('\n\n')
    respond(first + "\n\n" + generate())
