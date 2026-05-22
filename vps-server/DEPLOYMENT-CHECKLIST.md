# MovieAce VPS Deployment Checklist

Use this checklist to ensure a smooth deployment to your VPS.

## Pre-Deployment

### VPS Requirements
- [ ] Ubuntu 20.04+ or Debian 11+ installed
- [ ] Minimum 1GB RAM (2GB recommended)
- [ ] Minimum 10GB disk space
- [ ] Public IP address assigned
- [ ] Root or sudo access configured
- [ ] SSH key authentication set up
- [ ] Firewall allows ports 22, 80, 443

### Local Preparation
- [ ] All files in `vps-server/` directory reviewed
- [ ] VPS IP address noted (e.g., 161.118.191.46)
- [ ] SSH key file location noted
- [ ] Backup of any existing VPS configuration

## Deployment Steps

### 1. Upload Files to VPS
```bash
# Create tarball
cd movieace
tar -czf vps-server.tar.gz vps-server/

# Upload to VPS
scp -i ssh-key4.key vps-server.tar.gz opc@161.118.191.46:~/

# Verify upload
ssh -i ssh-key4.key opc@161.118.191.46 "ls -lh vps-server.tar.gz"
```

- [ ] Files uploaded successfully
- [ ] Tarball size looks correct (~50KB)

### 2. Extract and Prepare
```bash
# SSH into VPS
ssh -i ssh-key4.key opc@161.118.191.46

# Extract files
tar -xzf vps-server.tar.gz
cd vps-server

# Verify files
ls -la
```

- [ ] All files extracted
- [ ] Scripts are present (deploy.sh, test.sh, update.sh)
- [ ] Configuration files present (nginx.conf, server.js, etc.)

### 3. Run Deployment Script
```bash
# Make executable (if not already)
chmod +x deploy.sh

# Run deployment
sudo ./deploy.sh
```

**Watch for:**
- [ ] System packages updated
- [ ] Nginx installed successfully
- [ ] Node.js v18+ installed
- [ ] PM2 installed and configured
- [ ] Application directory created at `/opt/movieace-resolver`
- [ ] Dependencies installed
- [ ] Firewall configured
- [ ] Services started

**Expected output:**
```
✓ Nginx configuration is valid
✓ Node.js 18.x installed
✓ PM2 installed and configured
✓ Application directory created
✓ Dependencies installed
✓ Firewall rules configured
✓ Services started
```

### 4. Verify Installation
```bash
# Run test suite
chmod +x test.sh
./test.sh
```

- [ ] All health checks pass
- [ ] API endpoints respond
- [ ] CORS headers present
- [ ] Services running (Nginx + PM2)
- [ ] No errors in logs

### 5. Manual Verification
```bash
# Test health endpoint
curl http://YOUR_VPS_IP/health

# Test search API
curl "http://YOUR_VPS_IP/vps-proxy/search?q=avatar&type=movie"

# Check service status
pm2 status
systemctl status nginx

# View logs
pm2 logs movieace-resolver --lines 20
sudo tail -f /var/log/nginx/access.log
```

- [ ] Health endpoint returns "OK"
- [ ] Search returns JSON results
- [ ] PM2 shows "online" status
- [ ] Nginx shows "active (running)"
- [ ] No errors in logs

## Post-Deployment

### Frontend Configuration
In your Vue app (`src/composables/useStream.ts`):

```typescript
{ 
  name: 'Moviebox Direct', 
  urlTemplate: 'http://YOUR_VPS_IP',  // Update this!
  isApiProvider: true 
}
```

- [ ] VPS IP updated in frontend code
- [ ] Frontend rebuilt: `npm run build`
- [ ] Frontend deployed to Netlify/hosting

### End-to-End Testing
- [ ] Open MovieAce app in browser
- [ ] Search for a movie (e.g., "Avatar")
- [ ] Click to watch
- [ ] Select "Moviebox Direct" server
- [ ] Video loads in native player
- [ ] Subtitles appear (if available)
- [ ] Seeking works smoothly (<1 second)
- [ ] Quality selector works (if multiple options)
- [ ] No console errors

### Performance Verification
```bash
# Monitor resources
htop

# Monitor PM2
pm2 monit

# Check response times
time curl -s http://YOUR_VPS_IP/health > /dev/null
```

- [ ] CPU usage <10% at idle
- [ ] Memory usage <200MB total
- [ ] Response time <100ms
- [ ] No memory leaks over 10 minutes

## Optional: Production Hardening

### SSL/HTTPS Setup
```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate (requires domain name)
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

- [ ] SSL certificate obtained
- [ ] HTTPS working
- [ ] Auto-renewal configured
- [ ] Frontend updated to use HTTPS URL

### Domain Configuration
- [ ] Domain DNS A record points to VPS IP
- [ ] Domain propagated (check with `dig your-domain.com`)
- [ ] Nginx server_name updated
- [ ] SSL certificate issued for domain

### Monitoring Setup
- [ ] PM2 monitoring configured
- [ ] Log rotation set up
- [ ] Disk space alerts configured
- [ ] Uptime monitoring (e.g., UptimeRobot)

### Backup Strategy
- [ ] Automated backups configured
- [ ] Backup restoration tested
- [ ] Configuration files backed up
- [ ] Recovery procedure documented

## Troubleshooting

### If deployment fails:

1. **Check logs:**
   ```bash
   pm2 logs movieace-resolver
   sudo tail -f /var/log/nginx/error.log
   ```

2. **Verify services:**
   ```bash
   systemctl status nginx
   pm2 status
   ```

3. **Test manually:**
   ```bash
   cd /opt/movieace-resolver
   node server.js
   ```

4. **Restart services:**
   ```bash
   pm2 restart movieace-resolver
   sudo systemctl restart nginx
   ```

### Common Issues

**Issue: Port 80 already in use**
```bash
# Find what's using port 80
sudo lsof -i :80

# Stop the service
sudo systemctl stop apache2  # or whatever is using it
```

**Issue: Node.js version too old**
```bash
# Check version
node -v

# Reinstall Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Issue: PM2 not found**
```bash
# Install PM2 globally
sudo npm install -g pm2

# Verify
pm2 -v
```

**Issue: Nginx configuration error**
```bash
# Test configuration
sudo nginx -t

# View specific error
sudo nginx -t 2>&1 | grep error

# Restore backup
sudo cp /etc/nginx/nginx.conf.backup /etc/nginx/nginx.conf
```

## Rollback Procedure

If you need to rollback:

```bash
# Stop services
pm2 stop movieace-resolver
sudo systemctl stop nginx

# Restore Nginx config
sudo cp /etc/nginx/nginx.conf.backup.* /etc/nginx/nginx.conf

# Remove application
sudo rm -rf /opt/movieace-resolver

# Restart Nginx
sudo systemctl start nginx
```

## Success Criteria

Your deployment is successful when:

- [x] All test suite tests pass
- [x] Health endpoint responds in <100ms
- [x] Search API returns results
- [x] Video plays in frontend with <1s buffering
- [x] Seeking works with <200ms latency
- [x] CPU usage <5% under normal load
- [x] Memory usage stable over 1 hour
- [x] No errors in logs
- [x] Services auto-restart on reboot

## Next Steps

After successful deployment:

1. **Monitor for 24 hours**
   - Check logs regularly
   - Monitor resource usage
   - Test from different locations

2. **Optimize if needed**
   - Adjust cache TTLs
   - Tune PM2 instances
   - Configure rate limits

3. **Set up alerts**
   - Disk space warnings
   - High CPU/memory alerts
   - Service down notifications

4. **Document your setup**
   - Note any custom changes
   - Document troubleshooting steps
   - Share with team

## Support

If you encounter issues not covered here:

1. Check logs first
2. Review ARCHITECTURE.md for technical details
3. Consult README.md for management commands
4. Test with test.sh script

---

**Deployment Date:** _______________  
**Deployed By:** _______________  
**VPS IP:** _______________  
**Domain (if any):** _______________  
**Notes:** _______________
