sudo groupadd docker

sudo usermod -aG docker echo "$USER"

newgrp docker

docker run --rm hello-world

docker version