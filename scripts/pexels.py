#!/usr/bin/env python3
"""Search Pexels for vertical HD footage.

Usage: python3 scripts/pexels.py "sperm whale underwater" [n]
Prints: <mp4 url>  <seconds>s  <w>x<h>  <photographer>  <pexels page>

The API key is injected by the cloud environment's network proxy for
api.pexels.com, so no key is read here.
"""
import json
import sys
import urllib.parse
import urllib.request


def search(query: str, n: int = 6):
    url = "https://api.pexels.com/videos/search?" + urllib.parse.urlencode(
        {"query": query, "orientation": "portrait", "size": "medium", "per_page": 15}
    )
    req = urllib.request.Request(url, headers={"Authorization": "proxy-injected"})
    data = json.load(urllib.request.urlopen(req, timeout=30))
    out = []
    for v in data.get("videos", []):
        files = [
            f for f in v["video_files"]
            if f.get("width") and f.get("height") and f["height"] > f["width"]
            and 720 <= f["width"] <= 1080 and f.get("file_type") == "video/mp4"
        ]
        if not files:
            continue
        best = max(files, key=lambda f: f["width"])
        out.append((best["link"], v["duration"], best["width"], best["height"], v["user"]["name"], v["url"]))
    return out[:n]


if __name__ == "__main__":
    q = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    for link, dur, w, h, who, page in search(q, n):
        print(f"{link}  {dur}s  {w}x{h}  {who}  {page}")
