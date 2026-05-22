#!/bin/bash
# ============================================================================
# MovieAce VPS Deployment Script for Oracle Linux (Lite Version)
# Optimized for low-resource free tier VPS
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VPS_IP="161.118.191.46"
APP_DIR="/opt/movieace-resolver"
NGINX_CONF="/etc/nginx/nginx.conf"

echo -e "${BLUE}MovieAce VPS Deployment (Oracle Linux - Lite)${NC}"
echo ""

if [ "$EUID" -ne 0 ]; then 
    echo "Error: Please run as root (use sudo)"
    exit 1
fi

# ============================================================================
# Step 1: Install Nginx (skip update to save resources)
# ============================================================================
echo -e "${YELLOW}[1/6] Installing Nginx...${NC}"
dnf install -y nginx > /dev/null 2>&1

if [ -f "$NGINX_CONF" ]; then
    cp "$NGINX_CONF" "${NGINX_CONF}.backup"
fi

cp nginx.conf "$NGINX_CONF"
nginx -t
echo -e "${GREEN}✓ Nginx installed${NC}"

# ============================================================================
# Step 2: Install Node.js
# ============================================================================
echo -e "${YELLOW}[2/6] Installing Node.js...${NC}"

if ! command -v node &> /dev/null; then
    dnf module install -y nodejs:18 > /dev/null 2>&1
fi

echo -e "${GREEN}✓ Node.js $(node -v) ready${NC}"

# ============================================================================
# Step 3: Install PM2
# ============================================================================
echo -e "${YELLOW}[3/6] Installing PM2...${NC}"

if ! command -v pm2 &> /dev/null; then
    npm install -g pm2 > /dev/null 2>&1
fi

echo -e "${GREEN}✓ PM2 ready${NC}"

# ============================================================================
# Step 4: Deploy Application
# ============================================================================
echo -e "${YELLOW}[4/6] Deploying application...${NC}"

mkdir -p "$APP_DIR/logs"
cp package.json server.js ecosystem.config.cjs .env "$APP_DIR/"
chown -R $SUDO_USER:$SUDO_USER "$APP_DIR"

echo -e "${GREEN}✓ Files deployed${NC}"

# ============================================================================
# Step 5: Install Dependencies (one at a time to save memory)
# ============================================================================
echo -e "${YELLOW}[5/6] Installing dependencies...${NC}"

cd "$APP_DIR"
sudo -u $SUDO_USER npm install --production --no-audit --no-fund > /dev/null 2>&1

echo -e "${GREEN}✓ Dependencies installed${NC}"

# ============================================================================
# Step 6: Start Services
# ============================================================================
echo -e "${YELLOW}[6/6] Starting services...${NC}"

# Configure SELinux
setsebool -P httpd_can_network_connect 1 2>/dev/null || true

# Configure firewall
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http --add-service=https > /dev/null 2>&1
    firewall-cmd --reload > /dev/null 2>&1
fi

# Start PM2 with single instance (save memory)
cd "$APP_DIR"
sudo -u $SUDO_USER pm2 delete movieace-resolver 2>/dev/null || true
sudo -u $SUDO_USER pm2 start server.js --name movieace-resolver --instances 1
sudo -u $SUDO_USER pm2 save
sudo -u $SUDO_USER pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER > /dev/null 2>&1

# Start Nginx
systemctl enable nginx > /dev/null 2>&1
systemctl restart nginx

echo -e "${GREEN}✓ Services started${NC}"

# ============================================================================
# Done
# ============================================================================
echo ""
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo ""
echo "Test it:"
echo "  curl http://${VPS_IP}/health"
echo ""
echo "View logs:"
echo "  pm2 logs movieace-resolver"
echo ""
