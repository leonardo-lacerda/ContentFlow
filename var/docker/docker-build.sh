#!/bin/bash

set -o xtrace

docker rmi localhost/contentflow || true
docker build --target dist -t localhost/contentflow -f Dockerfile.dev .
docker build --target devcontainer -t localhost/contentflow-devcontainer -f Dockerfile.dev .
