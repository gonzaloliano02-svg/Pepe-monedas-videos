#!/bin/bash
# Publish today's media files (videos, thumbnails) on the `media` branch so
# Metricool can fetch them from raw.githubusercontent.com. The branch only
# keeps the current day's files (it is recreated each new day), so the repo
# does not grow with every video. Metricool copies a file the moment a post
# is scheduled, so old files are not needed afterwards.
#
# Usage: scripts/publish_media.sh videos/2026-11-13-a.mp4 videos/2026-11-13-L1.mp4 ...
# Prints the public URL of each file.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="gonzaloliano02-svg/pepe-monedas-videos"
TODAY="$(TZ=Europe/Madrid date +%F)"
WT="$ROOT/build/media-wt"
cd "$ROOT"
git worktree remove --force "$WT" 2>/dev/null || rm -rf "$WT"
git worktree prune
if git fetch -q origin media 2>/dev/null && git log -1 --format=%s FETCH_HEAD | grep -q "$TODAY"; then
  git worktree add -q --detach "$WT" FETCH_HEAD
else
  git worktree add -q --detach "$WT"
  (cd "$WT" && git checkout -q --orphan media-new && git rm -rfq --cached . && find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +)
fi
for f in "$@"; do cp "$ROOT/$f" "$WT/"; done
cd "$WT"
git add -A
git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -qm "media $TODAY" || true
for i in 1 2 3 4; do git push -q -f origin HEAD:media && break || sleep $((2 ** i)); done
cd "$ROOT"
git worktree remove --force "$WT"
for f in "$@"; do echo "https://raw.githubusercontent.com/$REPO/media/$(basename "$f")"; done
