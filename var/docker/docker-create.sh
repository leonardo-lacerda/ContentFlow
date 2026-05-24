#!/usr/bin/env bash

docker kill contentflow || true 
docker rm contentflow || true 
docker create --name contentflow -p 3000:3000 -p 4200:4200 localhost/contentflow
