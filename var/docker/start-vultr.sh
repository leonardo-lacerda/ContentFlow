#!/usr/bin/env bash
set -euo pipefail

cd /app

echo "[contentflow] waiting for postgres/redis..."
sleep 5

echo "[contentflow] starting nginx..."
nginx

echo "[contentflow] prisma db push..."
pnpm run prisma-db-push || true

echo "[contentflow] starting backend + frontend (no temporal/orchestrator)..."
pm2 delete all >/dev/null 2>&1 || true

pm2 start pnpm --name backend --cwd /app -- --filter ./apps/backend start
pm2 start pnpm --name frontend --cwd /app -- --filter ./apps/frontend start

echo "[contentflow] processes:"
pm2 status

# Keep container alive with logs
exec pm2 logs --raw
