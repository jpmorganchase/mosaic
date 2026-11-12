#!/usr/bin/env bash
set -euo pipefail
mode="${1:?Usage: bash examples/docker/smoke.sh active|snapshot|static}"
suffix="mosaic-smoke-$$"
network="$suffix"
site="$suffix-site"
fs="$suffix-fs"
cleanup() {
  result=$?
  if [ "$result" -ne 0 ]; then
    docker logs "$site" 2>/dev/null || true
    docker logs "$fs" 2>/dev/null || true
  fi
  docker rm -f "$site" "$fs" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
  exit "$result"
}
trap cleanup EXIT
docker network create "$network" >/dev/null
case "$mode" in
  active)
    docker build -f examples/docker/active-mode/Dockerfile.fs -t "$fs" .
    docker build -f examples/docker/active-mode/Dockerfile.site -t "$site" .
    # Exercise a runtime PORT override as well as cross-container binding.
    docker run -d --name "$fs" --network "$network" --network-alias mosaic-fs -e PORT=8081 "$fs"
    docker run -d --name "$site" --network "$network" -e MOSAIC_ACTIVE_MODE_URL=http://mosaic-fs:8081 -p 127.0.0.1::3000 "$site"
    port="$(docker port "$site" 3000/tcp | sed 's/.*://')"
    # The site container, not the host, must reach the CLI listener.
    docker exec "$site" node -e '
      (async () => {
        for (let i = 0; i < 60; i++) {
          try {
            const r = await fetch("http://mosaic-fs:8081/actuator/keepalive");
            if (r.ok) return;
          } catch {}
          await new Promise(r => setTimeout(r, 1000));
        }
        process.exit(1);
      })();'
    ;;
  snapshot)
    docker build -f examples/docker/snapshot-mode/Dockerfile -t "$site" .
    docker run -d --name "$site" --network "$network" -p 127.0.0.1::3000 "$site"
    port="$(docker port "$site" 3000/tcp | sed 's/.*://')"
    ;;
  static)
    docker build -f examples/docker/static-export/Dockerfile -t "$site" .
    docker run -d --name "$site" --network "$network" -p 127.0.0.1::80 "$site"
    port="$(docker port "$site" 80/tcp | sed 's/.*://')"
    ;;
  *) echo "Unknown mode: $mode" >&2; exit 2 ;;
esac
for attempt in $(seq 1 90); do
  if curl --fail --silent --location --max-time 10 "http://127.0.0.1:$port/mosaic/index" | grep Mosaic >/dev/null; then
    echo "$mode: content page served successfully"
    exit 0
  fi
  sleep 2
done
docker logs "$site"
if [ "$mode" = active ]; then docker logs "$fs"; fi
exit 1
