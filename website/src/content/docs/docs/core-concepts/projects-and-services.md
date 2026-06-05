---
title: Projects and Services
description: Understand how Aeroplane groups deployable apps, databases, domains, and runtime settings.
sidebar:
  order: 1
---

Aeroplane uses projects to group services that belong to the same application stack. A project can contain source-built apps, Docker image services, background workers, static sites, and databases.

## Projects

Use a project as the operational boundary for a stack. It gives you one place to scan services, create resources, follow deployments, wire domains, manage variables, browse data, and configure backups.

Projects are also the boundary for database variable suggestions. When you add an app service, Aeroplane can suggest variables that reference database services in the same project.

## Source Services

Source services are connected to code. Aeroplane can read from:

- GitHub repositories through the GitHub App connection.
- Direct Git URLs such as `https://github.com/owner/repo.git` or `git@github.com:owner/repo.git`.

Aeroplane builds source services with Railpack and BuildKit, then runs them with Docker.

Typical service work includes:

- Choosing the source repository and branch.
- Choosing the root directory for monorepos.
- Selecting `web` or `worker` runtime mode.
- Setting the internal port for web services.
- Overriding install, build, or start commands when auto detection is not enough.
- Setting a static output directory when the build produces static files.
- Setting environment variables.
- Running manual deployments.
- Using push-triggered deployments.
- Watching build and runtime logs.
- Assigning generated or custom domains.

## Docker Image Services

Docker image services run a prebuilt container image. Use them when CI already publishes an image, when you want to run third-party software, or when the host Docker daemon already has registry credentials for a private image.

Docker image services can be `web` or `worker` services. Web services need an internal container port. Worker services do not.

## Database Services

Aeroplane can create these database engines:

- PostgreSQL
- TimescaleDB
- MySQL
- Redis
- MongoDB
- ClickHouse

Database panels give you operational access next to the apps that depend on them.

Depending on the engine, you can browse data, run SQL where applicable, import data, and configure backups.

## Service Tabs

Services expose tabs based on their type:

- Overview for status and warnings.
- Deployments for manual deploys, queue state, build logs, aborts, and deployment history.
- Logs for runtime logs.
- Variables for environment variables.
- Domains for generated and custom hostnames.
- Data, SQL, and Backups for database services where supported.
- Settings for runtime and database settings.

## Status and URLs

Aeroplane tracks service status separately from deployment status. A service can be active while a newer deployment is queued or building.

Web and static services get a preferred URL. Database services can get public hostnames when database public access is enabled and the root domain is configured.

## Runtime Shape

Aeroplane keeps the runtime pieces visible: Docker containers, persistent database volumes, Caddy routes, BuildKit builds, generated service domains, variables, logs, backups, and maintenance all stay close to the service they affect.
