"""Measure delivered media without rewriting any recording; cache by SHA-256."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,re,subprocess
ROOT=Path(__file__).resolve().parents[1]
report_path=ROOT/'asset-sources/metadata/audio-loudness.json'
previous=json.loads(report_path.read_text(encoding='utf-8')) if report_path.exists() else {}
def measure(file):
    relative=file.relative_to(ROOT).as_posix()
    digest=hashlib.file_digest(file.open('rb'),'sha256').hexdigest()
    if previous.get(relative,{}).get('sha256')==digest:return relative,previous[relative]
    result=subprocess.run([str(ROOT/'runtime/tools/ffmpeg/ffmpeg.exe'),'-hide_banner','-nostats','-i',str(file),'-map','0:a:0','-vn','-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-'],capture_output=True,encoding='utf-8',errors='replace',check=True)
    values=json.loads(re.findall(r'\{[^{}]+"input_i"[^{}]+\}',result.stderr,re.S)[-1])
    row={'sha256':digest,'lufs':float(values['input_i']),'truePeakDb':float(values['input_tp']),'rangeLu':float(values['input_lra'])}
    print(relative,row['lufs'],flush=True)
    return relative,row
files=sorted(f for f in (ROOT/'modules').rglob('*') if f.suffix.lower() in ('.mp3','.mp4'))
with ThreadPoolExecutor(max_workers=3) as pool:report=dict(pool.map(measure,files))
report_path.parent.mkdir(parents=True,exist_ok=True)
report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Measured',len(report),'recordings; originals unchanged.',flush=True)
