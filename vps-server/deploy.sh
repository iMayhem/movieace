#!/bin/bash
# ============================================================================
# MovieAce VPS Deployment Script
# Complete automated setup for Oracle Cloud VPS (Ubuntu/Debian)
#
# This script:
#   1. Installs and configures Nginx
#   2. Sets up Node.js v18+ environment
#   3. Installs and configures PM2 for process management
#   4. Deploys the resolver API
#   5. Configures firewall rules
#   6. Sets up log rotation
#
# Usage:
#   chmod +x deploy.sh
#   sudo ./deploy.sh
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VPS_IP="161.118.191.46"
NODE_VERSION="18"
APP_DIR="/opt/movieace-resolver"
NGINX_CONF="/etc/nginx/nginx.conf"

echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════"
echo "  MovieAce VPS Deployment"
echo "  High-Performance Streaming Architecture Setup"
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"

# ============================================================================
# Check if running as root
# ============================================================================
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Please run as root (use sudo)${NC}"
    exit 1
fi

# ============================================================================
# Step 1: System Update
# ============================================================================
echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
apt-get update -qq
apt-get upgrade -y -qq

# ============================================================================
# Step 2: Install Nginx
# ============================================================================
echo -e "${YELLOW}[2/8] Installing Nginx...${NC}"
apt-get install -y nginx

# Backup existing config
if [ -f "$NGINX_CONF" ]; then
    cp "$NGINX_CONF" "${NGINX_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}✓ Backed up existing Nginx config${NC}"
fi

# Install new config
cp nginx.conf "$NGINX_CONF"
echo -e "${GREEN}✓ Installed new Nginx configuration${NC}"

# Test config
nginx -t
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Nginx configuration is valid${NC}"
else
    echo -e "${RED}✗ Nginx configuration has errors${NC}"
    exit 1
fi

# ============================================================================
# Step 3: Install Node.js
# ============================================================================
echo -e "${YELLOW}[3/8] Installing Node.js ${NODE_VERSION}...${NC}"

# Check if Node.js is already installed
if command -v node &> /dev/null; then
    CURRENT_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$CURRENT_VERSION" -ge "$NODE_VERSION" ]; then
        echo -e "${GREEN}✓ Node.js ${CURRENT_VERSION} is already installed${NC}"
    else
        echo -e "${YELLOW}Upgrading Node.js from v${CURRENT_VERSION} to v${NODE_VERSION}...${NC}"
    fi
else
    # Install Node.js using NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
    echo -e "${GREEN}✓ Node.js $(node -v) installed${NC}"
fi

# ============================================================================
# Step 4: Install PM2
# ============================================================================
echo -e "${YELLOW}[4/8] Installing PM2 process manager...${NC}"
npm install -g pm2
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER
echo -e "${GREEN}✓ PM2 installed and configured${NC}"

# ============================================================================
# Step 5: Create Application Directory
# ============================================================================
echo -e "${YELLOW}[5/8] Setting up application directory...${NC}"
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/logs"

# Copy application files
cp package.json "$APP_DIR/"
cp server.js "$APP_DIR/"
cp ecosystem.config.cjs "$APP_DIR/"
cp .env.example "$APP_DIR/.env"

# Set permissions
chown -R $SUDO_USER:$SUDO_USER "$APP_DIR"
echo -e "${GREEN}✓ Application directory created at $APP_DIR${NC}"

# ============================================================================
# Step 6: Install Node.js Dependencies
# ============================================================================
echo -e "${YELLOW}[6/8] Installing Node.js dependencies...${NC}"
cd "$APP_DIR"
sudo -u $SUDO_USER npm install --production
echo -e "${GREEN}✓ Dependencies installed${NC}"

# ============================================================================
# Step 7: Configure Firewall
# ============================================================================
echo -e "${YELLOW}[7/8] Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw allow 22/tcp
    echo -e "${GREEN}✓ Firewall rules configured${NC}"
else
    echo -e "${YELLOW}⚠ UFW not found, skipping firewall configuration${NC}"
fi

# ============================================================================
# Step 8: Start Services
# ============================================================================
echo -e "${YELLOW}[8/8] Starting services...${NC}"

# Start Node.js resolver with PM2
cd "$APP_DIR"
sudo -u $SUDO_USER pm2 start ecosystem.config.cjs
sudo -u $SUDO_USER pm2 save

# Start Nginx
systemctl enable nginx
systemctl restart nginx

echo -e "${GREEN}✓ Services started${NC}"

# ============================================================================
# Verify Installation
# ============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Deployment Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Service Status:"
echo "  • Nginx:          $(systemctl is-active nginx)"
echo "  • Node Resolver:  $(sudo -u $SUDO_USER pm2 list | grep movieace-resolver | awk '{print $10}')"
echo ""
echo "Endpoints:"
echo "  • Health Check:   http://${VPS_IP}/health"
echo "  • Search API:     http://${VPS_IP}/vps-proxy/search"
echo "  • Resolve API:    http://${VPS_IP}/vps-proxy/resolve"
echo "  • Subtitle API:   http://${VPS_IP}/vps-proxy/subtitle"
echo ""
echo "Management Commands:"
echo "  • View logs:      pm2 logs movieace-resolver"
echo "  • Restart API:    pm2 restart movieace-resolver"
echo "  • Stop API:       pm2 stop movieace-resolver"
echo "  • Restart Nginx:  systemctl restart nginx"
echo "  • Nginx logs:     tail -f /var/log/nginx/access.log"
echo ""
echo "Testing:"
echo "  curl http://${VPS_IP}/health"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
