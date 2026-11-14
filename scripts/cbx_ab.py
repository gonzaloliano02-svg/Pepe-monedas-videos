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

# A: actual (bloques de 230 caracteres, exag 0.55, cfg 0.5, pausa fija 0.18 s)
torch.manual_seed(1)
a = m.generate(TEXT, language_id="es", exaggeration=0.55, cfg_weight=0.5)
torchaudio.save(f"{OUT}/A_actual.wav", a, m.sr)

# B: frase a frase, más expresiva, ritmo más pausado, pausas según puntuación
sents = re.split(r"(?<=[.!?…])\s+", TEXT.strip())
parts = []
for i, s in enumerate(sents):
    torch.manual_seed(1 + i)
    w = trim(m.generate(s, language_id="es", exaggeration=0.7, cfg_weight=0.3, temperature=0.8))
    parts.append(w)
    end = s.rstrip()[-1]
    parts.append(sil(0.55 if end == "?" else 0.6 if s.rstrip().endswith("...") else 0.42))
b = torch.cat(parts[:-1], dim=1)
torchaudio.save(f"{OUT}/B_natural.wav", b, m.sr)
print("done")
