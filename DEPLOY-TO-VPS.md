# Deploy MovieAce Backend to VPS

## You're almost there! Follow these steps:

### Step 1: Upload the Archive to VPS

In a **NEW terminal window** on your local machine (not the SSH session), run:

```bash
cd ~/movieace
scp -i ~/key5/ssh-key4.key vps-server.tar.gz opc@161.118.191.46:~/
```

### Step 2: In Your VPS Terminal (the one you have open)

Run these commands:

```bash
# Extract the files
cd ~
tar -xzf vps-server.tar.gz
cd vps-server

# Make scripts executable
chmod +x *.sh

# Run deployment (this will install everything)
sudo ./deploy.sh
```

### Step 3: After Deployment Completes

Test the installation:

```bash
# Run the test suite
./test.sh
```

### Step 4: Verify It's Working

```bash
# Test health endpoint
curl http://161.118.191.46/health

# Test search API
curl "http://161.118.191.46/vps-proxy/search?q=avatar&type=movie"
```

## What the deploy.sh Script Does

1. ✅ Updates system packages
2. ✅ Installs Nginx
3. ✅ Installs Node.js v18+
4. ✅ Installs PM2 process manager
5. ✅ Deploys the application to `/opt/movieace-resolver`
6. ✅ Installs dependencies
7. ✅ Configures firewall
8. ✅ Starts all services

**Time:** 3-5 minutes

## Troubleshooting

### If upload fails:
Check your SSH key path and VPS IP are correct.

### If deployment fails:
Check the logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

### If services don't start:
```bash
pm2 logs movieace-resolver
systemctl status nginx
```

## After Successful Deployment

Your endpoints will be live at:
- Health: `http://161.118.191.46/health`
- Search: `http://161.118.191.46/vps-proxy/search`
- Resolve: `http://161.118.191.46/vps-proxy/resolve`
- Subtitle: `http://161.118.191.46/vps-proxy/subtitle`

Your Vue app is already configured to use these endpoints!

---

**Need help?** The archive is ready at `~/movieace/vps-server.tar.gz`
