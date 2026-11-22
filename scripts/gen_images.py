"""Generate AI images for VIRAL V3 "ai" scenes, locally and free (SDXL-Turbo, CPU bf16).

Usage: /opt/sd/bin/python scripts/gen_images.py jobs.json
jobs.json: [{"prompt": "...", "out": "public/episodes/x/ai_123.jpg", "seed": 7}, ...]
"""
import json, sys, time
import torch
from diffusers import AutoPipelineForText2Image
from PIL import Image, ImageFilter, ImageEnhance

STYLE = ("3d animated movie still, pixar style render, vibrant colors, cinematic lighting, "
         "expressive characters, highly detailed, sharp focus, vertical composition")
NEG = "text, watermark, letters, words, blurry, deformed"

jobs = json.load(open(sys.argv[1]))
torch.set_num_threads(4)
pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.bfloat16, variant="fp16")
pipe.set_progress_bar_config(disable=True)
for j in jobs:
    t = time.time()
    im = pipe(prompt=f"{j['prompt']}, {STYLE}", num_inference_steps=2, guidance_scale=0.0,
              width=576, height=1024, generator=torch.Generator().manual_seed(int(j.get("seed", 7)))).images[0]
    im = im.resize((1080, 1920), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    im = ImageEnhance.Contrast(im).enhance(1.04)
    im.save(j["out"], quality=90)
    print(f"img {time.time() - t:.1f}s {j['out']}", flush=True)
