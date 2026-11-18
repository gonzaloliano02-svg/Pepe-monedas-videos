cd /home/user/pepe-monedas-videos
D=2026-11-18
for x in a b L1 c; do
  [ -f episodes/$D-$x.json ] || continue
  [ -f videos/$D-$x.mp4 ] && grep -q "^OK" build/$D-$x.log 2>/dev/null && continue
  python3 scripts/build_episode.py episodes/$D-$x.json > build/$D-$x.log 2>&1
done
