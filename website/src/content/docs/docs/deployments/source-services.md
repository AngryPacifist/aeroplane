---
title: Source Services
description: Deploy apps from GitHub repositories or direct Git URLs.
---

Source services are services Aeroplane builds from code. Use them for most web apps, APIs, workers, and static sites.

## Source Options

Aeroplane supports two source paths:

- `GitHub repository`: browse repositories available to the connected GitHub App, choose a branch, and select a root directory.
- `Git URL`: enter an HTTPS or SSH Git URL manually, then provide the branch and root directory.

Use GitHub repositories when you want repository discovery and push-triggered deployments. Use direct Git URLs when the repository is public, uses SSH, or lives outside the GitHub App flow.

## Repository Settings

Each source service stores:

- Service name.
- Repository or Git URL.
- Branch.
- Root directory.
- Runtime mode.
- Internal port for web services.
- Optional static output directory.
- Optional install, build, and start command overrides.

The root directory matters for monorepos. Choose the folder that contains the app you want Aeroplane to build. For direct Git URLs, type the root directory manually.

## Build Detection and Overrides

Aeroplane uses Railpack through BuildKit to detect and build the app. Leave install, build, and start commands blank when auto detection is correct.

Use command overrides when:

- The repo has a custom install command.
- The build script is not the default script.
- The service needs a custom start command.
- A monorepo package must be launched from a specific path.

The static output setting turns a source service into a static site deployment. Aeroplane copies the output directory out of the built image and serves it through Caddy instead of running the app server.

## Runtime Mode

`web` services must listen on the configured internal port. Aeroplane starts the container, checks the port, reloads Caddy, and routes traffic.

`worker` services run without a published port. Aeroplane checks that the container process stays running.

## GitHub Push Deploys

When GitHub App webhooks are configured, pushes can enqueue deployments for connected services. The webhook URL is:

```txt
https://YOUR_PUBLIC_HOST/api/github/app/webhook
```

Aeroplane also supports manual deployments from the service Deployments tab. Manual deployments are useful for first deploys, retries, and direct Git URL services.

## Common Failures

- BuildKit is not reachable at the configured `BUILDKIT_HOST`.
- The selected root directory does not contain the app.
- The app listens on a different port than the service internal port.
- The static output folder does not contain `index.html`.
- The GitHub App cannot read the repository.
- A direct SSH Git URL needs host-level SSH credentials.
