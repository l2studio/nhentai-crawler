FROM node:14-alpine
MAINTAINER lgou2w <lgou2w@hotmail.com>

RUN apk add --no-cache curl
RUN curl -f https://get.pnpm.io/v6.js | node - add --global pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml /app/
RUN pnpm install

COPY . /app
RUN pnpm build

CMD ["pnpm", "start"]
