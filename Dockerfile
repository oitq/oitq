FROM node:lts-alpine
LABEL maintainer="凉菜"

RUN npm init oitq oitq-app -y -t oitq/server && \
    cd oitq-app && \
    npm install

WORKDIR /oitq-app

ENTRYPOINT [ "npm", "start" ]
