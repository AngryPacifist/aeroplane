FROM node:22-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production \
    PORT=4310 \
    HOST=0.0.0.0 \
    DATA_DIR=/data

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    docker.io \
    git \
    openssh-client \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://railpack.com/install.sh | sh -s -- --bin-dir /usr/local/bin

WORKDIR /app

COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

RUN mkdir -p /data

VOLUME ["/data"]
EXPOSE 4310

CMD ["node", "dist/server/index.js"]
