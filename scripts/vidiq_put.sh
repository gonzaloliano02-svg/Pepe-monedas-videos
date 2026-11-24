#!/bin/bash
# Send a local video to the signed vidIQ storage URL returned by vidiq_video_upload(localFile).
# Same steps as vidIQ's own command (resumable GCS upload), without pasting it every time.
# Usage: scripts/vidiq_put.sh <file> '<signed url>'
set -euo pipefail
F="$1"; U="$2"; N=$(wc -c < "$F" | tr -d ' ')
L=$(curl -q -sS -g --connect-timeout 30 -m 60 -o /dev/null -D - -X POST -H "x-goog-resumable: start" \
  -H "x-upload-content-type: video/mp4" -H "x-upload-content-length: $N" -H "Content-Length: 0" "$U" \
  | tr -d '\r' | grep -i '^location:' | tail -n 1 | sed 's/^[^:]*: *//')
[ -n "$L" ] || { echo "no upload session (link expired?)" >&2; exit 1; }
for i in 1 2 3 4; do
  W=$(curl -q -sS -g --connect-timeout 30 -Y 1 -y 120 -o /dev/null -w "%{http_code}" -X PUT -T "$F" "$L") || true
  case "$W" in 200|201) echo "vidIQ upload complete"; exit 0 ;; esac
  sleep $((2 ** i))
done
echo "upload failed ($W)" >&2; exit 1
