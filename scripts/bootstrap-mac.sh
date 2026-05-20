#!/usr/bin/env sh
set -eu

if ! command -v brew >/dev/null 2>&1; then
  echo "Homebrew is required for the Mac bootstrap."
  exit 1
fi

if ! command -v caddy >/dev/null 2>&1; then
  brew install caddy
else
  echo "Caddy is already installed."
fi

if ! docker info >/dev/null 2>&1; then
  echo "Starting Docker Desktop..."
  open -a Docker || true
  i=0
  while ! docker info >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -gt 60 ]; then
      echo "Docker Desktop did not become ready within 60 seconds."
      exit 1
    fi
    sleep 1
  done
fi

./scripts/bootstrap-host.sh
