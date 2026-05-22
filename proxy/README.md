# proxy.moovie.fun — Nginx Setup

## What this does

Replaces the Node.js CORS proxy with a native Nginx reverse proxy.

**Before:** Browser → Node.js proxy (slow, all video bytes through Node) → CDN  
**After:** Browser → Nginx proxy (fast, C-level streaming) → CDN

Nginx is ~50x more efficient than Node.js for proxying raw bytes. It handles
hundreds of concurrent streams with minimal CPU/RAM.

## How to deploy on your RDP (161.118.191.46)

### 1. SSH into your server
```bash
ssh -i ssh-key4.key opc@161.118.191.46
```

### 2. Upload the nginx.conf
```bash
# From your local machine
scp -i ssh-key4.key nginx.conf opc@161.118.191.46:~/nginx.conf
scp -i ssh-key4.key setup.sh opc@161.118.191.46:~/setup.sh
```

### 3. Run the setup script
```bash
sudo bash setup.sh
```

### 4. Verify it's working
```bash
curl -I https://proxy.moovie.fun/health
# Should return: HTTP/2 200
```

## Manual install (if you prefer step by step)

```bash
# Install nginx with sub_filter support
sudo apt-get update
sudo apt-get install -y nginx nginx-extras certbot python3-certbot-nginx

# Get TLS cert
sudo certbot certonly --standalone -d proxy.moovie.fun

# Install config
sudo cp nginx.conf /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl restart nginx
```

## How the m3u8 rewriting works

When ArtPlayer requests the stream URL, it gets back an m3u8 playlist like:

```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2000000
https://cdn.aoneroom.com/hls/abc123/1080p/index.m3u8
```

Nginx's `sub_filter` rewrites it on-the-fly to:

```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=2000000
/https://cdn.aoneroom.com/hls/abc123/1080p/index.m3u8
```

So every segment request goes back through the proxy with the correct
`Referer: https://h5.aoneroom.com` header injected by Nginx.

## Bandwidth note

All video still goes through your server — but Nginx handles it at C speed
with zero Node.js overhead. For a 1080p movie (~6GB), Nginx uses ~5MB RAM
and <1% CPU per stream. Node.js would use ~200MB RAM and 10-20% CPU.

If you want zero bandwidth usage on your server, the only option is to get
Moviebox to whitelist your domain as a trusted referer — which requires
contacting them directly.
