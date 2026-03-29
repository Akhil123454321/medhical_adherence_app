#!/bin/bash
# =============================================================================
# deploy.sh  —  push code from your Mac to the EC2 server and restart the app
#
# Usage:
#   ./deploy/deploy.sh                   # normal re-deploy
#   ./deploy/deploy.sh --init            # first ever deploy (also copies database/)
#
# Prerequisites on your Mac:
#   - SSH key: medhadhere.pem in project root (already present)
#   - SERVER_IP set below (or exported in env)
# =============================================================================

# ---------------------------------------------------------------------------
# CONFIGURE THESE
# ---------------------------------------------------------------------------
KEY="${KEY:-./medhadhere-prod.pem}"
SERVER_IP="${SERVER_IP:-98.81.186.163}"
SERVER_USER="${SERVER_USER:-ubuntu}"
REMOTE_APP_DIR="/var/www/medadhere"
REMOTE_DB_DIR="/var/db/medadhere"
# ---------------------------------------------------------------------------

set -e

if [[ -z "$SERVER_IP" ]]; then
  echo "❌  SERVER_IP is not set."
  echo "    Export it before running:"
  echo "      export SERVER_IP=<your-elastic-ip>"
  echo "    or edit deploy.sh and hardcode it."
  exit 1
fi

INIT=false
if [[ "$1" == "--init" ]]; then
  INIT=true
fi

SSH="ssh -i $KEY -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP}"
RSYNC="rsync -avz --progress -e \"ssh -i $KEY -o StrictHostKeyChecking=no\""

echo "==> Deploying to ${SERVER_USER}@${SERVER_IP}:${REMOTE_APP_DIR}"

# ---------------------------------------------------------------------------
# 1. Sync application code (never overwrites the live database/)
# ---------------------------------------------------------------------------
echo "==> Syncing code..."
eval "$RSYNC \
  --exclude 'node_modules/' \
  --exclude '.next/' \
  --exclude '.git/' \
  --exclude 'database/' \
  --exclude 'deploy/*.pem' \
  --exclude '.env.local' \
  ./ ${SERVER_USER}@${SERVER_IP}:${REMOTE_APP_DIR}/"

# ---------------------------------------------------------------------------
# 2. First deploy: seed the database
# ---------------------------------------------------------------------------
if [[ "$INIT" == true ]]; then
  echo "==> (--init) Copying initial database to ${REMOTE_DB_DIR}..."
  eval "$RSYNC database/ ${SERVER_USER}@${SERVER_IP}:${REMOTE_DB_DIR}/"

  echo "==> Symlinking database/ into app directory..."
  $SSH "ln -sfn ${REMOTE_DB_DIR} ${REMOTE_APP_DIR}/database"
fi

# ---------------------------------------------------------------------------
# 3. Install / update dependencies + build
# ---------------------------------------------------------------------------
echo "==> Installing dependencies and building..."
$SSH "cd ${REMOTE_APP_DIR} && npm ci --omit=dev && npm run build"

# ---------------------------------------------------------------------------
# 4. Restart (or start) the app with PM2
# ---------------------------------------------------------------------------
echo "==> Restarting app..."
$SSH "cd ${REMOTE_APP_DIR} && \
  pm2 describe medadhere > /dev/null 2>&1 \
  && pm2 restart medadhere \
  || pm2 start npm --name medadhere -- start"

$SSH "pm2 save"

echo ""
echo "✅  Deploy complete!"
echo "    App running at http://${SERVER_IP}:3000 (Nginx proxies :80/:443)"
echo ""
echo "    Check logs:  ssh -i ${KEY} ${SERVER_USER}@${SERVER_IP} 'pm2 logs medadhere'"
