# syntax = docker/dockerfile
# escape = \
#FROM openalpr/openalpr:latest
#CMD ["node", "index.js"]
FROM openalpr/openalpr:latest
LABEL maintainer = "Edgars Izvestnijs"
LABEL description = "OpenALPR license plate detection"
LABEL version = "1.1"
ENV DIR = /home/groupwork/WebstormProjects/plate-recognition
ENV NVM_DIR /usr/local/nvm
ARG DEBIAN_FRONTEND=noninteractive
SHELL ["/bin/bash", "-l", "-euxo", "pipefail", "-c"]
RUN apt-get update; \
    apt-get full-upgrade -y; \
    apt-get install -y --no-install-recommends \
        ca-certificates \
        curl wget; \
    apt-get clean; \
    rm -rf /var/lib/apt/lists/*
RUN mkdir -p "$NVM_DIR"; \
    curl -o- "https://raw.githubusercontent.com/nvm-sh/nvm/master/install.sh" | bash; \
    source $NVM_DIR/nvm.sh; \
    nvm install node --latest-npm \
    apt-get autoremove -f
#RUN npm install -g npm@latest \
#    npm install amqplib body-parser cors express express-fileupload minio morgan nodemailer util --save \
#    npm config set unsafe-perm true \
#    npm install --save-dev nodemon
COPY . ./
CMD ["node", "index.js"]


