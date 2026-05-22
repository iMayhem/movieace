#!/bin/bash
# ============================================================================
# Ultra-Minimal Manual Installation
# For extremely low-resource VPS - installs only what's needed
# ============================================================================

echo "MovieAce Manual Installation"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "Please run as root: sudo ./manual-install.sh"
    exit 1
fi

APP_DIR="/opt/movieace-resolver"
NGINX_CONF="/etc/nginx/nginx.conf"

# ============================================================================
# Step 1: Check if Nginx is already installed
# ============================================================================
echo "[1/5] Checking Nginx..."
if command -v nginx &> /dev/null; then
    echo "✓ Nginx already installed"
else
    echo "Installing Nginx (this may take a while on free tier)..."
    echo "If it hangs, press Ctrl+C and install manually: sudo dnf install nginx"
    dnf install -y nginx
fi

# Configure Nginx
if [ -f "$NGINX_CONF" ]; then
    cp "$NGINX_CONF" "${NGINX_CONF}.backup"
fi
cp nginx.conf "$NGINX_CONF"
nginx -t && echo "✓ Nginx configured"

# ============================================================================
# Step 2: Check if Node.js is installed
# ============================================================================
echo ""
echo "[2/5] Checking Node.js..."
if command -v node &> /dev/null; then
    echo "✓ Node.js $(node -v) already installed"
else
    echo "Node.js not found. Install it manually:"
    echo "  sudo dnf module install -y nodejs:18"
    exit 1
fi

# ============================================================================
# Step 3: Install PM2
# ============================================================================
echo ""
echo "[3/5] Checking PM2..."
if command -v pm2 &> /dev/null; then
    echo "✓ PM2 already installed"
else
    echo "Installing PM2..."
    npm install -g pm2
fi

# ============================================================================
# Step 4: Deploy Application
# ============================================================================
echo ""
echo "[4/5] Deploying application..."
mkdir -p "$APP_DIR/logs"
cp package.json server.js ecosystem.config.cjs .env "$APP_DIR/"
chown -R $SUDO_USER:$SUDO_USER "$APP_DIR"

cd "$APP_DIR"
echo "Installing dependencies (this may take 2-3 minutes)..."
sudo -u $SUDO_USER npm install --production --no-audit --no-fund

echo "✓ Application deployed"

# ============================================================================
# Step 5: Start Services
# ============================================================================
echo ""
echo "[5/5] Starting services..."

# SELinux
setsebool -P httpd_can_network_connect 1 2>/dev/null || true

# Firewall
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http 2>/dev/null || true
    firewall-cmd --permanent --add-service=https 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
fi

# Start PM2
cd "$APP_DIR"
sudo -u $SUDO_USER pm2 delete movieace-resolver 2>/dev/null || true
sudo -u $SUDO_USER pm2 start server.js --name movieace-resolver
sudo -u $SUDO_USER pm2 save
sudo -u $SUDO_USER pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER

# Start Nginx
systemctl enable nginx
systemctl restart nginx

echo ""
echo "✓ Done!"
echo ""
echo "Test: curl http://161.118.191.46/health"
echo "Logs: pm2 logs movieace-resolver"
