#!/bin/bash
# Daily queue 2026-11-19: waits for each episode JSON to exist, builds in order.
cd /home/user/pepe-monedas-videos
D=2026-11-19
for x in a b L1 c; do
  f=episodes/$D-$x.json
  until [ -f "$f" ] && [ ! -f "$f.wip" ]; do sleep 20; done
  if [ -f videos/$D-$x.mp4 ] && grep -q "^OK" build/$D-$x.log 2>/dev/null; then continue; fi
  python3 scripts/build_episode.py "$f" > build/$D-$x.log 2>&1
done
