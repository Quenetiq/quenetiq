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
echo "=== 2/7 Cloning $SELECTED_BRANCH from $REPO_URL ==="
git clone --depth=1 --branch "$SELECTED_BRANCH" "$REPO_URL" "$TEMP_DIR"
cd "$TEMP_DIR"

# ── 3. Install ────────────────────────────────────────────────────────
echo "=== 3/7 Installing dependencies ==="
npm ci

# ── 4. Build packages ─────────────────────────────────────────────────
echo "=== 4/7 Building @quenetiq/* packages ==="
node scripts/build-packages.mjs

# ── 5. Build Angular ──────────────────────────────────────────────────
echo "=== 5/7 Building Angular app ==="
npx ng build --configuration=production --progress=false

# ── 6. Copy ───────────────────────────────────────────────────────────
echo "=== 6/7 Deploying to $BUILD_DIR ==="
sudo mkdir -p "$BUILD_DIR"
sudo cp -r dist/dumb-keystore/* "$BUILD_DIR"
cd / && rm -rf "$TEMP_DIR"

# ── 7. nginx + SSL ────────────────────────────────────────────────────
echo "=== 7/7 Configuring nginx + SSL ==="

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
