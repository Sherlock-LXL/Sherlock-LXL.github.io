from media_import import copy_audio
"""Import ordered album archive without altering originals or background programming."""
from pathlib import Path
from PIL import Image, ImageOps
import json, shutil, hashlib, argparse

root=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description='Import a user-selected album archive; current albums already run entirely locally.')
parser.add_argument('--source',type=Path,required=True,help='Directory containing numbered album folders')
source=parser.parse_args().source.resolve()
out=root/'modules/personal-music/assets'
albums=[]; provenance=[]
for folder in sorted(source.iterdir(),key=lambda p:int(p.name.split('.')[0])):
    order,title=folder.name.split('.',1); order=int(order)
    cover=next(p for p in folder.iterdir() if '封面' in p.stem)
    name=f'album-{order:02d}'
    with Image.open(cover) as original:
        im=ImageOps.exif_transpose(original).convert('RGB'); im.thumbnail((1200,1200))
        im.save(out/f'{name}.webp',quality=92)
    tracks=[]
    for i,audio in enumerate(sorted(p for p in folder.iterdir() if p.suffix.lower() in ['.mp3','.wav']),1):
        lyrics=next(p for p in folder.glob('*.txt') if p.stem.replace(' 歌词','').replace('歌词','').strip()==audio.stem)
        raw=lyrics.read_bytes()
        for encoding in ['utf-8-sig','utf-16','gb18030']:
            try: text=raw.decode(encoding); break
            except UnicodeError: continue
        dest=f'{name}-track-{i:02d}.mp3'; copy_audio(audio,out/dest)
        sha=hashlib.sha256(raw).hexdigest()
        tracks.append(dict(id=f'{name}-track-{i:02d}',title=audio.stem,src=f'/assets/modules/personal-music/{dest}',lyrics=text))
        provenance.append(dict(source=str(audio),delivered=dest,sha256=hashlib.sha256((out/dest).read_bytes()).hexdigest(),originalSha256=hashlib.sha256(audio.read_bytes()).hexdigest(),lyricsSource=str(lyrics),lyricsSha256=sha))
    albums.append(dict(id=name,order=order,title=title,cover=f'/assets/modules/personal-music/{name}.webp',credit='未名拾音 · 团队项目' if title=='燕来有声' else '个人音乐档案',tracks=tracks))
p=root/'modules/personal-music/manifest.json'; m=json.loads(p.read_text(encoding='utf-8'))
m.update(title='旋律展廊',subtitle='把每一张专辑，放进时间里',albums=albums,media=[],description='五张按档案编号排列的专辑，收录封面、精选人声作品与原始歌词及制作署名。《燕来有声》单独标注未名拾音团队归属；曲目为提供的精选作品，不代表完整专辑曲序。',facts=[dict(label='专辑档案',value='5 张'),dict(label='精选人声作品',value=str(sum(len(a['tracks']) for a in albums))+' 首'),dict(label='顺序依据',value='原始档案编号')],story=[dict(title='01 / 专辑里的时间',body='Secret → 星辰代我想你 → 近地轨道 → 二分之一星球 → 燕来有声。按提供的专辑编号策展。'),dict(title='02 / 听见与阅读',body='选择专辑后试听精选曲目，阅读随档案提供的歌词与制作署名。'),dict(title='03 / 创作归属',body='《燕来有声》为未名拾音团队项目，保留在这份完整专辑档案中，品牌展区继续独立呈现。')])
p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(root/'asset-sources/metadata').mkdir(parents=True,exist_ok=True)
(root/'asset-sources/metadata/album-assets.json').write_text(json.dumps(provenance,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Imported {len(albums)} albums, {sum(len(a["tracks"]) for a in albums)} tracks; originals unchanged.')
