FROM node:16-alpine

run npm -v

RUN apk add  --no-cache ffmpeg

RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python

WORKDIR /usr/app

COPY package*.json ./

RUN npm install --quiet

COPY . .

CMD npm run start