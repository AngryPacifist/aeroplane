# get-aeroplane

Tiny Node app for:

```bash
curl -fsSL https://get.aeroplane.run | sh
```

Deploy this directory anywhere that can serve `get.aeroplane.run`.

## Routes

- `GET /` serves `install.sh`
- `GET /install.sh` serves `install.sh`
- `GET /healthz` returns `ok`

## Analytics

Set `POSTHOG_API_KEY` to capture installer requests in PostHog.

Optional env:

- `POSTHOG_HOST`: PostHog host, defaults to the SDK default.
- `POSTHOG_DISABLED=true`: disables analytics even when a key is present.
- `POSTHOG_DISTINCT_ID_SALT`: custom salt for hashed installer identities.

The app captures `get_aeroplane_installer_requested` for successful `GET /` and `GET /install.sh` requests. It does not send raw IP addresses; request identity is hashed before being sent.

## Run

```bash
npm start
```

The app listens on `PORT`, defaulting to `3000`.

## Docker

```bash
docker build -t get-aeroplane .
docker run -p 3000:3000 -e POSTHOG_API_KEY=phc_... get-aeroplane
```
