FROM node:lts-alpine
LABEL maintainer="NN708"

RUN git clone https://github.com/oitq/server.git && cd server  && npm install

WORKDIR /koishi-app

ENTRYPOINT [ "npm", "start" ]
