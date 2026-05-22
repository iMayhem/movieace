# Quick Start - SSL Setup

## 1. Cloudflare DNS (Do this first!)

Go to Cloudflare → DNS → Add record:
- **Type**: A
- **Name**: proxy
- **IPv4**: 161.118.191.46
- **Proxy**: 🟠 DNS only (gray cloud)

Wait 2-5 minutes, then verify:
```bash
dig proxy.moovie.fun
# Should show: 161.118.191.46
```

## 2. Run SSL Setup on Server

```bash
# Upload script
scp -i ~/key/ssh-key4.key proxy/setup-ssl.sh opc@161.118.191.46:/tmp/

# SSH to server
ssh -i ~/key/ssh-key4.key opc@161.118.191.46

# Run setup
chmod +x /tmp/setup-ssl.sh
sudo /tmp/setup-ssl.sh
```

Answer "yes" when asked if DNS is ready.

## 3. Test

```bash
curl https://proxy.moovie.fun/health
# Should return: ok
```

## 4. Done!

The code is already pushed to GitHub. Netlify will auto-deploy.

Wait 1-2 minutes, then try playing a movie on movieace.netlify.app

## If Something Goes Wrong

### DNS not working
```bash
# Check DNS
dig proxy.moovie.fun

# If empty, wait 5 more minutes
```

### SSL fails
```bash
# Make sure port 80 is open
sudo firewall-cmd --list-ports

# Stop nginx and try again
sudo pkill nginx
sudo /tmp/setup-ssl.sh
```

### Movie still not playing
```bash
# Check proxy logs
pm2 logs moovie-proxy

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

## Server Management

```bash
# Check status
pm2 list
ps aux | grep nginx

# Restart proxy
pm2 restart moovie-proxy

# Restart nginx
sudo pkill nginx && sudo /usr/sbin/nginx

# View logs
pm2 logs moovie-proxy
sudo tail -f /var/log/nginx/proxy_access.log
```

That's it! 🎬
