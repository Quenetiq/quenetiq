#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/Quenetiq/quenetiq.git"
TEMP_DIR="/tmp/quenetiq-deploy-$(date +%s)"

# ── Ask for domain if not provided ────────────────────────────────────
DOMAIN="${1:-}"
while [[ -z "$DOMAIN" ]]; do
  read -rp "Enter domain name (e.g. quenetiq.dev): " DOMAIN
done

NGINX_ROOT="/var/www/$DOMAIN"
BUILD_DIR="$NGINX_ROOT/build"

echo ""
echo "=== Deploying Quenetiq to $DOMAIN ==="
echo ""

# ── 1. Clone ──────────────────────────────────────────────────────────
echo "=== 1/6 Cloning $REPO_URL ==="
git clone --depth=1 "$REPO_URL" "$TEMP_DIR"
cd "$TEMP_DIR"

# ── 2. Install ────────────────────────────────────────────────────────
echo "=== 2/6 Installing dependencies ==="
npm ci

# ── 3. Build packages ─────────────────────────────────────────────────
echo "=== 3/6 Building @quenetiq/* packages ==="
node scripts/build-packages.mjs

# ── 4. Build Angular ──────────────────────────────────────────────────
echo "=== 4/6 Building Angular app ==="
npx ng build --configuration=production --progress=false

# ── 5. Copy ───────────────────────────────────────────────────────────
echo "=== 5/6 Deploying to $BUILD_DIR ==="
sudo mkdir -p "$BUILD_DIR"
sudo cp -r dist/dumb-keystore/* "$BUILD_DIR"
cd / && rm -rf "$TEMP_DIR"

# ── 6. nginx + SSL ────────────────────────────────────────────────────
echo "=== 6/6 Configuring nginx + SSL ==="

NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
NGINX_ENABLED="/etc/nginx/sites-enabled/$DOMAIN"

if [[ ! -f "$NGINX_CONF" ]]; then
  sudo tee "$NGINX_CONF" > /dev/null <<NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;
    root $BUILD_DIR;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
NGINXEOF

  sudo mkdir -p /etc/nginx/sites-enabled
  [[ -L "$NGINX_ENABLED" ]] || sudo ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
  sudo nginx -t && sudo systemctl reload nginx
fi

if ! sudo certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
  sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || {
    echo "WARNING: certbot failed. Run manually:"
    echo "  sudo certbot --nginx -d $DOMAIN"
  }
fi

echo ""
echo "=== Done! https://$DOMAIN ==="
