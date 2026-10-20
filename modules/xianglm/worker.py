"""Use the inference-only desktop export; stream each decodable model token."""
import json,os,sys,threading
from pathlib import Path
SOURCE=Path(os.environ['XIANGMETA_SOURCE']).resolve()
sys.path.insert(0,str(SOURCE))
payload=json.load(sys.stdin)
import torch
from engine import XiangLMEngine
torch.set_num_threads(min(6,os.cpu_count() or 1))
engine=XiangLMEngine({'model_file':'xianglm-200m-chat.pt','tokenizer_file':'tokenizer.json'})
engine.load()
pieces=[]
def emit(text):
    pieces.append(text)
    print('XIANGMETA_TOKEN:'+json.dumps({'text':text},ensure_ascii=False),flush=True)
reason=engine.generate(payload['prompt'],{'max_new_tokens':128,'temperature':.65,'top_k':40,'top_p':.9,'repetition_penalty':1.1,'repetition_window':128},threading.Event(),emit)
print('XIANGMETA_RESULT:'+json.dumps({'text':''.join(pieces) or '（模型结束了生成）','finishReason':reason},ensure_ascii=False),flush=True)
