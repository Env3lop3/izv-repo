#!/bin/bash

docker pull node:latest && docker pull openalpr/openalpr:latest \
&& docker pull minio/minio:latest && docker pull rabbitmq:latest \
&& docker pull mongo:latest