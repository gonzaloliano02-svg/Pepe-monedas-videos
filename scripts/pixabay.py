#!/usr/bin/env python3
"""Search Pixabay for vertical HD footage (free, commercial use, no attribution required).

Usage: python3 scripts/pixabay.py "sperm whale" [n]
Prints: <mp4 url>  <seconds>s  <w>x<h>  <user>  <pixabay page>

Reads the key from the PIXABAY_API_KEY environment variable (set in the
cloud environment's settings). Vertical clips are listed first; if there
are not enough, the best landscape ones follow (they get centre-cropped).
"""
import json
import os
import sys
import urllib.parse
import urllib.request


def search(query: str, n: int = 6):
    key = os.environ.get("PIXABAY_API_KEY")
    if not key:
        sys.exit("PIXABAY_API_KEY is not set in this session")
    url = "https://pixabay.com/api/videos/?" + urllib.parse.urlencode(
        {"key": key, "q": query, "per_page": 50, "safesearch": "true"}
    )
    req = urllib.request.Request(url, headers={"User-Agent": "escala-brutal/1.0"})
    data = json.load(urllib.request.urlopen(req, timeout=30))
    rows = []
    for h in data.get("hits", []):
        vids = [v for v in h["videos"].values() if v.get("url") and v.get("width")]
        if not vids:
            continue
        # best rendition up to ~1080 wide (4K files are huge and slow to render)
        ok = [v for v in vids if min(v["width"], v["height"]) <= 1080] or vids
        best = max(ok, key=lambda v: v["width"] * v["height"])
        portrait = best["height"] > best["width"]
        rows.append((portrait, min(best["width"], best["height"]), best["url"],
                     h["duration"], best["width"], best["height"], h["user"], h["pageURL"]))
    rows.sort(key=lambda r: (not r[0], -r[1]))
    return rows[:n]


if __name__ == "__main__":
    q = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 8
    for portrait, _, link, dur, w, h, who, page in search(q, n):
        print(f"{link}  {dur}s  {w}x{h}{'' if portrait else ' (landscape)'}  {who}  {page}")
