"""Generate AI images (2026-11-23: native 512-px-class size + 4 steps; bigger sizes made
SDXL-Turbo duplicate limbs and characters) for VIRAL V3 "ai" scenes, locally and free (SDXL-Turbo, CPU bf16).

Usage: /opt/sd/bin/python scripts/gen_images.py jobs.json
jobs.json: [{"prompt": "...", "out": "public/episodes/x/ai_123.jpg", "seed": 7}, ...]
"""
import json, sys, time
import torch
from diffusers import AutoPipelineForText2Image
from PIL import Image, ImageFilter, ImageEnhance

# Short style: CLIP reads only 77 tokens, so a long style string cut off the end of the prompt.
STYLE = "pixar 3d render, cinematic lighting"
NEG = "text, watermark, letters, words, blurry, deformed"

jobs = json.load(open(sys.argv[1]))
torch.set_num_threads(4)
pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.bfloat16, variant="fp16")
pipe.set_progress_bar_config(disable=True)
for j in jobs:
    t = time.time()
    im = pipe(prompt=f"{j['prompt']}, {STYLE}", num_inference_steps=4, guidance_scale=0.0,
              width=j.get("w", 512), height=j.get("h", 896), generator=torch.Generator().manual_seed(int(j.get("seed", 7)))).images[0]
    im = im.resize((j.get("W", 1080), j.get("H", 1920)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    im = ImageEnhance.Contrast(im).enhance(1.04)
    im.save(j["out"], quality=90)
    print(f"img {time.time() - t:.1f}s {j['out']}", flush=True)
