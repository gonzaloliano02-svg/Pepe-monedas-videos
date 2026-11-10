#!/usr/bin/env python3
"""Build one Short: voice (Piper), music, then Remotion render.

Usage: python3 scripts/build_episode.py episodes/<id>.json
Output: videos/<id>.mp4
"""
import json
import math
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
VOICE = ROOT / "voices" / "es_ES-davefx-medium.onnx"
SR = 44100


def tts(text: str, out: Path) -> float:
    from piper import PiperVoice, SynthesisConfig

    voice = PiperVoice.load(str(VOICE))
    cfg = SynthesisConfig(length_scale=0.88)  # a bit faster: Shorts pacing
    with wave.open(str(out), "wb") as wf:
        voice.synthesize_wav(text, wf, syn_config=cfg)
    with wave.open(str(out), "rb") as wf:
        return wf.getnframes() / wf.getframerate()


def note(freq, dur, sr=SR):
    t = np.arange(int(dur * sr)) / sr
    return t, freq


def make_music(seconds: float, out: Path, seed: int):
    """Original, royalty-free dark synth pulse (minor progression)."""
    rng = np.random.default_rng(seed)
    bpm = 104
    beat = 60 / bpm
    n = int(seconds * SR) + SR
    mix = np.zeros(n)
    roots = [57, 53, 48, 55]  # A, F, C, G (midi)
    rng.shuffle(roots)
    midi = lambda m: 440 * 2 ** ((m - 69) / 12)
    bar = beat * 4
    bars = int(math.ceil(seconds / bar)) + 1
    for b in range(bars):
        r = roots[b % 4]
        start = int(b * bar * SR)
        # pad: root + minor third + fifth, slow attack
        L = int(bar * SR)
        t = np.arange(L) / SR
        env = np.minimum(t / 0.6, 1) * np.minimum((bar - t) / 0.4, 1)
        pad = sum(
            np.sin(2 * np.pi * midi(r - 12 + iv) * t + p)
            for iv, p in [(0, 0), (3, 1.1), (7, 2.3), (12, 0.5)]
        )
        seg = mix[start : start + L]
        seg += 0.06 * pad[: len(seg)] * env[: len(seg)]
        # kick on every beat + arpeggio on 8ths
        for k in range(8):
            s = start + int(k * beat / 2 * SR)
            if s >= n:
                break
            if k % 2 == 0:
                kl = int(0.25 * SR)
                kt = np.arange(kl) / SR
                kick = np.sin(2 * np.pi * (50 + 90 * np.exp(-kt * 30)) * kt) * np.exp(-kt * 12)
                mix[s : s + kl] += 0.5 * kick[: len(mix[s : s + kl])]
            al = int(0.22 * SR)
            at = np.arange(al) / SR
            iv = [0, 3, 7, 12, 7, 3, 10, 7][k]
            arp = np.sin(2 * np.pi * midi(r + 12 + iv) * at) * np.exp(-at * 14)
            mix[s : s + al] += 0.12 * arp[: len(mix[s : s + al])]
    mix = mix[: int(seconds * SR)]
    fade = int(1.5 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)
    mix /= max(np.abs(mix).max(), 1e-9)
    data = (mix * 0.8 * 32767).astype(np.int16)
    with wave.open(str(out), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(data.tobytes())


def main(path: str):
    ep = json.loads(Path(path).read_text())
    eid = ep["id"]
    adir = ROOT / "public" / "episodes" / eid
    adir.mkdir(parents=True, exist_ok=True)
    total = 0
    for i, sc in enumerate(ep["scenes"]):
        wav = adir / f"s{i}.wav"
        secs = tts(sc["narration"], wav)
        minimum = {"hook": 2.2, "compare": 3.5, "stat": 3.0, "outro": 2.0}[sc["type"]]
        sc["durationInFrames"] = int(math.ceil(max(secs + 0.35, minimum) * FPS))
        sc["audio"] = f"episodes/{eid}/s{i}.wav"
        total += sc["durationInFrames"]
    make_music(total / FPS, adir / "music.wav", seed=sum(map(ord, eid)))
    ep["music"] = f"episodes/{eid}/music.wav"
    (ROOT / "build").mkdir(exist_ok=True)
    props = ROOT / "build" / f"{eid}.props.json"
    props.write_text(json.dumps(ep, ensure_ascii=False))
    (ROOT / "videos").mkdir(exist_ok=True)
    out = ROOT / "videos" / f"{eid}.mp4"
    subprocess.run(
        [
            "npx", "remotion", "render", "src/index.ts", "Short", str(out),
            f"--props={props}", "--crf=23", "--concurrency=4",
        ],
        cwd=ROOT,
        check=True,
    )
    print(f"OK {out} {total / FPS:.1f}s")


if __name__ == "__main__":
    main(sys.argv[1])
