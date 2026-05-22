# MovieAce VPS Resolver — High-Performance Streaming Backend

This is the production-grade Node.js + Nginx backend that powers MovieAce's direct streaming architecture.

## Architecture Overview

```
┌─────────────┐
│   Browser   │
│  (Vue App)  │
└──────┬──────┘
       │
       │ 1. Search/Resolve API calls
       ↓
┌─────────────────────────────────────────┐
│         Nginx Reverse Proxy             │
│         (Port 80/443)                   │
│                                         │
│  ┌─────────────────┐  ┌──────────────┐ │
│  │  /vps-proxy/*   │  │ /proxy-media │ │
│  │  (API Routes)   │  │ (Video CDN)  │ │
│  └────────┬────────┘  └──────┬───────┘ │
└───────────┼───────────────────┼─────────┘
            │                   │
            │ 2. Proxy to       │ 4. Stream video
            │    Node.js        │    with header
            ↓                   │    rewriting
   ┌────────────────┐          │
   │   Node.js API  │          │
   │   (Port 8080)  │          │
   │                │          │
   │ • Guest Auth   │          │
   │ • Search       │          │
   │ • Resolve      │          │
   │ • Subtitles    │          │
   └────────┬───────┘          │
            │                   │
            │ 3. Query          │ 5. Direct CDN
            │    Moviebox API   │    streaming
            ↓                   ↓
   ┌─────────────────────────────────┐
   │   Moviebox H5 API & CDN         │
   │   h5.aoneroom.com               │
   │   hakunaymatata.com, etc.       │
   └─────────────────────────────────┘
```

## Why This Architecture?

### The Problem with Node.js-Only Proxying
Previously, all video bytes were piped through Node.js:
- **High CPU usage**: 80-100% on large files
- **Memory bloat**: 200MB-1GB per stream
- **Slow seeking**: 5-12 second lag on skip forward/backward
- **Event loop blocking**: Single-threaded bottleneck

### The Solution: Nginx + Node.js Dual-Service
- **Nginx handles video**: C-level performance, `sendfile()`, zero-copy streaming
- **Node.js handles metadata**: Fast API calls, cookie management, caching
- **Result**: <200ms seek latency, <2% CPU, <15MB memory per stream

## Quick Start

### Prerequisites
- Ubuntu/Debian VPS (Oracle Cloud, DigitalOcean, etc.)
- Root access
- Public IP address

### One-Command Deployment

```bash
# 1. SSH into your VPS
ssh -i your-key.pem user@your-vps-ip

# 2. Clone or upload this directory
cd /tmp
# (upload vps-server folder here)

# 3. Run deployment script
cd vps-server
chmod +x deploy.sh
sudo ./deploy.sh
```

The script will:
1. Install Nginx with optimized configuration
2. Install Node.js v18+
3. Install PM2 process manager
4. Deploy the resolver API
5. Configure firewall rules
6. Start all services

### Verify Installation

```bash
# Check health
curl http://YOUR_VPS_IP/health

# Test search
curl "http://YOUR_VPS_IP/vps-proxy/search?q=avatar&type=movie"

# Check service status
pm2 status
systemctl status nginx
```

## Manual Installation

If you prefer step-by-step control:

### 1. Install Dependencies

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Nginx
sudo apt-get install -y nginx

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2
```

### 2. Configure Nginx

```bash
# Backup existing config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Install new config
sudo cp nginx.conf /etc/nginx/nginx.conf

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 3. Deploy Node.js API

```bash
# Create application directory
sudo mkdir -p /opt/movieace-resolver
sudo chown $USER:$USER /opt/movieace-resolver

# Copy files
cp package.json server.js ecosystem.config.cjs /opt/movieace-resolver/
cp .env.example /opt/movieace-resolver/.env

# Install dependencies
cd /opt/movieace-resolver
npm install --production

# Start with PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

### 4. Configure Firewall

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

## API Endpoints

### Health Check
```bash
GET /health
```

Returns server status and cache statistics.

### Search Movies/TV Shows
```bash
GET /vps-proxy/search?q={query}&type={movie|tv}
```

**Parameters:**
- `q` (required): Search query
- `type` (optional): `movie` or `tv` (default: `movie`)

**Response:**
```json
{
  "results": [
    {
      "id": "123456",
      "title": "Avatar",
      "year": 2009,
      "posterPath": "https://...",
      "backdropPath": "https://...",
      "category": "movie",
      "rating": 7.8,
      "raw": {
        "detailPath": "/subject/detail/...",
        "boxType": 1
      }
    }
  ],
  "total": 1
}
```

### Resolve Stream URLs
```bash
GET /vps-proxy/resolve?detailPath={path}&id={id}&type={movie|tv}&season={n}&episode={n}
```

**Parameters:**
- `detailPath` (required): From search results `raw.detailPath`
- `id` (required): Subject ID from search results
- `type` (optional): `movie` or `tv`
- `season` (optional): Season number for TV shows
- `episode` (optional): Episode number for TV shows

**Response:**
```json
{
  "title": "Avatar",
  "stream": {
    "quality": "1080P",
    "format": "MP4",
    "url": "http://161.118.191.46/proxy-media/https/cdn.../video.mp4"
  },
  "options": [
    {
      "quality": "1080P",
      "format": "MP4",
      "url": "http://..."
    },
    {
      "quality": "720P",
      "format": "MP4",
      "url": "http://..."
    }
  ],
  "captions": [
    {
      "language": "English",
      "languageCode": "en",
      "url": "http://161.118.191.46/vps-proxy/subtitle?url=..."
    }
  ],
  "metadata": {
    "duration": 162,
    "year": 2009,
    "rating": 7.8
  }
}
```

### Fetch Subtitle
```bash
GET /vps-proxy/subtitle?url={subtitle_url}
```

Fetches and converts SRT subtitles to WebVTT format.

## Management Commands

### PM2 (Node.js API)

```bash
# View status
pm2 status

# View logs
pm2 logs movieace-resolver

# Restart
pm2 restart movieace-resolver

# Stop
pm2 stop movieace-resolver

# Monitor
pm2 monit
```

### Nginx

```bash
# Test configuration
sudo nginx -t

# Restart
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Check status
sudo systemctl status nginx
```

## Performance Tuning

### For High Traffic

Edit `nginx.conf`:
```nginx
worker_processes auto;  # Use all CPU cores
worker_connections 8192;  # Increase from 4096
```

Edit `ecosystem.config.cjs`:
```javascript
instances: 4,  // Increase from 2
max_memory_restart: '1G',  // Increase from 500M
```

### For Low-Memory VPS

Edit `ecosystem.config.cjs`:
```javascript
instances: 1,  // Reduce to single instance
max_memory_restart: '256M',
```

## Troubleshooting

### API Not Responding

```bash
# Check if Node.js is running
pm2 status

# Check logs for errors
pm2 logs movieace-resolver --lines 100

# Restart API
pm2 restart movieace-resolver
```

### Nginx Errors

```bash
# Check configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Video Playback Issues

1. **403 Forbidden**: CDN blocking - check Nginx header rewriting
2. **Slow buffering**: Check VPS bandwidth and CPU usage
3. **Seeking lag**: Ensure `proxy_buffering off` in Nginx config

### Port Already in Use

```bash
# Check what's using port 8080
sudo lsof -i :8080

# Kill the process
sudo kill -9 <PID>

# Or change port in .env and ecosystem.config.cjs
```

## Security Considerations

### Rate Limiting
The Nginx configuration includes rate limiting:
- API endpoints: 30 requests/minute per IP
- Stream endpoints: 120 requests/minute per IP

Adjust in `nginx.conf`:
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=stream:10m rate=120r/m;
```

### HTTPS/SSL Setup

For production, add SSL:

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Firewall

```bash
# Enable UFW
sudo ufw enable

# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Check status
sudo ufw status
```

## Monitoring

### System Resources

```bash
# CPU and memory
htop

# Disk usage
df -h

# Network usage
iftop
```

### Application Metrics

```bash
# PM2 monitoring
pm2 monit

# Nginx status
curl http://localhost/health
```

## Updating

### Update Node.js API

```bash
cd /opt/movieace-resolver

# Pull latest code
# (upload new server.js)

# Restart
pm2 restart movieace-resolver
```

### Update Nginx Config

```bash
# Backup current config
sudo cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup

# Install new config
sudo cp nginx.conf /etc/nginx/nginx.conf

# Test
sudo nginx -t

# Reload (zero downtime)
sudo systemctl reload nginx
```

## Uninstall

```bash
# Stop services
pm2 stop movieace-resolver
pm2 delete movieace-resolver
sudo systemctl stop nginx

# Remove files
sudo rm -rf /opt/movieace-resolver
sudo apt-get remove --purge nginx

# Remove PM2
npm uninstall -g pm2
```

## Support

For issues or questions:
1. Check logs: `pm2 logs movieace-resolver`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify health: `curl http://YOUR_IP/health`

## License

MIT
