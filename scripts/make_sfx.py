"""Synthesise the channel's sound effects (no third-party samples, no licences).
Run with /opt/cbx/venv/bin/python scripts/make_sfx.py → public/sfx/*.wav (44.1 kHz mono).
Owner request 2026-11-18: "añade también efectos de sonido"."""
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, lfilter, sosfilt

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public" / "sfx"
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)


def t(d):
    return np.arange(int(SR * d)) / SR


def noise(d):
    return rng.standard_normal(int(SR * d))


def lp(x, f, o=2):
    return sosfilt(butter(o, f, "low", fs=SR, output="sos"), x)


def hp(x, f, o=2):
    return sosfilt(butter(o, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, hi], "band", fs=SR, output="sos"), x)


def sweep_lp(x, f0, f1):
    """one-pole low-pass whose cutoff moves from f0 to f1 (log)"""
    fc = np.geomspace(f0, f1, len(x))
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def env(n, a, r, shape=2.0):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na) ** shape
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** shape
    return e


def fade(x, d=0.01):
    n = int(d * SR)
    x[:n] *= np.linspace(0, 1, n)
    x[-n:] *= np.linspace(1, 0, n)
    return x


def save(name, x, peak=0.9):
    x = fade(np.asarray(x, dtype=np.float64))
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    sf.write(OUT / f"{name}.wav", x.astype(np.float32), SR)


def loopable(x, d=0.5):
    """crossfade end into start so it loops without a click"""
    n = int(d * SR)
    head = x[:n].copy()
    x = x[n:]
    x[-n:] = x[-n:] * np.linspace(1, 0, n) + head * np.linspace(0, 1, n)
    return x


# whoosh: filtered noise sweeping up then down
d = 0.7
x = noise(d)
x = np.concatenate([sweep_lp(x[: len(x) // 2], 300, 5000), sweep_lp(x[len(x) // 2:], 5000, 400)])
save("whoosh", x * np.sin(np.pi * t(d) / d) ** 1.5, 0.8)

# swoosh: short, brighter (arrows, fast moves)
d = 0.35
x = hp(sweep_lp(noise(d), 1500, 9000), 600)
save("swoosh", x * np.sin(np.pi * t(d) / d) ** 2, 0.7)

# pop: sine with fast pitch drop (things appearing)
d = 0.16
tt = t(d)
f = 950 * np.exp(-tt * 18) + 280
x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 28)
save("pop", x, 0.8)

# blip: higher pop (tags, bubbles)
d = 0.12
tt = t(d)
f = 1500 * np.exp(-tt * 25) + 700
save("blip", np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 35), 0.7)

# hit: cinematic impact (titles)
d = 1.4
tt = t(d)
thump = np.sin(2 * np.pi * np.cumsum(70 * np.exp(-tt * 3) + 38) / SR) * np.exp(-tt * 4)
crack = lp(noise(d), 2500) * np.exp(-tt * 14)
tail = lp(noise(d), 400) * np.exp(-tt * 2.5) * 0.4
save("hit", np.tanh(1.6 * (thump + 0.6 * crack + tail)), 0.9)

# boom: big explosion (collapse, merge, flashes)
d = 3.2
tt = t(d)
sub = np.sin(2 * np.pi * np.cumsum(60 * np.exp(-tt * 1.2) + 28) / SR) * np.exp(-tt * 1.3)
body = lp(noise(d), 900) * np.exp(-tt * 2.2) * env(len(tt), 0.01, 0.5)
rumb = lp(noise(d), 160, 4) * np.exp(-tt * 0.9) * 2.5
save("boom", np.tanh(1.8 * (sub + 0.7 * body + rumb)), 0.95)

# riser: tension before a big moment
d = 2.2
tt = t(d)
f = np.geomspace(180, 1400, len(tt))
tone = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR)
air = hp(sweep_lp(noise(d), 500, 8000), 300)
save("riser", (0.5 * tone + air) * (tt / d) ** 2.2, 0.8)

# ding: bright bell (stats landing)
d = 1.6
tt = t(d)
x = sum(a * np.sin(2 * np.pi * fr * tt) * np.exp(-tt * k) for fr, a, k in [(1318, 1, 3), (2637, 0.4, 5), (3951, 0.2, 7), (1975, 0.25, 4)])
save("ding", x * env(len(tt), 0.003, 0.05), 0.6)

# count: accelerating ticks (stat counting up, ~1.6 s)
d = 1.7
x = np.zeros(int(SR * d))
tick_t = t(0.025)
tick = np.sin(2 * np.pi * 2400 * tick_t) * np.exp(-tick_t * 220)
pos = 0.0
gap = 0.16
while pos < 1.6:
    i = int(pos * SR)
    x[i:i + len(tick)] += tick[: len(x) - i]
    pos += gap
    gap = max(0.035, gap * 0.86)
save("count", x, 0.6)

# sparkle: twinkles (✨, glow)
d = 1.2
x = np.zeros(int(SR * d))
for k in range(9):
    st = rng.uniform(0, 0.7)
    fr = rng.uniform(2500, 5200)
    tb = t(0.4)
    s = np.sin(2 * np.pi * fr * tb) * np.exp(-tb * 12)
    i = int(st * SR)
    x[i:i + len(s)] += s[: len(x) - i] * rng.uniform(0.4, 1)
save("sparkle", x, 0.55)

# boing: comic spring (character reactions)
d = 0.5
tt = t(d)
f = 220 + 160 * np.sin(2 * np.pi * 14 * tt) * np.exp(-tt * 5)
save("boing", np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 6), 0.6)

# ---- loops (12 s, loopable) ----
L = 12.5
tt = t(L)
# hum: deep black-hole drone
x = (np.sin(2 * np.pi * 41 * tt) + 0.7 * np.sin(2 * np.pi * 41.6 * tt) + 0.35 * np.sin(2 * np.pi * 82.3 * tt)) * (0.75 + 0.25 * np.sin(2 * np.pi * 0.17 * tt))
x += lp(noise(L), 220, 4) * 1.5
save("hum", loopable(np.tanh(x)), 0.8)
# wind: warp / speed lines
x = bp(noise(L), 250, 2600) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.31 * tt)) + hp(lp(noise(L), 5000), 1500) * 0.3
save("wind", loopable(x), 0.7)
# rumble: camera shake
x = lp(noise(L), 120, 4) * (0.7 + 0.3 * np.sin(2 * np.pi * 1.7 * tt)) + lp(noise(L), 400) * 0.3
save("rumble", loopable(np.tanh(2 * x)), 0.85)
# ticktock: clocks
x = np.zeros(len(tt))
for k in range(int(L / 0.5)):
    fr = 3000 if k % 2 == 0 else 2200
    tb = t(0.03)
    s = np.sin(2 * np.pi * fr * tb) * np.exp(-tb * 250)
    i = int(k * 0.5 * SR)
    x[i:i + len(s)] += s[: len(x) - i]
save("ticktock", x[: int(SR * 12)], 0.6)

print("sfx:", sorted(p.name for p in OUT.glob("*.wav")))
