# Deploy

A self-hostable deployment control plane MVP. It connects a GitHub repo, builds source with Railpack, runs the app with Docker, streams deployment logs, injects environment variables, and writes Caddy routes for custom domains.

## What Works Now

- Project creation from a Git repository URL.
- Manual deploys.
- GitHub push webhooks per project.
- Railpack build orchestration.
- Docker runtime orchestration.
- Live deployment log streaming.
- Environment variable CRUD with redacted logs.
- Domain CRUD with generated Caddy config.
- Host prerequisite checks in the dashboard.

## Stack

- TypeScript
- React + Vite
- Hono on Node.js
- SQLite + Drizzle
- Railpack + BuildKit
- Docker Engine
- Caddy

## Local Development

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

For UI-only testing, set `DEPLOY_DRY_RUN=true` in `.env`. Deployments will queue, log, and complete without cloning, building, or starting containers.

## Host Bootstrap

On the target Linux host:

```bash
./scripts/bootstrap-host.sh
```

On macOS with Docker Desktop and Homebrew:

```bash
./scripts/bootstrap-mac.sh
```

Then set these in `.env`:

```bash
BUILDKIT_HOST=tcp://127.0.0.1:1234
DEPLOY_DRY_RUN=false
```

`BUILDKIT_HOST` defaults to `tcp://127.0.0.1:1234`, which matches the bundled bootstrap scripts.

If you run Caddy with the included Compose service, use:

```bash
CADDY_CONFIG_PATH=./data/Caddyfile
CADDY_RELOAD_CMD=true
```

Caddy runs with `--watch`, so file changes are picked up automatically.

## Optional Caddy + BuildKit Services

```bash
docker compose up -d
```

This starts:

- `deploy-buildkit` on `127.0.0.1:1234`
- `deploy-caddy` in host network mode for ports `80` and `443`

Host networking is intended for Linux VPS deployments.

For local Mac testing, run Caddy directly:

```bash
caddy run --config ./data/Caddyfile
```

Use a real domain only if it resolves back to your Mac and inbound ports are reachable. For ordinary local testing, use a temporary Caddyfile with an HTTP localhost port.

For `.localhost` development domains, add names like `hono.localhost` in the dashboard. Deploy writes these as HTTP-only Caddy routes, so `http://hono.localhost` proxies to the mapped app container without needing certificates or `/etc/hosts` changes.

## GitHub Webhook

Each project shows:

- Webhook URL
- Webhook secret

In GitHub, create a repository webhook:

- Payload URL: the dashboard value
- Content type: `application/json`
- Secret: the dashboard value
- Events: `push`

Pushes to the configured branch enqueue a deployment.

## Custom Domains

Add a domain in the dashboard, then point DNS at your server:

```txt
A     app.example.com     YOUR_SERVER_IPV4
AAAA  app.example.com     YOUR_SERVER_IPV6
```

Caddy handles HTTP routing and certificates when the domain resolves to the host.

## Notes

This MVP assumes trusted users. Running arbitrary public user code requires stronger sandboxing, quotas, auth, network policy, and secret isolation.
