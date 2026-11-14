"""Chatterbox multilingual TTS worker (runs in /opt/cbx/venv).

Reads JSON lines {"text": ..., "out": ...} on stdin, writes a WAV for each and
answers {"secs": ...}. Voice = the model's default voice ("Voz nueva A",
chosen by the owner on 2026-11-13). Delivery "C" approved by the owner on
2026-11-14: sentence by sentence (short sentences merged), exaggeration 0.6,
cfg 0.4, temperature 0.75, silence trimmed and pauses by punctuation, Whisper QA
that also penalises hallucinated extra words.
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


from num2words import num2words


def words(t):
    t = re.sub(r"\d+", lambda x: " " + num2words(int(x.group()), lang="es") + " ", t.replace(".", " . "))
    t = unicodedata.normalize("NFKD", t.lower())
    t = "".join(c for c in t if c.isalnum() or c.isspace())
    return t.split()


def coverage(w, text):
    a = ss.resample_poly(w[0].numpy(), 16000, m.sr).astype("float32")
    segs, _ = asr.transcribe(a, language="es")
    heard = words(" ".join(x.text for x in segs))
    want = words(text)
    hs = set(heard)
    c = sum(1 for x in want if x in hs) / max(1, len(want))
    return c - max(0, len(heard) - len(want) - 1) / max(1, len(want))  # penalise hallucinations
_out.write(json.dumps({"ready": True}) + "\n")


def chunks(text, minlen=45, limit=230):
    """One sentence per generation; very short sentences are merged with the previous one."""
    sents = re.split(r"(?<=[.!?…])\s+", text.strip())
    out = []
    for x in sents:
        if out and (len(out[-1]) < minlen or len(x) < 25) and len(out[-1]) + len(x) < limit:
            out[-1] += " " + x
        else:
            out.append(x)
    return out


def trim(w, thr=0.01):
    a = w[0].abs()
    idx = (a > thr).nonzero()
    if len(idx) == 0:
        return w
    s0 = max(0, idx[0].item() - int(0.03 * m.sr))
    s1 = min(w.shape[1], idx[-1].item() + int(0.08 * m.sr))
    return w[:, s0:s1]


def pause(chunk):
    c = chunk.rstrip()
    return 0.55 if c.endswith("?") or c.endswith("...") or c.endswith("…") else 0.45


for line in sys.stdin:
    req = json.loads(line)
    pieces = []
    for i, c in enumerate(chunks(req["text"])):
        best, best_cov = None, -99
        for attempt in range(4):  # QA: regenerate if words are missing (truncation/garbling)
            torch.manual_seed(1 + i + 1000 * attempt)
            w = trim(m.generate(c, language_id="es", exaggeration=0.6, cfg_weight=0.4, temperature=0.75))
            cov = coverage(w, c)
            if cov > best_cov:
                best, best_cov = w, cov
            if cov >= 0.9:
                break
        if best_cov < 0.8:
            print(f"QA low coverage {best_cov:.2f}: {c}", file=sys.stderr, flush=True)
        w = best
        if pieces:
            pieces.append(torch.zeros(1, int(m.sr * pause(prev))))
        pieces.append(w)
        prev = c
    wav = torch.cat(pieces, dim=1)
    torchaudio.save(req["out"], wav, m.sr)
    _out.write(json.dumps({"secs": wav.shape[-1] / m.sr}) + "\n")
