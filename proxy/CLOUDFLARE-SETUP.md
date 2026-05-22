# Cloudflare + SSL Setup Guide

## Overview

This guide will help you:
1. Point `proxy.moovie.fun` DNS to your server via Cloudflare
2. Set up SSL certificate with Let's Encrypt
3. Configure Nginx to handle HTTPS traffic

## Step 1: Cloudflare DNS Setup

### 1.1 Add Domain to Cloudflare
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Add your domain `moovie.fun` if not already added
3. Follow Cloudflare's nameserver setup instructions

### 1.2 Create DNS Record
1. Go to DNS settings for `moovie.fun`
2. Add an **A record**:
   - **Type**: A
   - **Name**: proxy
   - **IPv4 address**: `161.118.191.46`
   - **Proxy status**: 🟠 DNS only (click the cloud to disable proxy)
   - **TTL**: Auto

**IMPORTANT**: Set to "DNS only" (gray cloud), NOT "Proxied" (orange cloud). We need direct access for Let's Encrypt verification.

### 1.3 Verify DNS Propagation
Wait 2-5 minutes, then test:
```bash
dig proxy.moovie.fun
# Should show: 161.118.191.46

# Or use:
nslookup proxy.moovie.fun
```

## Step 2: SSL Certificate Setup

### 2.1 Upload Setup Script
```bash
scp -i ~/key/ssh-key4.key proxy/setup-ssl.sh opc@161.118.191.46:/tmp/
```

### 2.2 Run SSL Setup
```bash
ssh -i ~/key/ssh-key4.key opc@161.118.191.46
chmod +x /tmp/setup-ssl.sh
sudo /tmp/setup-ssl.sh
```

The script will:
- Stop nginx temporarily
- Install certbot (if needed)
- Get SSL certificate from Let's Encrypt
- Update nginx config to use HTTPS
- Start nginx with SSL

### 2.3 Verify SSL
```bash
curl https://proxy.moovie.fun/health
# Should return: ok

# Check certificate:
openssl s_client -connect proxy.moovie.fun:443 -servername proxy.moovie.fun
```

## Step 3: Update Movieace Code

The code is already updated to use `https://proxy.moovie.fun/`. Just deploy:

```bash
cd ~/movieace
git add netlify/functions/moovie.mjs
git commit -m "Use HTTPS proxy with SSL"
git push
```

Netlify will auto-deploy in ~1-2 minutes.

## Step 4: Enable Cloudflare Proxy (Optional)

After SSL is working, you can optionally enable Cloudflare's proxy:

1. Go back to Cloudflare DNS settings
2. Click the cloud icon next to `proxy` A record
3. Change from 🟠 DNS only → 🟧 Proxied

**Benefits:**
- DDoS protection
- Caching (for static content)
- Hide your server IP
- Free Cloudflare SSL

**Note:** If you enable Cloudflare proxy, you need to set SSL mode to "Full" in Cloudflare:
- Go to SSL/TLS → Overview
- Set SSL/TLS encryption mode to **Full** (not Flexible, not Full Strict)

## Architecture

```
Browser
  ↓
Netlify Function (movieace.netlify.app)
  ↓
HTTPS → proxy.moovie.fun (161.118.191.46)
  ↓
Nginx (port 443) → Node.js (port 8080) → aoneroom.com API
  ↓
CDN (video streams)
```

## Troubleshooting

### DNS not resolving
```bash
# Check if DNS is propagated
dig proxy.moovie.fun

# If not, wait 5-10 minutes and try again
```

### Let's Encrypt fails
```bash
# Make sure port 80 is open
sudo firewall-cmd --list-ports

# If 80 is not listed:
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --reload

# Make sure nginx is stopped
sudo pkill nginx

# Try again
sudo /tmp/setup-ssl.sh
```

### Certificate expired
```bash
# Renew manually
sudo certbot renew

# Reload nginx
sudo nginx -s reload
```

### Nginx won't start
```bash
# Check config
sudo nginx -t

# Check logs
sudo tail -50 /var/log/nginx/error.log

# Check if port 443 is in use
sudo netstat -tlnp | grep :443
```

## Auto-Renewal

Certbot automatically sets up a cron job to renew certificates. Check it:
```bash
sudo systemctl status certbot-renew.timer
# or
sudo crontab -l
```

To manually renew:
```bash
sudo certbot renew
sudo nginx -s reload
```

## Firewall Ports

Make sure these ports are open:
```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## Monitoring

### Check Nginx status
```bash
ps aux | grep nginx
```

### Check Node.js proxy status
```bash
pm2 list
pm2 logs moovie-proxy
```

### Check SSL certificate expiry
```bash
sudo certbot certificates
```

### Test endpoints
```bash
# Health check
curl https://proxy.moovie.fun/health

# API proxy
curl https://proxy.moovie.fun/api/

# Stream proxy (will return 404 without full URL, but shows it's working)
curl -I https://proxy.moovie.fun/https://example.com
```

## Summary Checklist

- [ ] Add A record in Cloudflare: `proxy.moovie.fun` → `161.118.191.46`
- [ ] Set to "DNS only" (gray cloud)
- [ ] Wait for DNS propagation (2-5 min)
- [ ] Run `setup-ssl.sh` on server
- [ ] Verify SSL: `curl https://proxy.moovie.fun/health`
- [ ] Push updated code to GitHub
- [ ] Wait for Netlify deployment
- [ ] Test movie playback
- [ ] (Optional) Enable Cloudflare proxy + set SSL to "Full"

## Support

If you encounter issues:
1. Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
2. Check proxy logs: `pm2 logs moovie-proxy`
3. Verify DNS: `dig proxy.moovie.fun`
4. Test SSL: `openssl s_client -connect proxy.moovie.fun:443`
