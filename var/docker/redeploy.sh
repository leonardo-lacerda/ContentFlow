#!/bin/bash

set -e

IMAGE="localhost/contentflow"
CONTAINER="contentflow"
ENV_FILE="${ENV_FILE:-}"

echo "==> [1/4] Parando e removendo container existente..."
docker kill "$CONTAINER" 2>/dev/null || true
docker rm "$CONTAINER" 2>/dev/null || true

echo "==> [2/4] Removendo imagem antiga..."
docker rmi "$IMAGE" 2>/dev/null || true

echo "==> [3/4] Buildando nova imagem..."
docker build -t "$IMAGE" -f Dockerfile.dev .

echo "==> [4/4] Criando e iniciando container..."

DOCKER_ARGS=(
  --name "$CONTAINER"
  -p 5000:5000
  -p 3000:3000
  -p 4200:4200
)

if [ -n "$ENV_FILE" ]; then
  DOCKER_ARGS+=(--env-file "$ENV_FILE")
fi

docker run -d "${DOCKER_ARGS[@]}" "$IMAGE"

echo ""
echo "Container '$CONTAINER' rodando. Logs:"
docker logs -f "$CONTAINER"
