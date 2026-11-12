#!/usr/bin/env python3
"""Download candidate clips and build a numbered contact sheet.

Usage: python3 scripts/preview.py out.png URL [URL ...]
Grabs a frame at 2 s from each clip (downloaded with curl, because ffmpeg
does not use the HTTPS proxy) and lays them out in one row, 300 px high.
Stock-site titles are often wrong: always look at the sheet before using a clip.
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw


def main(out: str, urls: list[str]):
    tmp = Path(tempfile.mkdtemp(prefix="preview-"))
    frames = []
    for i, u in enumerate(urls):
        clip = tmp / f"v{i}.mp4"
        png = tmp / f"c{i}.png"
        try:
            subprocess.run(["curl", "-sSfL", "-o", str(clip), u], check=True)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "2", "-i", str(clip),
                            "-frames:v", "1", "-vf", "scale=-1:300", str(png)], check=True)
            frames.append(Image.open(png).convert("RGB"))
        except subprocess.CalledProcessError:
            frames.append(Image.new("RGB", (170, 300), (60, 0, 0)))
    width = sum(f.width for f in frames)
    sheet = Image.new("RGB", (width, 300))
    draw = ImageDraw.Draw(sheet)
    x = 0
    for i, f in enumerate(frames):
        sheet.paste(f, (x, 0))
        draw.rectangle((x, 0, x + 26, 22), fill=(0, 0, 0))
        draw.text((x + 6, 4), str(i), fill=(255, 220, 0))
        x += f.width
    sheet.save(out)
    print(out)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
