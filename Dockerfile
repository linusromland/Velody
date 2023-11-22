FROM node:20.9.0-alpine3.18

RUN apk add  --no-cache ffmpeg build-base make

RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python

WORKDIR /usr/app

COPY package*.json ./

RUN npm install --quiet

COPY . .

CMD npm run start