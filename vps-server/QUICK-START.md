# Quick Start Guide — 5 Minutes to Production

## Prerequisites
- Ubuntu/Debian VPS with root access
- Public IP address (e.g., 161.118.191.46)
- SSH key configured

## Step 1: Upload Files to VPS

From your local machine:

```bash
# Create a tarball
cd movieace
tar -czf vps-server.tar.gz vps-server/

# Upload to VPS
scp -i ssh-key4.key vps-server.tar.gz opc@161.118.191.46:~/

# SSH into VPS
ssh -i ssh-key4.key opc@161.118.191.46
```

## Step 2: Extract and Deploy

On the VPS:

```bash
# Extract files
cd ~
tar -xzf vps-server.tar.gz
cd vps-server

# Make deploy script executable
chmod +x deploy.sh

# Run deployment (requires sudo)
sudo ./deploy.sh
```

The script will automatically:
- ✓ Install Nginx
- ✓ Install Node.js v18
- ✓ Install PM2
- ✓ Deploy the API
- ✓ Configure firewall
- ✓ Start all services

## Step 3: Verify Installation

```bash
# Test health endpoint
curl http://161.118.191.46/health

# Expected output: "MovieAce VPS Proxy - OK"

# Test search API
curl "http://161.118.191.46/vps-proxy/search?q=avatar&type=movie"

# Should return JSON with search results
```

## Step 4: Update Frontend Configuration

In your Vue app (`src/composables/useStream.ts`), the Moviebox Direct server is already configured:

```typescript
{ 
  name: 'Moviebox Direct', 
  urlTemplate: 'http://161.118.191.46', 
  isApiProvider: true 
}
```

No changes needed! The frontend will automatically use the VPS resolver.

## Step 5: Test Streaming

1. Open your MovieAce app
2. Search for a movie or TV show
3. Click to watch
4. Select "Moviebox Direct" from the server list
5. Video should load with native HTML5 player and subtitles

## Common Issues

### Issue: "Connection refused"
**Solution:** Check if services are running:
```bash
pm2 status
systemctl status nginx
```

### Issue: "502 Bad Gateway"
**Solution:** Node.js API is down. Restart it:
```bash
pm2 restart movieace-resolver
pm2 logs movieace-resolver
```

### Issue: Video won't play
**Solution:** Check Nginx logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

## Management Commands

```bash
# View API logs
pm2 logs movieace-resolver

# Restart API
pm2 restart movieace-resolver

# Restart Nginx
sudo systemctl restart nginx

# Check status
pm2 status
systemctl status nginx
```

## Next Steps

- [ ] Set up SSL/HTTPS with Let's Encrypt
- [ ] Configure domain name (optional)
- [ ] Set up monitoring and alerts
- [ ] Configure log rotation
- [ ] Optimize for your traffic levels

## Production Checklist

- [x] Nginx installed and configured
- [x] Node.js API running with PM2
- [x] Firewall configured
- [x] Services auto-start on reboot
- [ ] SSL certificate installed
- [ ] Domain name configured
- [ ] Monitoring set up
- [ ] Backup strategy in place

## Support

If you encounter issues:

1. **Check logs first:**
   ```bash
   pm2 logs movieace-resolver --lines 50
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Verify health:**
   ```bash
   curl http://161.118.191.46/health
   ```

3. **Restart services:**
   ```bash
   pm2 restart movieace-resolver
   sudo systemctl restart nginx
   ```

## Performance Tips

For a 1GB RAM VPS:
- Current config (2 PM2 instances) is optimal
- Nginx handles 100+ concurrent streams easily
- Monitor with: `htop` and `pm2 monit`

For a 2GB+ RAM VPS:
- Increase PM2 instances to 4 in `ecosystem.config.cjs`
- Increase worker_connections to 8192 in `nginx.conf`

---

**That's it!** Your high-performance streaming backend is now live. 🎬
