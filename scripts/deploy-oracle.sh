#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.prod}"

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

rand_hex() {
  local bytes="$1"
  if command_exists openssl; then
    openssl rand -hex "$bytes"
    return
  fi
  if command_exists python3; then
    python3 - <<PY
import secrets
print(secrets.token_hex($bytes))
PY
    return
  fi
  echo "ERROR: need openssl or python3 to generate secrets" >&2
  exit 1
}

get_public_ip() {
  if command_exists curl; then
    curl -s https://api.ipify.org || true
    return
  fi
  if command_exists wget; then
    wget -qO- https://api.ipify.org || true
    return
  fi
  echo ""
}

if ! command_exists docker; then
  echo "Docker not found. Installing..."
  if ! command_exists curl; then
    sudo apt-get update
    sudo apt-get install -y curl
  fi
  curl -fsSL https://get.docker.com | sudo sh
fi

DOCKER=(docker)
if ! docker ps >/dev/null 2>&1; then
  if ! command_exists sudo; then
    echo "Docker needs root permissions and sudo is missing." >&2
    exit 1
  fi
  DOCKER=(sudo docker)
fi

if [ ! -f "$ENV_FILE" ]; then
  DB_PASS="$(rand_hex 16)"
  DB_ROOT_PASS="$(rand_hex 16)"
  JWT_SECRET="$(rand_hex 32)"
  PUBLIC_IP="$(get_public_ip)"
  if [ -n "$PUBLIC_IP" ]; then
    CORS_ORIGIN="http://$PUBLIC_IP"
  else
    CORS_ORIGIN="http://localhost"
  fi

  cat > "$ENV_FILE" <<EOF
DB_NAME=granada_guide
DB_USER=granada
DB_PASS=$DB_PASS
DB_ROOT_PASS=$DB_ROOT_PASS
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_MIN=10080
CORS_ALLOWED_ORIGINS=$CORS_ORIGIN
EOF
  echo "Created $ENV_FILE"
fi

cd "$ROOT_DIR"
"${DOCKER[@]}" compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d --build

PUBLIC_IP="$(get_public_ip)"
if [ -n "$PUBLIC_IP" ]; then
  echo "Ready:"
  echo "http://$PUBLIC_IP/"
  echo "http://$PUBLIC_IP/api"
else
  echo "Ready. Find your public IP and use http://<IP>/"
fi
