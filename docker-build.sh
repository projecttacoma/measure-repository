npm#!/bin/bash

docker buildx build --platform linux/arm64,linux/amd64 -t tacoma/measure-repository-service:latest -f service.Dockerfile . --push
docker buildx build --platform linux/arm64,linux/amd64 -t tacoma/measure-repository-app:latest -f app.Dockerfile . --push