#!/usr/bin/env bash
set -Eeuo pipefail

RELEASE_DIR="${1:?release directory is required}"
DEPLOY_BACKEND="${DEPLOY_BACKEND:-false}"
DEPLOY_FRONTEND="${DEPLOY_FRONTEND:-false}"
ENV_FILE="${CONTENTFLOW_ENV_FILE:-/opt/contentflow/.env}"

log() { printf '[deploy] %s\n' "$*"; }
fail() { log "ERROR: $*" >&2; exit 1; }

[[ "$RELEASE_DIR" == /opt/contentflow-release-* ]] || fail "invalid release directory"
[[ -d "$RELEASE_DIR" ]] || fail "release directory does not exist"
[[ -f "$ENV_FILE" ]] || fail "runtime environment file is missing: $ENV_FILE"
[[ "$DEPLOY_BACKEND" == true || "$DEPLOY_FRONTEND" == true ]] || {
  log "No deployable application changes detected."
  exit 0
}

old_backend_cwd=""
old_frontend_cwd=""
backend_test_pid=""
frontend_test_pid=""

pm2_cwd() {
  local name="$1" pid
  pid="$(pm2 pid "$name" 2>/dev/null || true)"
  [[ "$pid" =~ ^[0-9]+$ ]] && [[ "$pid" != 0 ]] && readlink "/proc/$pid/cwd" 2>/dev/null || true
}

cleanup_tests() {
  [[ -n "$backend_test_pid" ]] && kill "$backend_test_pid" 2>/dev/null || true
  [[ -n "$frontend_test_pid" ]] && kill "$frontend_test_pid" 2>/dev/null || true
}
trap cleanup_tests EXIT

old_backend_cwd="$(pm2_cwd contentflow-backend)"
old_frontend_cwd="$(pm2_cwd contentflow-frontend)"

dependency_source=""
for candidate in "$old_backend_cwd" "$old_frontend_cwd"; do
  if [[ -n "$candidate" && -d "$candidate/node_modules" ]]; then
    dependency_source="$(readlink -f "$candidate/node_modules")"
    break
  fi
done
[[ -n "$dependency_source" && -d "$dependency_source" ]] || fail "could not locate current production dependencies"
dependency_release="$(dirname "$dependency_source")"

log "Preparing release-local dependencies from the production cache"
can_reuse_dependencies=false
if [[ -f "$dependency_release/pnpm-lock.yaml" ]] && cmp -s "$dependency_release/pnpm-lock.yaml" "$RELEASE_DIR/pnpm-lock.yaml"; then
  can_reuse_dependencies=true
fi

cd "$RELEASE_DIR"
if [[ "$can_reuse_dependencies" == true ]]; then
  if [[ ! -f "$RELEASE_DIR/.dependencies-ready" ]]; then
    rm -rf -- "$RELEASE_DIR/node_modules"
    cp -al "$dependency_source" "$RELEASE_DIR/node_modules"
    touch "$RELEASE_DIR/.dependencies-ready"
  fi
  log "Dependency lock is unchanged; reusing the verified production dependency tree"
else
  log "Dependency lock changed; installing an isolated dependency tree"
  pnpm install --frozen-lockfile --prefer-offline
  touch "$RELEASE_DIR/.dependencies-ready"
fi
ln -sfn "$ENV_FILE" "$RELEASE_DIR/.env"
node scripts/validate-runtime-env.mjs --production

if [[ "$DEPLOY_BACKEND" == true ]]; then
  log "Building backend"
  node scripts/swc-compile-backend.js

  log "Preflighting backend on port 3101"
  PORT=3101 CONTENTFLOW_ENV_FILE="$ENV_FILE" node apps/backend/start-production.mjs \
    >"/tmp/contentflow-backend-${GITHUB_SHA:-candidate}.log" 2>&1 &
  backend_test_pid=$!
  backend_ready=false
  for _ in $(seq 1 45); do
    status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:3101/user/self || true)"
    if [[ "$status" == 401 ]]; then backend_ready=true; break; fi
    kill -0 "$backend_test_pid" 2>/dev/null || break
    sleep 1
  done
  if [[ "$backend_ready" != true ]]; then
    cat "/tmp/contentflow-backend-${GITHUB_SHA:-candidate}.log" >&2 || true
    fail "backend preflight failed"
  fi
  kill "$backend_test_pid" 2>/dev/null || true
  wait "$backend_test_pid" 2>/dev/null || true
  backend_test_pid=""
fi

if [[ "$DEPLOY_FRONTEND" == true ]]; then
  log "Building frontend"
  pnpm --filter contentflow-frontend run build

  log "Preflighting frontend on port 4300"
  FRONTEND_PORT=4300 CONTENTFLOW_ENV_FILE="$ENV_FILE" node apps/frontend/start-production.mjs \
    >"/tmp/contentflow-frontend-${GITHUB_SHA:-candidate}.log" 2>&1 &
  frontend_test_pid=$!
  frontend_ready=false
  for _ in $(seq 1 45); do
    status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 3 http://127.0.0.1:4300/auth/login || true)"
    if [[ "$status" == 200 ]]; then frontend_ready=true; break; fi
    kill -0 "$frontend_test_pid" 2>/dev/null || break
    sleep 1
  done
  if [[ "$frontend_ready" != true ]]; then
    cat "/tmp/contentflow-frontend-${GITHUB_SHA:-candidate}.log" >&2 || true
    fail "frontend preflight failed"
  fi
  kill "$frontend_test_pid" 2>/dev/null || true
  wait "$frontend_test_pid" 2>/dev/null || true
  frontend_test_pid=""
fi

rollback_service() {
  local name="$1" old_cwd="$2"
  [[ -n "$old_cwd" && -f "$old_cwd/ecosystem.config.js" ]] || return 1
  log "Rolling back $name to $old_cwd"
  pm2 delete "$name" >/dev/null 2>&1 || true
  CONTENTFLOW_APP_DIR="$old_cwd" pm2 start "$old_cwd/ecosystem.config.js" --only "$name" --update-env
}

switch_service() {
  local name="$1" health_url="$2" expected="$3" old_cwd="$4"
  log "Switching $name to $RELEASE_DIR"
  pm2 delete "$name" >/dev/null 2>&1 || true
  CONTENTFLOW_APP_DIR="$RELEASE_DIR" pm2 start "$RELEASE_DIR/ecosystem.config.js" --only "$name" --update-env

  local healthy=false status
  for _ in $(seq 1 45); do
    status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 3 "$health_url" || true)"
    if [[ "$status" == "$expected" ]]; then healthy=true; break; fi
    sleep 1
  done
  if [[ "$healthy" != true ]]; then
    pm2 logs "$name" --lines 100 --nostream >&2 || true
    rollback_service "$name" "$old_cwd" || true
    fail "$name failed its production health check"
  fi
}

if [[ "$DEPLOY_BACKEND" == true ]]; then
  switch_service contentflow-backend http://127.0.0.1:3000/user/self 401 "$old_backend_cwd"
fi
if [[ "$DEPLOY_FRONTEND" == true ]]; then
  switch_service contentflow-frontend http://127.0.0.1:4200/auth/login 200 "$old_frontend_cwd"
fi

pm2 save
log "Selective deployment completed"
pm2 status

cleanup_old_releases() {
  local active_backend active_frontend candidate resolved
  active_backend="$(pm2_cwd contentflow-backend)"
  active_frontend="$(pm2_cwd contentflow-frontend)"

  # Keep the four newest releases as rollback candidates. Never delete a
  # directory used by either running process, and validate every resolved path
  # before removing it.
  while IFS= read -r candidate; do
    [[ -n "$candidate" ]] || continue
    resolved="$(readlink -f "$candidate")"
    [[ "$resolved" == /opt/contentflow-release-* ]] || continue
    [[ "$resolved" != "$active_backend" && "$resolved" != "$active_frontend" ]] || continue
    log "Removing stale release $resolved"
    if [[ -d /opt/contentflow-repository.git ]] &&
      git --git-dir=/opt/contentflow-repository.git worktree list --porcelain | grep -Fxq "worktree $resolved"; then
      git --git-dir=/opt/contentflow-repository.git worktree remove --force "$resolved"
    else
      rm -rf -- "$resolved"
    fi
  done < <(
    find /opt -maxdepth 1 -mindepth 1 -type d -name 'contentflow-release-*' -printf '%T@ %p\n' |
      sort -nr | awk 'NR > 4 { $1=""; sub(/^ /, ""); print }'
  )
}

cleanup_old_releases
