#!/bin/bash

docker buildx build --platform linux/arm64,linux/amd64 -t mitrehealthdocker/measure-repository-service:latest -f service.Dockerfile . --push
docker buildx build --platform linux/arm64,linux/amd64 -t mitrehealthdocker/measure-repository-app:latest -f app.Dockerfile . --push