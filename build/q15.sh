#!/bin/bash
# Cola del día: logs con fecha para no confundirse con los de días anteriores.
cd /home/user/pepe-monedas-videos
D=2026-11-15
for x in b c L1 L2; do
  [ -f episodes/$D-$x.json ] || continue
  [ -f videos/$D-$x.mp4 ] && grep -q "^OK" build/$D-$x.log 2>/dev/null && continue
  python3 scripts/build_episode.py episodes/$D-$x.json > build/$D-$x.log 2>&1
done
