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


KOKORO_MODEL = ROOT / "voices" / "kokoro" / "model.onnx"
KOKORO_VOICES = ROOT / "voices" / "kokoro" / "voices.npz"
KOKORO_VOICE = "em_santa"  # chosen by the owner (sample 10)
_kokoro = None


def tts(text: str, out: Path) -> float:
    """Voice-over with Kokoro (em_santa); falls back to Piper if unavailable."""
    global _kokoro
    try:
        import soundfile as sf
        from kokoro_onnx import Kokoro

        if _kokoro is None:
            _kokoro = Kokoro(str(KOKORO_MODEL), str(KOKORO_VOICES))
        samples, sr = _kokoro.create(text, voice=KOKORO_VOICE, speed=1.05, lang="es")
        sf.write(str(out), samples, sr, subtype="PCM_16")
        return len(samples) / sr
    except Exception as e:  # keep the pipeline running with the old voice
        print(f"Kokoro failed ({e}); using Piper", flush=True)
    from piper import PiperVoice, SynthesisConfig

    voice = PiperVoice.load(str(VOICE))
    cfg = SynthesisConfig(length_scale=0.88)
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


def make_calm_music(seconds: float, out: Path, seed: int):
    """Relaxed documentary bed for long videos: warm pad + soft electric piano,
    slow tempo, no drums. Major/'curious' progressions so 10 minutes never feel tense."""
    rng = np.random.default_rng(seed)
    bpm = 72 + int(rng.integers(0, 10))
    beat = 60 / bpm
    bar = beat * 4
    n = int(seconds * SR) + SR
    mix = np.zeros(n)
    progs = [  # (root midi, chord intervals) — Imaj7 / vi7 / IVmaj7 / V style
        [(60, (0, 4, 7, 11)), (57, (0, 3, 7, 10)), (53, (0, 4, 7, 11)), (55, (0, 4, 7, 10))],
        [(62, (0, 3, 7, 10)), (58, (0, 4, 7, 11)), (60, (0, 4, 7, 9)), (57, (0, 3, 7, 10))],
        [(55, (0, 4, 7, 11)), (52, (0, 3, 7, 10)), (48, (0, 4, 7, 14)), (50, (0, 5, 7, 10))],
        [(53, (0, 4, 7, 14)), (57, (0, 3, 7, 10)), (55, (0, 4, 7, 9)), (60, (0, 4, 7, 11))],
    ]
    prog = progs[int(rng.integers(0, len(progs)))]
    midi = lambda m: 440 * 2 ** ((m - 69) / 12)

    def epiano(f, L):
        t = np.arange(L) / SR
        tone = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 3)
                + 0.12 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 6))
        return tone * np.exp(-t * 1.6) * np.minimum(t / 0.006, 1)

    bars = int(math.ceil(seconds / bar)) + 1
    for b in range(bars):
        root, ivs = prog[b % 4]
        start = int(b * bar * SR)
        L = int(bar * 1.15 * SR)
        t = np.arange(L) / SR
        env = np.minimum(t / 0.8, 1) * np.minimum((bar * 1.15 - t) / 0.8, 1)
        pad = sum(np.sin(2 * np.pi * midi(root + iv) * t + 0.3 * np.sin(2 * np.pi * 0.2 * t))
                  + 0.25 * np.sin(2 * np.pi * 2 * midi(root + iv) * t) for iv in ivs) * 0.035
        seg = mix[start:start + L]
        seg += (pad * env)[:len(seg)]
        # soft bass note (with a harmonic so phones hear it)
        bl = int(bar * SR)
        bt = np.arange(bl) / SR
        bass = (np.sin(2 * np.pi * midi(root - 12) * bt) + 0.4 * np.sin(2 * np.pi * midi(root) * bt)) \
            * np.exp(-bt * 0.8) * np.minimum(bt / 0.05, 1) * 0.07
        seg = mix[start:start + bl]
        seg += bass[:len(seg)]
        # sparse e-piano melody: 3-5 notes per bar from the chord, one octave up
        k_notes = int(rng.integers(3, 6))
        slots = sorted(rng.choice(8, size=k_notes, replace=False))
        for sl in slots:
            s0 = start + int(sl * beat / 2 * SR)
            iv = ivs[int(rng.integers(0, len(ivs)))] + (12 if rng.random() < 0.6 else 24)
            nl = int(1.6 * SR)
            note_ = epiano(midi(root + iv), nl) * (0.07 + 0.03 * rng.random())
            seg = mix[s0:s0 + nl]
            seg += note_[:len(seg)]
    mix = mix[: int(seconds * SR)]
    fade = int(1.5 * SR)
    mix[:fade] *= np.linspace(0, 1, fade)
    mix[-fade:] *= np.linspace(1, 0, fade)
    mix = mix / (np.max(np.abs(mix)) + 1e-9) * 0.8
    raw = out.with_suffix(".raw.wav")
    with wave.open(str(raw), "wb") as wf:
        wf.setnchannels(1); wf.setsampwidth(2); wf.setframerate(SR)
        wf.writeframes((mix * 32767).astype(np.int16).tobytes())
    # gentle room reverb + stereo width
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(raw), "-af",
                    "aecho=0.8:0.7:60|130|220:0.35|0.25|0.15,highpass=f=70,lowpass=f=9000,"
                    "aformat=channel_layouts=stereo", str(out)], check=True)
    raw.unlink()


def make_long_music(seconds: float, out: Path, seed: int):
    """Long-form bed: different sections (~70 s each) so it never feels looped."""
    import tempfile
    parts = []
    t = 0.0
    k = 0
    tmp = Path(tempfile.mkdtemp(prefix="music-"))
    while t < seconds + 2:
        sec = min(72.0, seconds + 2 - t) if seconds + 2 - t > 20 else 20.0
        f = tmp / f"m{k}.wav"
        make_calm_music(sec + 2, f, seed=seed + k * 101)
        parts.append(f)
        t += sec
        k += 1
    # crossfade sections together with ffmpeg
    if len(parts) == 1:
        parts[0].replace(out)
        return
    cmd = ["ffmpeg", "-v", "error", "-y"]
    for f in parts:
        cmd += ["-i", str(f)]
    chain = ""
    last = "[0:a]"
    for i in range(1, len(parts)):
        lab = f"[a{i}]"
        chain += f"{last}[{i}:a]acrossfade=d=2:c1=tri:c2=tri{lab};"
        last = lab
    cmd += ["-filter_complex", chain.rstrip(";"), "-map", last, "-t", f"{seconds:.2f}", str(out)]
    subprocess.run(cmd, check=True)


STORY_MIN = {"title": 4.0, "landscape": 3.0, "map": 5.0, "stat": 3.5, "quote": 4.0, "compare": 4.0, "timeline": 6.0, "footage": 3.0}
MAX_MB = 95  # GitHub refuses files over 100 MB


def build_story(ep: dict, adir: Path) -> None:
    """Long-form 2D video (format "story"), 1920x1080 @ 24 fps, plus thumbnail."""
    eid = ep["id"]
    fps = 24
    total = 0
    for i, sc in enumerate(ep["scenes"]):
        if sc.get("src", "").startswith("http"):
            clip = adir / f"clip{i}.mp4"
            if not clip.exists():
                subprocess.run(["curl", "-sSfL", "-o", str(clip), sc["src"]], check=True)
            sc["src"] = f"episodes/{eid}/clip{i}.mp4"
        wav = adir / f"s{i}.wav"
        secs = tts(sc["narration"], wav)
        sc["durationInFrames"] = int(math.ceil(max(secs + 0.6, STORY_MIN[sc["type"]]) * fps))
        sc["audio"] = f"episodes/{eid}/s{i}.wav"
        total += sc["durationInFrames"]
    print(f"narration {total / fps / 60:.1f} min, {len(ep['scenes'])} scenes", flush=True)
    make_long_music(total / fps, adir / "music.wav", seed=sum(map(ord, eid)))
    ep["music"] = f"episodes/{eid}/music.wav"
    props = ROOT / "build" / f"{eid}.props.json"
    props.write_text(json.dumps(ep, ensure_ascii=False))
    out = ROOT / "videos" / f"{eid}.mp4"
    subprocess.run(
        ["npx", "remotion", "render", "src/index.ts", "Story", str(out),
         f"--props={props}", "--crf=24", "--concurrency=4", "--x264-preset=medium"],
        cwd=ROOT, check=True,
    )
    mb = out.stat().st_size / 1e6
    if mb > MAX_MB:  # re-encode to fit GitHub's limit
        kbps = int(MAX_MB * 8000 / (total / fps) * 0.92) - 128
        tmp = out.with_suffix(".tmp.mp4")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(out), "-c:v", "libx264", "-b:v", f"{kbps}k",
                        "-maxrate", f"{int(kbps * 1.4)}k", "-bufsize", f"{kbps * 2}k", "-preset", "medium",
                        "-c:a", "aac", "-b:a", "128k", str(tmp)], check=True)
        tmp.replace(out)
    # loudness to YouTube's reference (-14 LUFS); video stream copied untouched
    tmp = out.with_suffix(".ln.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(out), "-c:v", "copy", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
                    "-c:a", "aac", "-b:a", "160k", str(tmp)], check=True)
    tmp.replace(out)
    thumb_png = ROOT / "build" / f"{eid}-thumb.png"
    subprocess.run(["npx", "remotion", "still", "src/index.ts", "StoryThumb", str(thumb_png), f"--props={props}"],
                   cwd=ROOT, check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(thumb_png), "-vf", "scale=1280:720", "-q:v", "3",
                    str(ROOT / "videos" / f"{eid}-thumb.jpg")], check=True)
    print(f"OK {out} {total / fps / 60:.1f} min {out.stat().st_size / 1e6:.0f} MB", flush=True)


def main(path: str):
    ep = json.loads(Path(path).read_text())
    eid = ep["id"]
    adir = ROOT / "public" / "episodes" / eid
    adir.mkdir(parents=True, exist_ok=True)
    (ROOT / "build").mkdir(exist_ok=True)
    (ROOT / "videos").mkdir(exist_ok=True)
    tw = ROOT / "public" / "twemoji"
    if not tw.exists() or not any(tw.iterdir()):
        tw.mkdir(parents=True, exist_ok=True)
        for f in (ROOT / "node_modules" / "@twemoji" / "svg").glob("*.svg"):
            (tw / f.name).write_bytes(f.read_bytes())
    if ep.get("format") == "story":
        build_story(ep, adir)
        return
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
        minimum = {"hook": 2.2, "compare": 3.5, "stat": 3.0, "outro": 2.0, "clip": 2.5, "scale3d": 5.5, "skyline3d": 3.0}[sc["type"]]
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
