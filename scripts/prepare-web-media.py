"""One-time authoring tool; generated media/config are committed, CI needs only Node.

python -m pip install Pillow imageio-ffmpeg
python scripts/prepare-web-media.py
Original images and 320 kbps masters are never overwritten.
"""
import hashlib
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageOps
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]


def write_json(relative, value):
    (ROOT / relative).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def source_path(url):
    if url.startswith("/assets/modules/"):
        module, filename = url.removeprefix("/assets/modules/").split("/", 1)
        return ROOT / "modules" / module / "assets" / filename
    return ROOT / "public" / url.lstrip("/")


previews = ROOT / "public/assets/previews"
previews.mkdir(parents=True, exist_ok=True)
sources = set()
for manifest in sorted((ROOT / "modules").glob("*/manifest.json")):
    module = json.loads(manifest.read_text())
    sources.update(a["cover"] for a in module.get("albums", []))
    sources.update(m.get("thumbnail") or m["src"] for m in module.get("media", [])
                   if m["kind"] == "image" and m.get("src"))

images = []
for src in sorted(sources):
    key = hashlib.sha256(src.encode()).hexdigest()[:16]
    preview = f"/assets/previews/{key}.webp"
    with Image.open(source_path(src)) as original:
        image = ImageOps.exif_transpose(original).convert("RGB")
        image.thumbnail((384, 384), Image.Resampling.LANCZOS)
        image.save(ROOT / "public" / preview.lstrip("/"), "WEBP", quality=82, method=6)
    images.append({"src": src, "preview": preview})
write_json("data/image-previews.json", images)

manifest = json.loads((ROOT / "public/assets/audio/manifest.json").read_text())
levels = json.loads((ROOT / "asset-sources/metadata/audio-loudness.json").read_text())
audio = {"playlist": manifest["playlist"], "seasonal": manifest["seasonal"]}
output = ROOT / "public/assets/music"
output.mkdir(parents=True, exist_ok=True)
ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
report = []
for track in audio["playlist"] + list(audio["seasonal"].values()):
    original = source_path(track["src"])
    target = output / original.name
    subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-y", "-i",
                    str(original), "-map", "0:a:0", "-vn", "-map_metadata", "-1",
                    "-ar", "44100", "-ac", "2", "-c:a", "libmp3lame", "-q:a", "2",
                    str(target)], check=True)
    # Decode every compressed file to catch corruption; retain stereo and full duration.
    subprocess.run([ffmpeg, "-v", "error", "-i", str(target), "-f", "null", "-"],
                   check=True)
    track["src"] = f"/assets/music/{target.name}"
    level = levels.get(str(original.relative_to(ROOT)))
    if level and hashlib.sha256(original.read_bytes()).hexdigest() == level["sha256"]:
        # Playback gain only: retain the recording's dynamics, with peak headroom.
        track["gain"] = round(10 ** (min(-23 - level["lufs"], -2 - level["truePeakDb"]) / 20), 4)
    report.append({"file": target.name, "originalBytes": original.stat().st_size,
                   "webBytes": target.stat().st_size})
write_json("data/audio.json", audio)
write_json("data/media-sizes.json", {"audioEncoding": "LAME VBR q2, 44.1 kHz stereo",
                                   "audio": report, "previewCount": len(images),
                                   "previewBytes": sum(p.stat().st_size for p in previews.glob("*.webp"))})
print(json.dumps({"tracks": len(report), "originalMB": sum(r["originalBytes"] for r in report) / 1e6,
                  "webMB": sum(r["webBytes"] for r in report) / 1e6,
                  "previews": len(images)}, indent=2))
