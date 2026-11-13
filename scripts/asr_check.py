"""Transcribe a WAV with faster-whisper (run in /opt/cbx/venv) to QA the voice-over."""
import sys, numpy as np, soundfile as sf, os
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
from faster_whisper import WhisperModel
import scipy.signal as ss
m = WhisperModel("small", device="cpu", compute_type="int8")
for f in sys.argv[1:]:
    a, sr = sf.read(f, dtype="float32")
    if a.ndim > 1: a = a.mean(1)
    a = ss.resample_poly(a, 16000, sr).astype("float32")
    segs, _ = m.transcribe(a, language="es")
    print(f, "::", " ".join(x.text.strip() for x in segs), flush=True)
