#!/usr/bin/env bash
# Screenshot routes of the Expo web build (apps/mobile) at phone size, for PR messages.
#
# Usage: bash scripts/screenshot.sh <out-dir> <route> [route...]
#   e.g. bash scripts/screenshot.sh pitch/media/pr/my-branch / /plan
#
# Writes one PNG per route (/ -> home.png, /plan/hotels -> plan-hotels.png).
set -euo pipefail

PLAYWRIGHT=playwright@1.64.0
SERVE=serve@14.2.6
PORT=4173

if [ $# -lt 2 ]; then
  echo "usage: bash scripts/screenshot.sh <out-dir> <route> [route...]" >&2
  exit 1
fi
if [ ! -d apps/mobile ]; then
  echo "apps/mobile doesn't exist yet; nothing to screenshot" >&2
  exit 1
fi

out="$1"
shift
mkdir -p "$out"

pnpm --dir apps/mobile exec expo export --platform web --output-dir dist
npx -y "$PLAYWRIGHT" install --with-deps chromium > /dev/null

npx -y "$SERVE" -s apps/mobile/dist -l "$PORT" > /dev/null 2>&1 &
server=$!
trap 'kill "$server" 2> /dev/null || true' EXIT

for _ in $(seq 30); do
  curl -sf "http://localhost:$PORT" > /dev/null && break
  sleep 1
done

for route in "$@"; do
  name=$(printf '%s' "$route" | sed 's#^/##; s#/$##; s#/#-#g')
  name=${name:-home}
  npx -y "$PLAYWRIGHT" screenshot --device "iPhone 14" --wait-for-timeout 2000 \
    "http://localhost:$PORT$route" "$out/$name.png"
done

ls -1 "$out"
