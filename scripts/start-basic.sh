#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ -z "${DOCKER_CONFIG:-}" ]; then
  export DOCKER_CONFIG="$ROOT_DIR/.docker-config-local"
  mkdir -p "$DOCKER_CONFIG"
  if [ ! -f "$DOCKER_CONFIG/config.json" ]; then
    printf '{}\n' > "$DOCKER_CONFIG/config.json"
  fi
fi

APP_IMAGE="${APP_IMAGE:-contentflow-contentflow-local:ai-generate}"
FALLBACK_IMAGE="${FALLBACK_IMAGE:-contentflow-postiz-local:ai-generate}"
APP_CONTAINER="${APP_CONTAINER:-contentflow}"
APP_URL="${APP_URL:-http://localhost:4007}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yaml}"
REBUILD="${REBUILD:-false}"
RESET_DB="${RESET_DB:-false}"

log() {
  printf '\n\033[1;36m%s\033[0m\n' "$1"
}

warn() {
  printf '\n\033[1;33m%s\033[0m\n' "$1"
}

wait_for_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-60}"

  for _ in $(seq 1 "$attempts"); do
    if node -e "fetch(process.argv[1]).then(r=>process.exit(r.status < 500 ? 0 : 1)).catch(()=>process.exit(1))" "$url"; then
      log "$label OK: $url"
      return 0
    fi
    sleep 2
  done

  warn "$label nao respondeu a tempo: $url"
  return 1
}

log "Limpando containers antigos que prendem a porta 4007"
docker rm -f postiz postiz-postgres postiz-redis >/dev/null 2>&1 || true

log "Derrubando stack atual do ContentFlow"
docker compose -f "$COMPOSE_FILE" down --remove-orphans

if [ "$RESET_DB" = "true" ]; then
  warn "RESET_DB=true ativo: removendo volume local do Postgres"
  docker volume rm contentflow_postgres-volume >/dev/null 2>&1 || true
fi

if [ "$REBUILD" = "true" ]; then
  log "Rebuildando imagem local: $APP_IMAGE"
  docker build -f Dockerfile.dev -t "$APP_IMAGE" .
elif ! docker image inspect "$APP_IMAGE" >/dev/null 2>&1; then
  if docker image inspect "$FALLBACK_IMAGE" >/dev/null 2>&1; then
    log "Usando imagem local existente: $FALLBACK_IMAGE"
    docker tag "$FALLBACK_IMAGE" "$APP_IMAGE"
  else
    warn "Imagem $APP_IMAGE nao encontrada. Tentando rebuild."
    docker build -f Dockerfile.dev -t "$APP_IMAGE" .
  fi
else
  log "Usando imagem local existente: $APP_IMAGE"
fi

log "Subindo banco, redis, temporal e app"
docker compose -f "$COMPOSE_FILE" up -d \
  contentflow-postgres \
  contentflow-redis \
  temporal-postgresql \
  temporal-elasticsearch \
  temporal \
  "$APP_CONTAINER"

log "Aguardando auto-start interno do app estabilizar"
sleep 25

log "Iniciando backend e frontend explicitamente dentro do container"
docker exec "$APP_CONTAINER" sh -lc '
  set -eu

  start_basic_processes() {
    pm2 delete backend >/dev/null 2>&1 || true
    pm2 delete frontend >/dev/null 2>&1 || true

    if command -v ss >/dev/null 2>&1; then
      for port in 3000 4200; do
        pids=$(ss -ltnp 2>/dev/null | awk "/:${port} / {print \$NF}" | sed -n "s/.*pid=\([0-9]*\).*/\1/p" | sort -u)
        for pid in $pids; do
          kill -9 "$pid" >/dev/null 2>&1 || true
        done
      done
    fi

    cd /app/apps/backend
    pm2 start node --name backend -- --experimental-require-module ./dist/apps/backend/src/main.js

    cd /app/apps/frontend
    pm2 start pnpm --name frontend -- start
  }

  start_basic_processes
  sleep 8

  counts=$(pm2 jlist | node -e "let s=\"\";process.stdin.on(\"data\",d=>s+=d);process.stdin.on(\"end\",()=>{const p=JSON.parse(s||\"[]\"); const b=p.filter(x=>x.name===\"backend\").length; const f=p.filter(x=>x.name===\"frontend\").length; console.log(b+\":\"+f)})")
  if [ "$counts" != "1:1" ]; then
    echo "PM2 duplicado detectado ($counts). Limpando e subindo novamente."
    start_basic_processes
    sleep 8
  fi

  pm2 save >/dev/null 2>&1 || true
'

log "Status dos processos internos"
docker exec "$APP_CONTAINER" sh -lc 'pm2 status; ss -ltnp 2>/dev/null | sed -n "1,120p" || true'

log "Validando frontend e backend"
wait_for_http "$APP_URL/auth" "Frontend" 60
wait_for_http "$APP_URL/api/settings/team" "Backend via API" 60 || {
  warn "Backend ainda falhou. Ultimos logs:"
  docker exec "$APP_CONTAINER" sh -lc 'pm2 status; tail -n 120 /root/.pm2/logs/backend-error.log || true'
  exit 1
}

log "Sistema basico iniciado"
printf '%s\n' "Frontend: $APP_URL"
printf '%s\n' "API:      $APP_URL/api"
