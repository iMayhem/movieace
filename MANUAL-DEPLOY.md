# Manual Deployment Steps (After Server Restart)

## The archive is ready and uploaded to your VPS!

Once your server restarts, SSH in and run these commands:

```bash
# 1. SSH into VPS
ssh -i ~/key/ssh-key4.key opc@161.118.191.46

# 2. Extract files
cd ~
tar -xzf vps-server.tar.gz
cd vps-server

# 3. Make scripts executable
chmod +x *.sh

# 4. Run the LITE deployment (optimized for low resources)
sudo ./deploy-oracle-lite.sh
```

## What the lite script does:

- ✅ Installs Nginx (minimal output)
- ✅ Installs Node.js 18
- ✅ Installs PM2
- ✅ Deploys app to `/opt/movieace-resolver`
- ✅ Installs dependencies (quietly)
- ✅ Starts services with **1 instance** (saves memory)
- ✅ Configures firewall

**Time:** 2-3 minutes  
**Memory usage:** ~100MB total (vs 200MB+ with 2 instances)

## After deployment:

```bash
# Test health
curl http://161.118.191.46/health

# Test search
curl "http://161.118.191.46/vps-proxy/search?q=avatar&type=movie"

# Check status
pm2 status
systemctl status nginx

# View logs
pm2 logs movieace-resolver
```

## If it still hangs:

Run commands one by one instead of the script:

```bash
# Install Nginx
sudo dnf install -y nginx

# Install Node.js
sudo dnf module install -y nodejs:18

# Install PM2
sudo npm install -g pm2

# Deploy app
sudo mkdir -p /opt/movieace-resolver
sudo cp package.json server.js ecosystem.config.cjs .env /opt/movieace-resolver/
cd /opt/movieace-resolver
sudo npm install --production

# Start services
pm2 start server.js --name movieace-resolver
pm2 save
sudo systemctl start nginx
```

## The archive is already on your VPS at:
`~/vps-server.tar.gz`

Just extract and run when the server is back up! 🚀
