"""Chatterbox multilingual TTS worker (runs in /opt/cbx/venv).

Reads JSON lines {"text": ..., "out": ...} on stdin, writes a WAV for each and
answers {"secs": ...}. Voice = the model's default voice ("Voz nueva A",
chosen by the owner on 2026-11-13). Long texts are split into sentence groups.
"""
import json, re, sys, os
# keep stdout clean for the protocol: libraries print to it
_out = os.fdopen(os.dup(1), "w", buffering=1)
os.dup2(2, 1)
sys.stdout = sys.stderr
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
import torch, torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

m = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
import numpy as np, scipy.signal as ss, unicodedata
from faster_whisper import WhisperModel
asr = WhisperModel("small", device="cpu", compute_type="int8")


def words(t):
    t = unicodedata.normalize("NFKD", t.lower())
    t = "".join(c for c in t if c.isalnum() or c.isspace())
    return t.split()


def coverage(w, text):
    a = ss.resample_poly(w[0].numpy(), 16000, m.sr).astype("float32")
    segs, _ = asr.transcribe(a, language="es")
    heard = set(words(" ".join(x.text for x in segs)))
    want = words(text)
    return sum(1 for x in want if x in heard) / max(1, len(want))
_out.write(json.dumps({"ready": True}) + "\n")


def chunks(text, limit=230):
    sents = re.split(r"(?<=[.!?…])\s+", text.strip())
    out, cur = [], ""
    for s in sents:
        if cur and len(cur) + len(s) + 1 > limit:
            out.append(cur); cur = s
        else:
            cur = (cur + " " + s).strip()
    if cur:
        out.append(cur)
    return out


for line in sys.stdin:
    req = json.loads(line)
    pieces = []
    gap = torch.zeros(1, int(m.sr * 0.18))
    for i, c in enumerate(chunks(req["text"])):
        best, best_cov = None, -1
        for attempt in range(3):  # QA: regenerate if words are missing (truncation/garbling)
            torch.manual_seed(1 + i + 1000 * attempt)
            w = m.generate(c, language_id="es", exaggeration=0.55, cfg_weight=0.5)
            cov = coverage(w, c)
            if cov > best_cov:
                best, best_cov = w, cov
            if cov >= 0.8:
                break
        if best_cov < 0.8:
            print(f"QA low coverage {best_cov:.2f}: {c}", file=sys.stderr, flush=True)
        w = best
        if pieces:
            pieces.append(gap)
        pieces.append(w)
    wav = torch.cat(pieces, dim=1)
    torchaudio.save(req["out"], wav, m.sr)
    _out.write(json.dumps({"secs": wav.shape[-1] / m.sr}) + "\n")
