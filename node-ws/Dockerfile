# syntax = docker/dockerfile
# escape = \
FROM node:latest
LABEL maintainer = "Edgars Izvestnijs"
LABEL description = "NodeJS Express Web Service."
LABEL version = "1.1"
ENV DIR = /home/groupwork/WebstormProjects/plate-recognition/node-ws
WORKDIR ${DIR}
ARG DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y software-properties-common wget curl \
&& apt-get upgrade -y && apt-get autoremove -f
COPY . .
RUN npm install amqplib body-parser cors express express-fileupload minio morgan nodemailer util --save \
&& npm install -g npm@latest \
&& npm install --save-dev nodemon
CMD ["node", "index.js"]

