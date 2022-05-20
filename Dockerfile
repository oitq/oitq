FROM node:lts-alpine
LABEL maintainer="NN708"

RUN npm init oitq oitq-app -y && cd oitq-app && \
    npm install

WORKDIR /oitq-app

ENTRYPOINT [ "npm", "start" ]
