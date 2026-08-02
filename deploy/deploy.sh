#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Quenetiq/quenetiq.git"
TEMP_DIR="/tmp/quenetiq-deploy-$(date +%s)"
GRAPHQL_PORT="4000"
trap 'rm -rf "${TEMP_DIR:-}"' EXIT

# ── Ask for domain if not provided ────────────────────────────────────
DOMAIN="${1:-}"
while [[ -z "$DOMAIN" ]]; do
  read -rp "Enter domain name (e.g. quenetiq.dev): " DOMAIN
done

if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]]; then
  echo "ERROR: invalid domain name: $DOMAIN"
  exit 1
fi

# ── Ask for serve address if not provided ─────────────────────────────
SERVE_ADDRESS="${3:-}"
while [[ -z "$SERVE_ADDRESS" ]]; do
  read -rp "Enter serve address (default: $DOMAIN): " SERVE_ADDRESS
  SERVE_ADDRESS="${SERVE_ADDRESS:-$DOMAIN}"
done

if [[ ! "$SERVE_ADDRESS" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]]; then
  echo "ERROR: invalid serve address: $SERVE_ADDRESS"
  exit 1
fi

NGINX_ROOT="/var/www/$DOMAIN"
BUILD_DIR="$NGINX_ROOT/build"
STATIC_DIR="$BUILD_DIR/browser"
SERVER_DIR="$NGINX_ROOT/server"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
NGINX_ENABLED="/etc/nginx/sites-enabled/$DOMAIN"
SERVICE_NAME="quenetiq-graphql-${DOMAIN//./-}"
SERVER_USER="${SUDO_USER:-$(id -un)}"
SERVER_GROUP="$(id -gn "$SERVER_USER")"
NODE_BIN="$(command -v node || echo /usr/bin/node)"

echo ""
echo "=== Deploying Quenetiq to $DOMAIN ==="
echo "  serve address: $SERVE_ADDRESS"
echo "  static dir:    $STATIC_DIR"
echo ""

# ── 0. Ensure required directories exist ──────────────────────────────
echo "=== 0/10 Ensuring required directories ==="
sudo mkdir -p "$NGINX_ROOT"
sudo mkdir -p "$BUILD_DIR"
sudo mkdir -p "$SERVER_DIR"
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled
echo "  ✓ $NGINX_ROOT"
echo "  ✓ $BUILD_DIR"
echo "  ✓ $SERVER_DIR"
echo "  ✓ /etc/nginx/sites-available"
echo "  ✓ /etc/nginx/sites-enabled"
echo ""

# ── 1. Select branch ──────────────────────────────────────────────────
DEFAULT_BRANCH="main"
SELECTED_BRANCH="${2:-}"

if [[ -z "$SELECTED_BRANCH" ]]; then
  echo "=== Fetching available branches ==="
  mapfile -t BRANCHES < <(
    git ls-remote --heads "$REPO_URL" \
      | awk '{print $2}' \
      | sed 's|refs/heads/||' \
      | sort -V
  )

  if [[ ${#BRANCHES[@]} -eq 0 ]]; then
    echo "ERROR: no branches found at $REPO_URL"
    exit 1
  fi

  echo ""
  echo "Select branch to deploy:"
  select SELECTED_BRANCH in "${BRANCHES[@]}"; do
    if [[ -n "$SELECTED_BRANCH" ]]; then
      break
    fi
    echo "Invalid choice, try again."
  done
fi

echo "Using branch: $SELECTED_BRANCH"
echo ""

# ── 2. Clone ──────────────────────────────────────────────────────────
echo "=== 2/10 Cloning $SELECTED_BRANCH from $REPO_URL ==="
git clone --depth=1 --branch "$SELECTED_BRANCH" "$REPO_URL" "$TEMP_DIR"
cd "$TEMP_DIR"

# ── 3. Install ────────────────────────────────────────────────────────
echo "=== 3/10 Installing dependencies ==="
npm ci

# ── 4. Build packages ─────────────────────────────────────────────────
echo "=== 4/10 Building @quenetiq/* packages ==="
node scripts/build-packages.mjs

# ── 5. Build Angular ──────────────────────────────────────────────────
echo "=== 5/10 Building Angular app ==="
npx ng build --configuration=production --progress=false

# ── 6. Install GraphQL server ─────────────────────────────────────────
echo "=== 6/10 Installing GraphQL server ==="

echo "  • Copying server files to $SERVER_DIR"
sudo cp "$TEMP_DIR/mock/server.mjs" "$SERVER_DIR/server.mjs"
sudo mkdir -p "$NGINX_ROOT/graphql"
sudo cp "$TEMP_DIR/graphql/schema.graphql" "$NGINX_ROOT/graphql/schema.graphql"
sudo mkdir -p "$SERVER_DIR/node_modules"
sudo cp -r "$TEMP_DIR/node_modules/graphql" "$SERVER_DIR/node_modules/graphql"
sudo cp -r "$TEMP_DIR/node_modules/ws" "$SERVER_DIR/node_modules/ws"

echo "  • Granting ownership to $SERVER_USER"
sudo chown -R "$SERVER_USER:$SERVER_GROUP" "$SERVER_DIR" "$NGINX_ROOT/graphql"

echo "  • Installing systemd service '$SERVICE_NAME'"
sudo tee "/etc/systemd/system/$SERVICE_NAME.service" > /dev/null <<SYSTEMDEOF
[Unit]
Description=Quenetiq GraphQL server for $DOMAIN
After=network.target

[Service]
Type=simple
User=$SERVER_USER
Group=$SERVER_GROUP
WorkingDirectory=$SERVER_DIR
ExecStart=$NODE_BIN $SERVER_DIR/server.mjs
Restart=always
RestartSec=3
Environment=NODE_ENV=production
Environment=ALLOWED_ORIGIN=https://$DOMAIN

[Install]
WantedBy=multi-user.target
SYSTEMDEOF

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME" > /dev/null 2>&1
sudo systemctl restart "$SERVICE_NAME"

sleep 1
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
  echo "  ✓ GraphQL server is running on :$GRAPHQL_PORT"
  if HEALTH=$(curl -s -X POST "http://localhost:${GRAPHQL_PORT}/graphql" -H 'Content-Type: application/json' -d '{"query":"{ __typename }"}' 2>/dev/null) && [[ "$HEALTH" == *'"__typename"'* ]]; then
    echo "  ✓ /graphql endpoint responding"
  else
    echo "  ⚠️  /graphql not responding yet — check: journalctl -u $SERVICE_NAME"
  fi
else
  echo "  ⚠️  GraphQL server failed to start — check: journalctl -u $SERVICE_NAME"
fi
echo ""

# ── 7. Copy ───────────────────────────────────────────────────────────
echo "=== 7/10 Deploying to $BUILD_DIR ==="
sudo cp -r dist/dumb-keystore/* "$BUILD_DIR"
cd / && rm -rf "$TEMP_DIR"

# ── 8. nginx ──────────────────────────────────────────────────────────
echo "=== 8/10 Configuring nginx ==="

if [[ ! -f "$NGINX_CONF" ]]; then
  sudo tee "$NGINX_CONF" > /dev/null <<NGINXEOF
server {
    listen 80;
    server_name $SERVE_ADDRESS;
    root $STATIC_DIR;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /graphql {
        proxy_pass http://127.0.0.1:$GRAPHQL_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
}
NGINXEOF

  [[ -L "$NGINX_ENABLED" ]] || sudo ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
else
  if ! grep -q "location /graphql" "$NGINX_CONF"; then
    echo "  Adding /graphql reverse proxy to existing config"
    sudo sed -i '$i\
\
    # Quenetiq GraphQL reverse proxy (added by deploy script)\
    location /graphql {\
        proxy_pass http://127.0.0.1:'"$GRAPHQL_PORT"';\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\
        proxy_set_header X-Forwarded-Proto $scheme;\
        proxy_set_header Upgrade $http_upgrade;\
        proxy_set_header Connection "upgrade";\
        proxy_read_timeout 3600s;\
    }' "$NGINX_CONF"
  fi
fi

sudo nginx -t && sudo systemctl reload nginx

# ── 9. SSL (optional) ─────────────────────────────────────────────────
echo "=== 9/10 SSL (optional) ==="
SETUP_SSL=""
while [[ "$SETUP_SSL" != "y" && "$SETUP_SSL" != "n" ]]; do
  read -rp "Set up SSL with Let's Encrypt? (y/n): " SETUP_SSL
done

if [[ "$SETUP_SSL" == "y" ]]; then
  if sudo certbot certificates 2>/dev/null | grep -q "$SERVE_ADDRESS"; then
    echo "  ✓ SSL certificate already exists for $SERVE_ADDRESS"
  else
    sudo certbot --nginx -d "$SERVE_ADDRESS" --non-interactive --agree-tos -m "admin@$SERVE_ADDRESS" || {
      echo "WARNING: certbot failed. Run manually:"
      echo "  sudo certbot --nginx -d $SERVE_ADDRESS"
    }
  fi
else
  echo "  Skipped SSL. You can run later:"
  echo "  sudo certbot --nginx -d $SERVE_ADDRESS"
fi

echo ""
echo "=== Done! https://$SERVE_ADDRESS ==="
