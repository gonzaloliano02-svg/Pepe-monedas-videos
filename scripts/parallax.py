"""VIRAL V3: turn AI stills into moving 2.5D clips (depth parallax), free and local.

Usage: /opt/sd/bin/python scripts/parallax.py jobs.json
jobs: [{"img": in.jpg, "out": out.mp4, "frames": 60, "move": "in"|"out"|"left"|"right"|"up"|"punch"}]
The near parts (character) move/zoom more than the far parts (background), like a 3D camera.
"""
import json, subprocess, sys
import cv2
import numpy as np
import torch
from PIL import Image
from transformers import pipeline

torch.set_num_threads(4)
jobs = json.load(open(sys.argv[1]))
depth = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device="cpu")
for j in jobs:
    im = Image.open(j["img"]).convert("RGB")
    W, H = im.size
    d = np.array(depth(im)["depth"].resize((W, H)), dtype=np.float32)
    d = (d - d.min()) / max(1e-6, d.max() - d.min())
    d = cv2.GaussianBlur(d, (0, 0), 6)  # soft edges: no tearing around the character
    src = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)
    n = int(j["frames"])
    mv = j.get("move", "in")
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    cx, cy = W / 2, H * 0.55
    proc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}",
                             "-r", "24", "-i", "-", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                             "-pix_fmt", "yuv420p", j["out"]], stdin=subprocess.PIPE)
    for f in range(n):
        t = f / max(1, n - 1)
        e = t * t * (3 - 2 * t)  # smoothstep
        # base zoom for everything + extra for near pixels (dolly feel)
        if mv == "out":
            zb, zn = 1.10 - 0.06 * e, 0.10 - 0.10 * e
        elif mv == "punch":
            zb, zn = 1.04 + 0.04 * e, 0.02 + 0.10 * e
        else:
            zb, zn = 1.04 + 0.04 * e, 0.10 * e
        sx = {"left": 1, "right": -1}.get(mv, 0) * (e - 0.5) * 0.05 * W
        sy = (0.5 - e) * 0.04 * H if mv == "up" else 0.0
        z = zb + zn * d
        mx = (xx - cx) / z + cx - sx * (0.3 + 0.7 * d)
        my = (yy - cy) / z + cy - sy * (0.3 + 0.7 * d)
        fr = cv2.remap(src, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        proc.stdin.write(fr.tobytes())
    proc.stdin.close()
    proc.wait()
    print("clip", j["out"], flush=True)
