#!/bin/bash
# ============================================================================
# proxy.moovie.fun — RDP Server Setup Script
# Run once as root on your Ubuntu/Debian RDP server (161.118.191.46)
#
# Usage:
#   chmod +x setup.sh
#   sudo ./setup.sh
# ============================================================================

set -e

DOMAIN="proxy.moovie.fun"

echo "==> Installing Nginx with extras (includes sub_filter, ssl)"
apt-get update -qq
apt-get install -y nginx nginx-extras certbot python3-certbot-nginx

echo "==> Enabling required Nginx modules"
# sub_filter is in nginx-extras, already included above

echo "==> Stopping Nginx temporarily for cert issuance"
systemctl stop nginx || true

echo "==> Obtaining Let's Encrypt TLS certificate"
certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email admin@moovie.fun \
    -d "$DOMAIN"

echo "==> Installing Nginx config"
cp nginx.conf /etc/nginx/nginx.conf

echo "==> Testing Nginx config"
nginx -t

echo "==> Starting Nginx"
systemctl enable nginx
systemctl start nginx

echo "==> Setting up auto-renewal cron"
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | crontab -

echo ""
echo "✅ Done! proxy.moovie.fun is live."
echo "   Test it: curl -I https://proxy.moovie.fun/health"
