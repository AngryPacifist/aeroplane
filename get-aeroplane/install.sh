#!/usr/bin/env sh
set -eu

cd /

INSTALL_DIR="${AEROPLANE_HOME:-/opt/aeroplane}"
APP_DIR="$INSTALL_DIR/source"
REPO_URL="${AEROPLANE_REPO_URL:-https://github.com/akinloluwami/aeroplane.git}"
REPO_BRANCH="${AEROPLANE_REPO_BRANCH:-main}"
PORT="${AEROPLANE_PORT:-4310}"
HOST_PORT_START="${AEROPLANE_HOST_PORT_START:-4100}"
HOST_PORT_END="${AEROPLANE_HOST_PORT_END:-4999}"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required when installing as a non-root user."
    exit 1
  fi
  SUDO="sudo"
fi

say() {
  printf '%s\n' "$*"
}

fail() {
  say "Error: $*"
  exit 1
}

require_linux() {
  [ "$(uname -s)" = "Linux" ] || fail "Aeroplane's VPS installer currently supports Linux hosts."

  if [ -r /etc/os-release ]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    case "${ID:-}" in
      ubuntu|debian) ;;
      *)
        say "Warning: this installer is tuned for Ubuntu/Debian. Continuing on ${PRETTY_NAME:-unknown Linux}."
        ;;
    esac
  fi
}

require_apt() {
  command -v apt-get >/dev/null 2>&1 || fail "apt-get was not found. The installer currently supports Ubuntu/Debian hosts."
}

install_base_packages() {
  require_apt
  say "Installing base packages..."
  $SUDO apt-get update
  $SUDO apt-get install -y ca-certificates curl git openssl build-essential python3
}

node_major_version() {
  node -p "process.versions.node.split('.')[0]" 2>/dev/null || printf '0\n'
}

install_node() {
  if command -v node >/dev/null 2>&1 && [ "$(node_major_version)" -ge 22 ]; then
    return
  fi

  say "Installing Node.js 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO bash -
  $SUDO apt-get install -y nodejs
}

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    if command -v systemctl >/dev/null 2>&1; then
      $SUDO systemctl enable --now docker >/dev/null 2>&1 || true
    fi
    return
  fi

  say "Installing Docker..."
  $SUDO apt-get install -y docker.io docker-compose-plugin
  if command -v systemctl >/dev/null 2>&1; then
    $SUDO systemctl enable --now docker >/dev/null 2>&1 || true
  fi
}

require_compose() {
  if $SUDO docker compose version >/dev/null 2>&1; then
    return
  fi

  say "Installing Docker Compose plugin..."
  $SUDO apt-get install -y docker-compose-plugin

  $SUDO docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is still unavailable."
}

install_railpack() {
  if command -v railpack >/dev/null 2>&1; then
    return
  fi

  say "Installing Railpack..."
  curl -fsSL https://railpack.com/install.sh | $SUDO sh -s -- --bin-dir /usr/local/bin
}

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32 | tr '+/' '-_' | tr -d '='
    return
  fi
  dd if=/dev/urandom bs=32 count=1 2>/dev/null | od -An -tx1 | tr -d ' \n'
}

detect_public_url() {
  if [ -n "${AEROPLANE_PUBLIC_URL:-}" ]; then
    printf '%s\n' "$AEROPLANE_PUBLIC_URL"
    return
  fi

  public_ip=""
  if command -v curl >/dev/null 2>&1; then
    public_ip="$(curl -fsSL --max-time 4 https://api.ipify.org 2>/dev/null || true)"
  fi
  if [ -z "$public_ip" ] && command -v hostname >/dev/null 2>&1; then
    public_ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  if [ -z "$public_ip" ]; then
    public_ip="localhost"
  fi

  printf 'http://%s:%s\n' "$public_ip" "$PORT"
}

get_env_value() {
  env_file="$1"
  key="$2"
  [ -f "$env_file" ] || return 0
  value="$(grep "^$key=" "$env_file" 2>/dev/null | tail -n 1 | cut -d= -f2- || true)"
  printf '%s' "$value" | sed "s/^[\"']//;s/[\"']$//"
}

write_env_file() {
  env_file="$INSTALL_DIR/.env"
  secret_key="$(get_env_value "$env_file" AEROPLANE_SECRET_KEY)"
  public_url="$(get_env_value "$env_file" PUBLIC_URL)"
  control_plane_hostname="$(get_env_value "$env_file" CONTROL_PLANE_HOSTNAME)"

  if [ -z "$secret_key" ]; then
    secret_key="$(random_secret)"
  fi
  if [ -z "$public_url" ]; then
    public_url="$(detect_public_url)"
  fi

  tmp_file="$(mktemp)"
  if [ -f "$env_file" ]; then
    grep -v -E '^(AEROPLANE_INSTALL_MODE|AEROPLANE_INSTALL_DIR|AEROPLANE_ENV_PATH|AEROPLANE_REPO_URL|AEROPLANE_REPO_BRANCH|AEROPLANE_IMAGE|AEROPLANE_IMAGE_UPDATE_CMD|AEROPLANE_UPDATE_REPO_URL|AEROPLANE_UPDATE_BRANCH|AEROPLANE_UPDATE_RESTART_CMD|AEROPLANE_SECRET_KEY|DATA_DIR|DEPLOY_DRY_RUN|CADDY_CONFIG_PATH|CADDY_RELOAD_CMD|PORT|HOST|PUBLIC_URL|CONTROL_PLANE_HOSTNAME|DEPLOY_HOST_PORT_START|DEPLOY_HOST_PORT_END|BUILDKIT_HOST|AEROPLANE_RUNTIME_NETWORK)=' "$env_file" > "$tmp_file" || true
  else
    : > "$tmp_file"
  fi

  cat >> "$tmp_file" <<EOF
AEROPLANE_INSTALL_MODE=git
AEROPLANE_INSTALL_DIR=$INSTALL_DIR
AEROPLANE_ENV_PATH=$INSTALL_DIR/.env
AEROPLANE_REPO_URL=$REPO_URL
AEROPLANE_REPO_BRANCH=$REPO_BRANCH
AEROPLANE_UPDATE_REPO_URL=$REPO_URL
AEROPLANE_UPDATE_BRANCH=$REPO_BRANCH
AEROPLANE_UPDATE_RESTART_CMD="systemctl restart aeroplane"
AEROPLANE_SECRET_KEY=$secret_key
DATA_DIR=$INSTALL_DIR/data
DEPLOY_DRY_RUN=false
CADDY_CONFIG_PATH=$INSTALL_DIR/data/Caddyfile
CADDY_RELOAD_CMD=true
PORT=$PORT
HOST=0.0.0.0
PUBLIC_URL=$public_url
DEPLOY_HOST_PORT_START=$HOST_PORT_START
DEPLOY_HOST_PORT_END=$HOST_PORT_END
BUILDKIT_HOST=tcp://127.0.0.1:1234
AEROPLANE_RUNTIME_NETWORK=aeroplane-runtime
EOF

  if [ -n "$control_plane_hostname" ]; then
    printf 'CONTROL_PLANE_HOSTNAME=%s\n' "$control_plane_hostname" >> "$tmp_file"
  fi

  mv "$tmp_file" "$env_file"
}

clone_or_update_repo() {
  if [ -d "$APP_DIR/.git" ]; then
    say "Updating Aeroplane source..."
    status="$(git -C "$APP_DIR" status --porcelain --untracked-files=no)"
    case "$status" in
      " M package-lock.json"|"M  package-lock.json"|"MM package-lock.json")
        say "Cleaning package-lock.json drift from dependency pruning..."
        git -C "$APP_DIR" checkout -- package-lock.json
        ;;
    esac
    git -C "$APP_DIR" fetch origin "$REPO_BRANCH"
    git -C "$APP_DIR" checkout "$REPO_BRANCH"
    git -C "$APP_DIR" pull --ff-only origin "$REPO_BRANCH"
    return
  fi

  if [ -d "$APP_DIR" ] && [ -z "$(ls -A "$APP_DIR" 2>/dev/null)" ]; then
    say "Removing empty source directory from a previous interrupted install..."
    rmdir "$APP_DIR"
  fi

  if [ -e "$APP_DIR" ]; then
    fail "$APP_DIR exists but is not a Git checkout. Move it aside and rerun the installer."
  fi

  say "Cloning Aeroplane..."
  git clone --branch "$REPO_BRANCH" --single-branch "$REPO_URL" "$APP_DIR"
}

build_aeroplane() {
  say "Installing Aeroplane dependencies..."
  cd "$APP_DIR"
  npm ci --include=dev

  say "Building Aeroplane..."
  npm run build
  npm prune --omit=dev --package-lock=false
}

write_compose_file() {
  cat > "$INSTALL_DIR/compose.yml" <<'EOF'
services:
  buildkit:
    image: moby/buildkit:latest
    container_name: deploy-buildkit
    privileged: true
    command: ["--addr", "tcp://0.0.0.0:1234"]
    ports:
      - "127.0.0.1:1234:1234"
    restart: unless-stopped

  caddy:
    image: caddy:2
    container_name: deploy-caddy
    network_mode: host
    command: ["sh", "-c", "mkdir -p /data && touch /data/Caddyfile && caddy run --config /data/Caddyfile --adapter caddyfile --watch"]
    volumes:
      - ./data:/data
      - caddy_data:/data/caddy
      - caddy_config:/config
    restart: unless-stopped

volumes:
  caddy_data:
  caddy_config:
EOF
}

write_systemd_unit() {
  command -v systemctl >/dev/null 2>&1 || fail "systemd is required to run Aeroplane from a Git checkout."

  $SUDO tee /etc/systemd/system/aeroplane.service >/dev/null <<EOF
[Unit]
Description=Aeroplane control plane
After=network-online.target docker.service
Wants=network-online.target docker.service

[Service]
Type=simple
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=AEROPLANE_ENV_PATH=$INSTALL_DIR/.env
EnvironmentFile=-$INSTALL_DIR/.env
ExecStart=/usr/bin/env node dist/server/index.js
Restart=always
RestartSec=3
KillSignal=SIGTERM

[Install]
WantedBy=multi-user.target
EOF
}

start_runtime_services() {
  cd "$INSTALL_DIR"
  say "Starting BuildKit and Caddy..."
  $SUDO docker compose up -d buildkit caddy
}

start_aeroplane() {
  say "Starting Aeroplane..."
  $SUDO docker rm -f aeroplane >/dev/null 2>&1 || true
  $SUDO systemctl daemon-reload
  $SUDO systemctl enable --now aeroplane
  $SUDO systemctl restart aeroplane
}

print_firewall_hint() {
  if command -v ufw >/dev/null 2>&1 && $SUDO ufw status 2>/dev/null | grep -qi "Status: active"; then
    say ""
    say "UFW is active. Make sure these ports are allowed:"
    say "  sudo ufw allow 80/tcp"
    say "  sudo ufw allow 443/tcp"
    say "  sudo ufw allow $PORT/tcp"
  fi
}

main() {
  require_linux
  install_base_packages
  install_node
  install_docker
  require_compose
  install_railpack

  say "Creating $INSTALL_DIR..."
  $SUDO mkdir -p "$INSTALL_DIR/data"
  if [ -n "$SUDO" ]; then
    $SUDO chown -R "$(id -u):$(id -g)" "$INSTALL_DIR"
  fi

  write_env_file
  clone_or_update_repo
  build_aeroplane
  write_compose_file
  write_systemd_unit
  start_runtime_services
  start_aeroplane

  public_url="$(get_env_value "$INSTALL_DIR/.env" PUBLIC_URL)"
  print_firewall_hint
  say ""
  say "Aeroplane is installed."
  say "Open: $public_url"
  say ""
  say "Manage it with:"
  say "  sudo journalctl -u aeroplane -f"
  say "  cd $APP_DIR && git status"
  say "  cd $INSTALL_DIR && sudo docker compose logs -f caddy buildkit"
}

main "$@"
