#!/bin/bash
cd /home/user/pepe-monedas-videos
while pgrep -f "build_episode.py episodes/2026-11-15-a" >/dev/null; do sleep 10; done
for x in a b c L1 L2; do
  [ -f episodes/2026-11-15-$x.json ] || continue
  grep -q "^OK" build/$x.log 2>/dev/null && continue
  python3 scripts/build_episode.py episodes/2026-11-15-$x.json > build/$x.log 2>&1
done
