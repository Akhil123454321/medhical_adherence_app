#!/bin/bash
# =============================================================================
# setup-server.sh
# Run ONCE on a fresh Ubuntu 22.04 EC2 instance after SSH-ing in.
# Usage:  bash setup-server.sh
# =============================================================================
set -e

echo "==> Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

# ---------------------------------------------------------------------------
# Node.js 20 (LTS)
# ---------------------------------------------------------------------------
echo "==> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

node -v
npm -v

# ---------------------------------------------------------------------------
# PM2  —  production process manager
# ---------------------------------------------------------------------------
echo "==> Installing PM2..."
sudo npm install -g pm2

# ---------------------------------------------------------------------------
# Nginx  —  reverse proxy + TLS termination
# ---------------------------------------------------------------------------
echo "==> Installing Nginx..."
sudo apt-get install -y nginx

# ---------------------------------------------------------------------------
# Certbot  —  free Let's Encrypt SSL certificates
# ---------------------------------------------------------------------------
echo "==> Installing Certbot..."
sudo apt-get install -y certbot python3-certbot-nginx

# ---------------------------------------------------------------------------
# UFW firewall
# ---------------------------------------------------------------------------
echo "==> Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # ports 80 + 443
sudo ufw --force enable
sudo ufw status

# ---------------------------------------------------------------------------
# App directory
# ---------------------------------------------------------------------------
echo "==> Creating app directory..."
sudo mkdir -p /var/www/medadhere
sudo chown ubuntu:ubuntu /var/www/medadhere

# Create a persistent directory for the database (survives re-deploys)
sudo mkdir -p /var/db/medadhere
sudo chown ubuntu:ubuntu /var/db/medadhere

echo ""
echo "✅  Server setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run deploy/deploy.sh from your local machine (first time: with --init)"
echo "  2. Copy deploy/nginx.conf to /etc/nginx/sites-available/medadhere"
echo "     and replace YOUR_DOMAIN with your actual domain"
echo "  3. sudo ln -s /etc/nginx/sites-available/medadhere /etc/nginx/sites-enabled/"
echo "  4. sudo nginx -t && sudo systemctl restart nginx"
echo "  5. sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN"
echo "  6. pm2 startup  (follow the printed command)"
