---
title: First Project
description: Create a project, add services, deploy them, and attach domains.
---

A project is the workspace for one app stack. Put the web app, background workers, Docker image services, and databases that belong together in the same project so deployments, variables, domains, logs, and backups stay close to the thing they affect.

## Create the Project

Open the dashboard and create a project with a name you will recognize in service URLs and logs.

## Add a Service

Choose the service type that matches what you are running:

- `Git Repository` for apps Aeroplane builds from source.
- `Docker Image` for a prebuilt image such as `ghcr.io/org/api:latest`.
- `Database` for PostgreSQL, TimescaleDB, MySQL, Redis, MongoDB, or ClickHouse.

For Git repository services, you can pick a GitHub repository from the GitHub App connection or enter a direct Git URL. Direct Git URLs are useful for public repos, SSH repos, and providers outside the GitHub App flow.

## Pick Runtime Mode

Use `web` for services that listen on a port and receive HTTP traffic through Caddy.

Use `worker` for background processes that should run in Docker without a public HTTP route. Worker services do not need an internal port.

If the service builds a static site, set `Static output` to the generated folder. Aeroplane exports that folder from the built image and serves it through Caddy.

## Add Variables

Add environment variables during service creation or later from the service Variables tab. Aeroplane can suggest variables from two places:

- Existing database services in the same project.
- `.env.example` files from the selected GitHub repository and root directory.

Database suggestions use Aeroplane's service reference format, for example `${postgres-db.POSTGRES_URL}`, so app services can follow recreated database credentials after imports or migrations.

## Deploy

Click `Deploy` from the service Deployments tab. Aeroplane queues a deployment, streams build logs, starts the container, checks that it is healthy, and reloads Caddy for web/static services.

Statuses you will see:

- `queued`: waiting for a global deployment slot.
- `building`: clone, build, pull, or runtime start is in progress.
- `running`: this deployment is the current live version.
- `superseded`: a newer deployment replaced this one.
- `aborted`: a queued or building deployment was stopped.
- `failed`: build, runtime, health check, or Caddy work failed.

## Attach a Domain

If a root domain is configured, Aeroplane can generate service hostnames automatically. You can also add public custom domains from the Domains tab.

Point custom domains at the server with an `A` record, then click refresh and verify. If you connected a supported DNS provider, Aeroplane can create or update that `A` record for you.

## Next Pages

- [Source Services](/docs/deployments/source-services/) for GitHub and Git URL deployment settings.
- [Deployment Lifecycle](/docs/deployments/deployment-lifecycle/) for queueing, concurrency, hot swaps, aborts, and logs.
- [Database Overview](/docs/databases/overview/) for database engines, public access, and backup support.
