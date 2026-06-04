# Aeroplane Website

Astro landing page for Aeroplane.

## Run locally

```bash
cd website
npm install
npm run dev
```

## Analytics

PostHog tracking is enabled when `PUBLIC_POSTHOG_KEY` is set. Copy `.env.example` to `.env`
for local development, or set these variables on the deployed website service:

```bash
PUBLIC_POSTHOG_KEY=phc_your_project_key
PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
PUBLIC_POSTHOG_DEFAULTS=2026-01-30
```

Astro includes `PUBLIC_*` variables at build time, so redeploy after changing these values.

## Build

```bash
npm run build
```
