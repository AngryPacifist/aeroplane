FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY server.js analytics.js install.sh ./

RUN chmod +x /app/install.sh

EXPOSE 3000

CMD ["node", "server.js"]
