FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

COPY package.json server.js install.sh ./

RUN chmod +x /app/install.sh

EXPOSE 3000

CMD ["node", "server.js"]
