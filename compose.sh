#!/bin/bash

docker-compose up -d

docker-compose run node && docker compose run openalpr

sleep 120

docker-compose down
