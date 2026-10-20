"""Verify the normalized media and adapters actually copied into EXE resources."""
from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parents[1]
resources=root/'build/staging/win-unpacked/resources'
assert resources.is_dir(),'No staging build. Run npm.cmd run dist:win first; the portable release is checked by tests/portable-regression.mjs.'
version=json.loads((root/'package.json').read_text(encoding='utf-8'))['version']
records=[]
for folder in (root/'modules').iterdir():
    if not folder.is_dir() or folder.name.startswith('_'):continue
    for source in folder.rglob('*'):
        if not source.is_file() or '__pycache__' in source.parts:continue
        relative=source.relative_to(root)
        destination=resources/relative
        assert destination.is_file(),f'Missing packed file: {relative}'
        sha=hashlib.file_digest(source.open('rb'),'sha256').hexdigest()
        assert sha==hashlib.file_digest(destination.open('rb'),'sha256').hexdigest(),f'Mismatch: {relative}'
        if source.suffix in ['.mp3','.mp4','.webp','.py']:
            records.append(dict(file=relative.as_posix(),bytes=source.stat().st_size,sha256=sha))
assert not list((resources/'modules').rglob('*.wav'))
(root/'artifacts/current').mkdir(parents=True,exist_ok=True)
(root/f'artifacts/current/packed-media-{version}.json').write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'PASS: {len(records)} packed MP3/MP4/WebP/worker files match local delivery assets; no WAV in EXE resources.',flush=True)
