#!/bin/bash

sudo apt-get purge docker-ce docker-ce-cli containerd.io

sudo apt-get autoremove -y --purge docker-ce docker-ce-cli containerd.io

sudo umount /var/lib/docker/

sudo rm -rf /var/lib/docker /etc/docker

sudo rm /etc/apparmor.d/docker

sudo groupdel docker

sudo rm -rf /var/run/docker.sock

sudo rm -rf /usr/bin/docker-compose