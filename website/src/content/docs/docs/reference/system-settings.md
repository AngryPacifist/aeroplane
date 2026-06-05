---
title: System Settings
description: Reference for Aeroplane system-wide settings and what they affect.
---

System Settings controls server-wide behavior. Service settings control one service.

## Domains

`Control plane hostname` serves the Aeroplane dashboard through Caddy.

`Root domain` enables generated service hostnames and generated database public hostnames.

Both can be set during onboarding or later from System Settings.

## DNS

DNS provider settings store credentials for Cloudflare, Namecheap, and Spaceship. Connected providers appear as actions on service custom domains.

Provider automation writes IPv4 `A` records only.

## GitHub

GitHub settings support either:

- GitHub App credentials.
- Host-level `GITHUB_ACCESS_TOKEN`.

The GitHub App path enables repository discovery and push webhooks.

## Storage

R2 settings store Cloudflare account ID, bucket, endpoint, access key suffix, encrypted secret access key, and timestamps.

R2 must be connected before database services can select `r2` or `disk+r2` backup destinations.

## Migration

Migration settings export encrypted `.aeroplane` bundles. The export requires a passphrase with at least 8 characters.

Bundle import is available during onboarding.

## Maintenance

Maintenance settings show disk, Docker, Aeroplane data paths, build artifacts, database backup storage, APT cache, system logs, cleanup actions, and recent history.

Safe cleanup avoids Docker volumes. Volume cleanup is separate and destructive for detached volumes.

## Deployments

`Concurrent deployments` controls the global number of deployment jobs that can run at once.

Allowed values:

```txt
1 through 10
```

Default:

```txt
3
```

Aeroplane also enforces one active deployment per service.

## Updates

Updates settings compare the running install against the configured repository and branch.

Git installs can fast-forward, install dependencies, build, prune, and queue a restart.

Image installs can compare commit metadata and run an image update command when configured.
