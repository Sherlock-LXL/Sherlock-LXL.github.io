"""Convert delivery WAV copies to MP3; leave user originals untouched."""
from pathlib import Path
import subprocess,json,hashlib
root=Path(__file__).resolve().parents[1]
ffmpeg=root/'runtime/tools/ffmpeg/ffmpeg.exe'
report_path=root/'asset-sources/metadata/media-normalization.json'
report=json.loads(report_path.read_text(encoding='utf-8')) if report_path.exists() else [];rewrites={}
for wav in (root/'modules/personal-music/assets').glob('*.wav'):
 mp3=wav.with_suffix('.mp3')
 subprocess.run([str(ffmpeg),'-hide_banner','-loglevel','error','-y','-i',str(wav),'-map','0:a:0','-vn','-c:a','libmp3lame','-b:a','320k','-map_metadata','-1',str(mp3)],check=True)
 rewrites[wav.name]=mp3.name;report.append(dict(source=str(wav.relative_to(root)),file=str(mp3.relative_to(root)),sourceBytes=wav.stat().st_size,bytes=mp3.stat().st_size,sha256=hashlib.file_digest(mp3.open('rb'),'sha256').hexdigest()))
for p in [root/'public/assets/audio/manifest.json',root/'modules/personal-music/manifest.json']:
 text=p.read_text(encoding='utf-8')
 for old,new in rewrites.items():text=text.replace('/'+old,'/'+new)
 p.write_text(text,encoding='utf-8')
# Old delivery copies are moved to an explicitly local archive, outside EXE resources.
archive=root/'asset-sources/audio-wav';archive.mkdir(parents=True,exist_ok=True)
for name in rewrites:
 source=root/'modules/personal-music/assets'/name;destination=archive/name
 if destination.exists():assert source.read_bytes()==destination.read_bytes();source.unlink()
 else:source.rename(destination)
report_path.write_text(json.dumps(list({r['file']:r for r in report}.values()),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Normalized',len(report),'WAV recordings to 320 kbps MP3. Original Pictures files untouched.',flush=True)
