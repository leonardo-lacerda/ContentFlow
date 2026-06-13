#!/bin/bash

set -o xtrace

docker rmi localhost/contentflow || true
docker build -t localhost/contentflow -f Dockerfile.dev .
