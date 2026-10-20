"""One delivery format for audio; source assets remain untouched."""
from pathlib import Path
import shutil,subprocess
ROOT=Path(__file__).resolve().parents[1]
def copy_audio(source,destination):
    source,destination=Path(source),Path(destination).with_suffix('.mp3')
    destination.parent.mkdir(parents=True,exist_ok=True)
    if source.suffix.lower()=='.mp3':shutil.copy2(source,destination)
    else:subprocess.run([str(ROOT/'runtime/tools/ffmpeg/ffmpeg.exe'),'-hide_banner','-loglevel','error','-y','-i',str(source),'-map','0:a:0','-vn','-c:a','libmp3lame','-b:a','320k','-map_metadata','-1',str(destination)],check=True)
    return destination
