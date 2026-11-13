#!/usr/bin/env python3
"""Print the Metricool `info` JSON for a Short (YouTube + TikTok) or long video (YouTube).

Usage: python3 scripts/post_info.py <episode id> HH:MM [thumb]
"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
eid, hhmm = sys.argv[1], sys.argv[2]
ep = json.load(open(ROOT / "episodes" / f"{eid}.json"))
base = "https://raw.githubusercontent.com/gonzaloliano02-svg/pepe-monedas-videos/media/"
date = eid[:10]
long_ = ep.get("format") == "story"
tags = ep.get("tags", [])
text = ep["description"]
if not long_:
    text += "\n\n" + " ".join("#" + t.replace(" ", "") for t in (["escalabrutal"] + tags)[:6])
info = {"autoPublish": True, "draft": False, "descendants": [], "firstCommentText": "", "hasNotReadNotes": False,
        "media": [base + f"{eid}.mp4"], "mediaAltText": [], "shortener": False, "smartLinkData": {"ids": []},
        "publicationDate": {"dateTime": f"{date}T{hhmm}:00", "timezone": "Europe/Madrid"}, "text": text,
        "youtubeData": {"title": ep["title"], "type": "video" if long_ else "short", "privacy": "public",
                        "madeForKids": False, "isAiGeneratedContent": False, "category": "EDUCATION", "tags": tags}}
if long_:
    info["providers"] = [{"network": "youtube"}]
    if len(sys.argv) > 3:
        info["videoThumbnailUrl"] = base + f"{eid}-thumb.jpg"
else:
    info["providers"] = [{"network": "youtube"}, {"network": "tiktok"}]
    info["tiktokData"] = {"privacyOption": "PUBLIC_TO_EVERYONE", "title": ep["title"], "isAigc": True}
print(json.dumps(info, ensure_ascii=False))
