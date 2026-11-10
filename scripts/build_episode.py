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
    """Original, royalty-free cinematic pulse, mixed for phone speakers.

    Most energy sits in 200 Hz - 6 kHz (what phones can play): bright chord
    pad, plucked arpeggio, a bass with harmonics and soft hi-hats.
    """
    rng = np.random.default_rng(seed)
    bpm = 100 + int(rng.integers(0, 16))
    beat = 60 / bpm
    n = int(seconds * SR) + SR
    mix = np.zeros(n)
    progs = [[57, 53, 48, 55], [57, 55, 53, 52], [50, 53, 57, 55], [52, 48, 55, 50]]
    roots = progs[int(rng.integers(0, len(progs)))]
    midi = lambda m: 440 * 2 ** ((m - 69) / 12)

    def saw(f, t, k=7):
        return sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, k + 1))

    def square(f, t, k=5):
        return sum(np.sin(2 * np.pi * f * h * t) / h for h in range(1, 2 * k, 2))

    bar = beat * 4
    bars = int(math.ceil(seconds / bar)) + 1
    for b in range(bars):
        r = roots[b % 4]
        start = int(b * bar * SR)
        L = int(bar * SR)
        t = np.arange(L) / SR
        env = np.minimum(t / 0.25, 1) * np.minimum((bar - t) / 0.3, 1)
        seg = mix[start : start + L]
        m = len(seg)
        # bright pad in the mid register (A3-A4)
        pad = sum(saw(midi(r + iv), t, 6) for iv in (0, 3, 7, 12)) * 0.05
        seg += (pad * env)[:m]
        # bass with harmonics (audible on phones), pulsing on beats
        for k in range(4):
            s0 = start + int(k * beat * SR)
            bl = int(beat * 0.9 * SR)
            bt = np.arange(bl) / SR
            bass = saw(midi(r - 12), bt, 8) * np.exp(-bt * 3) * 0.16
            mix[s0 : s0 + bl] += bass[: len(mix[s0 : s0 + bl])]
        # plucked arpeggio on 8ths, one/two octaves up
        pattern = [0, 7, 12, 15, 12, 7, 3, 7]
        for k in range(8):
            s0 = start + int(k * beat / 2 * SR)
            al = int(0.3 * SR)
            at = np.arange(al) / SR
            arp = square(midi(r + 12 + pattern[k]), at, 4) * np.exp(-at * 9) * 0.10
            mix[s0 : s0 + al] += arp[: len(mix[s0 : s0 + al])]
            # hi-hat (filtered noise) on every 8th, accent on off-beats
            hl = int(0.05 * SR)
            noise = rng.standard_normal(hl)
            noise = np.diff(noise, prepend=0)  # crude high-pass
            hat = noise * np.exp(-np.arange(hl) / SR * 80) * (0.05 if k % 2 else 0.025)
            mix[s0 : s0 + hl] += hat[: len(mix[s0 : s0 + hl])]
            # kick with a click on every beat
            if k % 2 == 0:
                kl = int(0.2 * SR)
                kt = np.arange(kl) / SR
                kick = np.sin(2 * np.pi * (55 + 120 * np.exp(-kt * 35)) * kt) * np.exp(-kt * 14)
                kick[: int(0.004 * SR)] += 0.4
                mix[s0 : s0 + kl] += 0.35 * kick[: len(mix[s0 : s0 + kl])]
    mix = mix[: int(seconds * SR)]
    fade = int(1.5 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)
    mix = np.tanh(mix / max(np.abs(mix).max(), 1e-9) * 1.6)  # soft-clip: denser, louder
    mix /= max(np.abs(mix).max(), 1e-9)
    data = (mix * 0.89 * 32767).astype(np.int16)
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
    doc = ep.get("format") == "doc"
    total = 0
    for i, sc in enumerate(ep["scenes"]):
        if doc and sc.get("src", "").startswith("http"):
            clip = adir / f"clip{i}.mp4"
            if not clip.exists():
                subprocess.run(["curl", "-sSfL", "-o", str(clip), sc["src"]], check=True)
            sc["src"] = f"episodes/{eid}/clip{i}.mp4"
        wav = adir / f"s{i}.wav"
        secs = tts(sc["narration"], wav)
        minimum = {"hook": 2.2, "compare": 3.5, "stat": 3.0, "outro": 2.0, "clip": 2.5, "scale3d": 5.5}[sc["type"]]
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
            "npx", "remotion", "render", "src/index.ts", "Doc" if doc else "Short", str(out),
            f"--props={props}", "--crf=21", "--concurrency=2", "--gl=swangle",
        ],
        cwd=ROOT,
        check=True,
    )
    print(f"OK {out} {total / FPS:.1f}s")


if __name__ == "__main__":
    main(sys.argv[1])
