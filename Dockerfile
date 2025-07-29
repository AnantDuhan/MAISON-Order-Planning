FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN apk add --no-cache python3 make g++

RUN npm install

COPY . .

EXPOSE 4000

CMD [ "node", "backend/server.js" ]