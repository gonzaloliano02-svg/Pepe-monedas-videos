"""Real word timings for captions: faster-whisper on each scene wav, mapped onto the script words.

Usage: /opt/cbx/venv/bin/python scripts/word_times.py jobs.json  (jobs: [{"wav":..., "text":...}])
Prints JSON list of [{"w": word, "t": seconds}, ...] per job.
"""
import json, sys
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from faster_whisper import WhisperModel

jobs = json.load(open(sys.argv[1]))
m = WhisperModel("small", device="cpu", compute_type="int8")
res = []
for j in jobs:
    a, sr = sf.read(j["wav"], dtype="float32")
    if a.ndim > 1:
        a = a.mean(1)
    a = resample_poly(a, 16000, sr).astype(np.float32)
    segs, _ = m.transcribe(a, language="es", word_timestamps=True, beam_size=1)
    ts = [w.start for s in segs for w in (s.words or [])]
    words = j["text"].split()
    if not ts:
        res.append([])
        continue
    n, k = len(words), len(ts)
    res.append([{"w": w, "t": round(float(ts[min(k - 1, round(i * k / n))]), 3)} for i, w in enumerate(words)])
print(json.dumps(res))
