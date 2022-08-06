FROM node:16-alpine
MAINTAINER lgou2w <lgou2w@hotmail.com>

RUN npm install --location=global pnpm@^7

WORKDIR /app
COPY package.json pnpm-lock.yaml /app/
RUN pnpm install

COPY . /app
RUN pnpm build

CMD ["pnpm", "start"]
