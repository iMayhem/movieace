#!/bin/bash
# ============================================================================
# MovieAce VPS Update Script
# Updates the Node.js API without downtime
# ============================================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="/opt/movieace-resolver"

echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════"
echo "  MovieAce VPS Update"
echo "═══════════════════════════════════════════════════════════"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}Note: Running without sudo. Some operations may require elevated privileges.${NC}"
fi

# ============================================================================
# Backup current version
# ============================================================================
echo -e "${YELLOW}[1/5] Creating backup...${NC}"
if [ -d "$APP_DIR" ]; then
    BACKUP_DIR="${APP_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    cp -r "$APP_DIR" "$BACKUP_DIR"
    echo -e "${GREEN}✓ Backup created at $BACKUP_DIR${NC}"
else
    echo -e "${YELLOW}⚠ Application directory not found. Is this a fresh install?${NC}"
    exit 1
fi

# ============================================================================
# Update application files
# ============================================================================
echo -e "${YELLOW}[2/5] Updating application files...${NC}"
cp server.js "$APP_DIR/"
cp package.json "$APP_DIR/"
cp ecosystem.config.cjs "$APP_DIR/"
echo -e "${GREEN}✓ Files updated${NC}"

# ============================================================================
# Update dependencies
# ============================================================================
echo -e "${YELLOW}[3/5] Updating dependencies...${NC}"
cd "$APP_DIR"
npm install --production
echo -e "${GREEN}✓ Dependencies updated${NC}"

# ============================================================================
# Update Nginx config (optional)
# ============================================================================
echo -e "${YELLOW}[4/5] Checking Nginx configuration...${NC}"
if [ -f "nginx.conf" ]; then
    read -p "Update Nginx config? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d_%H%M%S)
        sudo cp nginx.conf /etc/nginx/nginx.conf
        sudo nginx -t
        if [ $? -eq 0 ]; then
            sudo systemctl reload nginx
            echo -e "${GREEN}✓ Nginx configuration updated${NC}"
        else
            echo -e "${RED}✗ Nginx configuration has errors. Restoring backup...${NC}"
            sudo cp /etc/nginx/nginx.conf.backup.* /etc/nginx/nginx.conf
            exit 1
        fi
    else
        echo -e "${YELLOW}⊘ Skipped Nginx update${NC}"
    fi
fi

# ============================================================================
# Restart services
# ============================================================================
echo -e "${YELLOW}[5/5] Restarting services...${NC}"
pm2 restart movieace-resolver
echo -e "${GREEN}✓ Services restarted${NC}"

# ============================================================================
# Verify
# ============================================================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Update Complete!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Service Status:"
pm2 list | grep movieace-resolver
echo ""
echo "Testing health endpoint..."
sleep 2
curl -s http://localhost:8080/health | head -n 5
echo ""
echo ""
echo "If there are issues, restore from backup:"
echo "  sudo rm -rf $APP_DIR"
echo "  sudo mv $BACKUP_DIR $APP_DIR"
echo "  pm2 restart movieace-resolver"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
