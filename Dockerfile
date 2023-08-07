FROM node:16-alpine

RUN apk add  --no-cache ffmpeg build-base make

RUN apk add --update --no-cache python3 && ln -sf python3 /usr/bin/python

WORKDIR /usr/app

COPY package*.json ./

RUN npm install --quiet

COPY setup/write_service_account.sh /usr/app/write_service_account.sh

RUN chmod +x /usr/app/write_service_account.sh

COPY . .

CMD /usr/app/write_service_account.sh && npm run start