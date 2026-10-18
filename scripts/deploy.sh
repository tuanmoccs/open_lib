#!/usr/bin/env bash
# Pull the latest code and (re)build the stack. Run from the repository root on the VPS.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "Missing .env - copy .env.example to .env and fill in the values first." >&2
  exit 1
fi

git pull --ff-only
docker compose up -d --build --remove-orphans
docker image prune -f >/dev/null

echo "Waiting for the API to become healthy..."
for _ in $(seq 1 30); do
  if docker compose exec -T api wget -qO- http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
    docker compose ps
    echo "Deployment finished."
    exit 0
  fi
  sleep 2
done

echo "API did not become healthy in time; recent logs:" >&2
docker compose logs --tail=50 api >&2
exit 1
