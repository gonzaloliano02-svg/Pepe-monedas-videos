"""A/B de naturalidad para la voz 2A (Chatterbox default). Uso: cbx_ab.py OUTDIR"""
import os, re, sys
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
import torch, torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS
m = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
OUT = sys.argv[1]
TEXT = ("La noche del nueve de julio de mil novecientos cincuenta y ocho, la bahía de Lituya estaba en calma. "
        "Tres barcos pescaban tranquilos, con el sol todavía en el horizonte. "
        "Y entonces, a las diez y diecisiete, la tierra empezó a temblar. "
        "¿Qué pasa cuando media montaña cae al agua de golpe? "
        "Pues que el agua no tiene adónde ir... y sube. Sube quinientos veinticuatro metros.")

def trim(w, thr=0.01):
    a = w[0].abs()
    idx = (a > thr).nonzero()
    if len(idx) == 0:
        return w
    s, e = max(0, idx[0].item() - int(0.03 * m.sr)), min(w.shape[1], idx[-1].item() + int(0.08 * m.sr))
    return w[:, s:e]

def sil(sec):
    return torch.zeros(1, int(m.sr * sec))

import numpy as np, scipy.signal as ss, unicodedata
from faster_whisper import WhisperModel
asr = WhisperModel("small", device="cpu", compute_type="int8")
def words(t):
    t = unicodedata.normalize("NFKD", t.lower())
    return "".join(c for c in t if c.isalnum() or c.isspace()).split()
def cov(w, text):
    x = ss.resample_poly(w[0].numpy(), 16000, m.sr).astype("float32")
    segs, _ = asr.transcribe(x, language="es")
    heard = words(" ".join(z.text for z in segs)); want = words(text)
    hs = set(heard)
    c = sum(1 for z in want if z in hs) / max(1, len(want))
    extra = max(0, len(heard) - len(want)) / max(1, len(want))  # penaliza alucinaciones
    return c - extra

def groups(text, minlen=45):
    sents = re.split(r"(?<=[.!?…])\s+", text.strip())
    out = []
    for x in sents:
        if out and len(out[-1]) < minlen:
            out[-1] += " " + x
        else:
            out.append(x)
    return out

parts = []
for i, g in enumerate(groups(TEXT)):
    best, bc = None, -9
    for att in range(4):
        torch.manual_seed(1 + i + 1000 * att)
        w = trim(m.generate(g, language_id="es", exaggeration=0.6, cfg_weight=0.4, temperature=0.75))
        c = cov(w, g)
        if c > bc: best, bc = w, c
        if c >= 0.9: break
    print("grupo", i, round(bc, 2), g, flush=True)
    parts.append(best)
    parts.append(sil(0.55 if g.rstrip().endswith("?") else 0.45))
torchaudio.save(f"{OUT}/C_natural.wav", torch.cat(parts[:-1], dim=1), m.sr)
print("done")
