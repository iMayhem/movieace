# Simple Installation (For Low-Resource VPS)

Your Oracle free tier is too low on resources for automated installation.
Let's do it manually, step by step.

## Option 1: Install One Thing at a Time

SSH into your VPS and run these commands **one at a time**, waiting for each to complete:

```bash
cd ~/vps-server

# 1. Install Nginx (may take 5-10 minutes on free tier)
sudo dnf install -y nginx

# 2. Configure Nginx
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
sudo cp nginx.conf /etc/nginx/nginx.conf
sudo nginx -t

# 3. Check if Node.js is installed
node -v

# If not installed:
sudo dnf module install -y nodejs:18

# 4. Install PM2
sudo npm install -g pm2

# 5. Deploy app
sudo mkdir -p /opt/movieace-resolver
sudo cp package.json server.js ecosystem.config.cjs .env /opt/movieace-resolver/
cd /opt/movieace-resolver

# 6. Install dependencies (takes 2-3 minutes)
npm install --production

# 7. Start services
pm2 start server.js --name movieace-resolver
pm2 save
pm2 startup

sudo systemctl start nginx
sudo systemctl enable nginx

# 8. Configure firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# 9. SELinux
sudo setsebool -P httpd_can_network_connect 1
```

## Option 2: Even Simpler - Just Run Node.js

If package installation keeps hanging, skip Nginx and just run Node.js:

```bash
cd ~/vps-server

# Install dependencies
npm install --production

# Run directly (for testing)
node server.js
```

Then test from your local machine:
```bash
curl http://161.118.191.46:8080/health
```

## Option 3: Use Docker (If Available)

If Docker is installed on your VPS:

```bash
cd ~/vps-server

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package.json server.js ecosystem.config.cjs .env ./
RUN npm install --production
EXPOSE 8080
CMD ["node", "server.js"]
EOF

# Build and run
docker build -t movieace-resolver .
docker run -d -p 8080:8080 --name movieace movieace-resolver
```

## Troubleshooting

### If dnf hangs:
1. Press Ctrl+C
2. Wait 5 minutes for system to cool down
3. Try again with just one package

### If you have limited RAM:
Check current usage:
```bash
free -h
```

If RAM is full, you may need to:
1. Stop other services
2. Add swap space
3. Or upgrade your VPS tier

### Check what's using resources:
```bash
top
# Press 'q' to quit
```

## Minimum Requirements

For this to work, you need:
- At least 512MB free RAM
- At least 1GB free disk space
- Stable network connection

If your free tier doesn't meet this, the automated installation won't work reliably.

## Alternative: Use a Different VPS

Consider using:
- DigitalOcean ($4/month droplet)
- Linode ($5/month)
- Vultr ($2.50/month)

These have better performance for the same or lower cost than dealing with Oracle free tier limitations.
