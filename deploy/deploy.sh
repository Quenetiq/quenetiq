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
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"
NGINX_ENABLED="/etc/nginx/sites-enabled/$DOMAIN"

echo ""
echo "=== Deploying Quenetiq to $DOMAIN ==="
echo ""

# ── 0. Ensure required directories exist ──────────────────────────────
echo "=== 0/8 Ensuring required directories ==="
sudo mkdir -p "$NGINX_ROOT"
sudo mkdir -p "$BUILD_DIR"
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled
echo "  ✓ $NGINX_ROOT"
echo "  ✓ $BUILD_DIR"
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
echo "=== 2/8 Cloning $SELECTED_BRANCH from $REPO_URL ==="
git clone --depth=1 --branch "$SELECTED_BRANCH" "$REPO_URL" "$TEMP_DIR"
cd "$TEMP_DIR"

# ── 3. Install ────────────────────────────────────────────────────────
echo "=== 3/8 Installing dependencies ==="
npm ci

# ── 4. Build packages ─────────────────────────────────────────────────
echo "=== 4/8 Building @quenetiq/* packages ==="
node scripts/build-packages.mjs

# ── 5. Build Angular ──────────────────────────────────────────────────
echo "=== 5/8 Building Angular app ==="
npx ng build --configuration=production --progress=false

# ── 6. Copy ───────────────────────────────────────────────────────────
echo "=== 6/8 Deploying to $BUILD_DIR ==="
sudo cp -r dist/dumb-keystore/* "$BUILD_DIR"
cd / && rm -rf "$TEMP_DIR"

# ── 7. nginx ──────────────────────────────────────────────────────────
echo "=== 7/8 Configuring nginx ==="

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

  [[ -L "$NGINX_ENABLED" ]] || sudo ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
  sudo nginx -t && sudo systemctl reload nginx
fi

# ── 8. SSL (optional) ─────────────────────────────────────────────────
echo "=== 8/8 SSL (optional) ==="
SETUP_SSL=""
while [[ "$SETUP_SSL" != "y" && "$SETUP_SSL" != "n" ]]; do
  read -rp "Set up SSL with Let's Encrypt? (y/n): " SETUP_SSL
done

if [[ "$SETUP_SSL" == "y" ]]; then
  if sudo certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    echo "  ✓ SSL certificate already exists for $DOMAIN"
  else
    sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "admin@$DOMAIN" || {
      echo "WARNING: certbot failed. Run manually:"
      echo "  sudo certbot --nginx -d $DOMAIN"
    }
  fi
else
  echo "  Skipped SSL. You can run later:"
  echo "  sudo certbot --nginx -d $DOMAIN"
fi

echo ""
echo "=== Done! https://$DOMAIN ==="
