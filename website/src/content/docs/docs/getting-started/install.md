---
title: Install Aeroplane
description: Install Aeroplane on a fresh server and understand what the installer creates.
sidebar:
  order: 1
---

Aeroplane is meant to start from a fresh Ubuntu or Debian server where it can own the deployment stack cleanly.

## Requirements

- A server you control.
- Ubuntu or Debian with shell access.
- DNS access for any hostname you want to point at the server.
- Public ports `80` and `443` available for Caddy.
- Docker support. The installer starts the Docker-backed runtime services Aeroplane needs.
- Enough disk for builds, images, database volumes, static output, and local backups.

## Run the Installer

```bash
curl -fsSL https://get.aeroplane.run | sh
```

The installer creates `/opt/aeroplane`, clones Aeroplane into `/opt/aeroplane/source`, writes a production environment file, builds the control plane locally, and starts the host services.

## What Gets Started

- `aeroplane`, the systemd service for the control plane.
- `deploy-buildkit` on `127.0.0.1:1234`.
- `deploy-caddy` on ports `80` and `443`.

After the script finishes, open the printed URL and complete onboarding in the browser.

## What Gets Stored

The default install keeps Aeroplane under `/opt/aeroplane`. The source checkout lives in `/opt/aeroplane/source`; runtime state, generated Caddy config, static site output, database backup files, migration files, and maintenance history live under the configured `DATA_DIR`.

If you later export an Aeroplane migration bundle, the bundle includes logical Aeroplane data, system settings, runtime env, database dumps, static sites, backup files, Postgres TLS assets, and the Caddyfile when those files exist.

## Installer Options

Set environment variables before `sh` to override defaults:

```bash
curl -fsSL https://get.aeroplane.run | \
  AEROPLANE_PUBLIC_URL=https://pilot.example.com \
  AEROPLANE_REPO_BRANCH=main \
  AEROPLANE_PORT=4310 \
  sh
```

Common options:

- `AEROPLANE_HOME`: install directory. Defaults to `/opt/aeroplane`.
- `AEROPLANE_REPO_URL`: repository to clone. Defaults to the Aeroplane GitHub repository.
- `AEROPLANE_REPO_BRANCH`: branch to install and update from. Defaults to `main`.
- `AEROPLANE_PUBLIC_URL`: public URL written to `PUBLIC_URL`.
- `AEROPLANE_PORT`: control plane port. Defaults to `4310`.

Use `AEROPLANE_PUBLIC_URL` when you already know the dashboard hostname. You can still set or change the dashboard hostname later in System Settings.

## Inspect the Install

```bash
sudo journalctl -u aeroplane -f
cd /opt/aeroplane/source && git status
cd /opt/aeroplane && sudo docker compose logs -f caddy buildkit
```

If UFW is enabled, allow the public ports:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 4310/tcp
```

## After Install

Continue to [Browser Onboarding](/docs/getting-started/onboarding/) to create the owner user, configure the dashboard domain, set the wildcard root domain, connect GitHub, configure R2, or import an Aeroplane migration bundle.
