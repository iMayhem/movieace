# MovieAce VPS Server — Documentation Index

Welcome to the MovieAce high-performance streaming backend documentation.

## 📚 Documentation Structure

### Getting Started
1. **[QUICK-START.md](QUICK-START.md)** ⭐ START HERE
   - 5-minute deployment guide
   - Essential commands
   - Quick troubleshooting

2. **[DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md)**
   - Step-by-step deployment checklist
   - Verification procedures
   - Success criteria

### Technical Documentation
3. **[README.md](README.md)**
   - Complete feature overview
   - API endpoint documentation
   - Management commands
   - Troubleshooting guide

4. **[ARCHITECTURE.md](ARCHITECTURE.md)**
   - Deep technical dive
   - Performance analysis
   - Scalability considerations
   - Monitoring strategies

### Configuration Files
5. **server.js** - Node.js API server
6. **nginx.conf** - Nginx reverse proxy configuration
7. **ecosystem.config.cjs** - PM2 process manager configuration
8. **package.json** - Node.js dependencies

### Scripts
9. **deploy.sh** - Automated deployment script
10. **update.sh** - Zero-downtime update script
11. **test.sh** - Comprehensive test suite

## 🚀 Quick Navigation

### I want to...

**Deploy for the first time**
→ Read [QUICK-START.md](QUICK-START.md)
→ Follow [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md)

**Understand the architecture**
→ Read [ARCHITECTURE.md](ARCHITECTURE.md)

**Manage the server**
→ See "Management Commands" in [README.md](README.md)

**Troubleshoot issues**
→ See "Troubleshooting" in [README.md](README.md)
→ Run `./test.sh` to diagnose

**Update the server**
→ Run `./update.sh`

**Monitor performance**
→ Run `pm2 monit`
→ Check logs: `pm2 logs movieace-resolver`

## 📋 File Overview

```
vps-server/
├── Documentation
│   ├── INDEX.md                    ← You are here
│   ├── QUICK-START.md              ← Start here for deployment
│   ├── DEPLOYMENT-CHECKLIST.md     ← Step-by-step checklist
│   ├── README.md                   ← Complete reference
│   └── ARCHITECTURE.md             ← Technical deep dive
│
├── Application Code
│   ├── server.js                   ← Node.js API server
│   ├── package.json                ← Dependencies
│   └── ecosystem.config.cjs        ← PM2 configuration
│
├── Configuration
│   ├── nginx.conf                  ← Nginx configuration
│   ├── .env.example                ← Environment template
│   └── .gitignore                  ← Git ignore rules
│
└── Scripts
    ├── deploy.sh                   ← Automated deployment
    ├── update.sh                   ← Update script
    └── test.sh                     ← Test suite
```

## 🎯 Common Tasks

### Deploy to VPS
```bash
# 1. Upload files
scp -i ssh-key.pem vps-server.tar.gz user@vps-ip:~/

# 2. SSH and extract
ssh -i ssh-key.pem user@vps-ip
tar -xzf vps-server.tar.gz && cd vps-server

# 3. Deploy
sudo ./deploy.sh

# 4. Test
./test.sh
```

### Check Status
```bash
pm2 status                    # PM2 processes
systemctl status nginx        # Nginx service
curl http://localhost/health  # Health check
```

### View Logs
```bash
pm2 logs movieace-resolver    # Application logs
sudo tail -f /var/log/nginx/access.log  # Nginx access
sudo tail -f /var/log/nginx/error.log   # Nginx errors
```

### Restart Services
```bash
pm2 restart movieace-resolver  # Restart API
sudo systemctl restart nginx   # Restart Nginx
```

### Update Application
```bash
cd vps-server
./update.sh
```

## 🔧 System Requirements

### Minimum (Development)
- 1GB RAM
- 1 CPU core
- 10GB disk
- Ubuntu 20.04+

### Recommended (Production)
- 2GB RAM
- 2 CPU cores
- 20GB disk
- Ubuntu 22.04 LTS

### Optimal (High Traffic)
- 4GB RAM
- 4 CPU cores
- 50GB disk
- Ubuntu 22.04 LTS

## 📊 Performance Expectations

### 1GB RAM VPS
- 100+ concurrent streams
- 1,000 API requests/minute
- <200ms seek latency
- <2% CPU per stream

### 2GB RAM VPS
- 200+ concurrent streams
- 2,000 API requests/minute
- <200ms seek latency
- <2% CPU per stream

## 🔐 Security Features

- ✅ Rate limiting (API: 30 req/min, Stream: 120 req/min)
- ✅ CORS headers configured
- ✅ Header sanitization
- ✅ Firewall rules (UFW)
- ✅ Process isolation (PM2)
- ⚠️ SSL/HTTPS (optional, requires domain)

## 🎬 Architecture Overview

```
Browser (Vue App)
    ↓
Nginx (Port 80/443)
    ├─→ /vps-proxy/* → Node.js API (Port 8080)
    │                      ↓
    │                  Moviebox H5 API
    │
    └─→ /proxy-media/* → CDN (with header injection)
```

**Key Benefits:**
- Nginx handles video streaming (C-level performance)
- Node.js handles API calls (fast JSON processing)
- Zero-buffer streaming (<200ms seek latency)
- Minimal resource usage (<2% CPU, <5MB RAM per stream)

## 📈 Monitoring

### Built-in Tools
```bash
pm2 monit              # Real-time monitoring
pm2 logs               # Application logs
htop                   # System resources
iftop                  # Network traffic
```

### Key Metrics
- Response time: <100ms (health), <300ms (API)
- CPU usage: <5% idle, <20% under load
- Memory: ~50MB (Node.js), ~20MB (Nginx)
- Cache hit rate: >60% (search), >40% (streams)

## 🆘 Troubleshooting

### Quick Diagnostics
```bash
# Run test suite
./test.sh

# Check logs
pm2 logs movieace-resolver --lines 50
sudo tail -f /var/log/nginx/error.log

# Verify services
pm2 status
systemctl status nginx

# Test endpoints
curl http://localhost/health
curl "http://localhost/vps-proxy/search?q=test&type=movie"
```

### Common Issues

**Services not running**
```bash
pm2 restart movieace-resolver
sudo systemctl restart nginx
```

**High CPU/Memory**
```bash
pm2 monit  # Check resource usage
htop       # System overview
```

**API errors**
```bash
pm2 logs movieace-resolver --lines 100
```

**Video playback issues**
```bash
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Update Workflow

1. **Backup current version**
   ```bash
   ./update.sh  # Handles backup automatically
   ```

2. **Test after update**
   ```bash
   ./test.sh
   ```

3. **Rollback if needed**
   ```bash
   sudo rm -rf /opt/movieace-resolver
   sudo mv /opt/movieace-resolver.backup.* /opt/movieace-resolver
   pm2 restart movieace-resolver
   ```

## 📞 Support Resources

### Documentation
- [QUICK-START.md](QUICK-START.md) - Fast deployment
- [README.md](README.md) - Complete reference
- [ARCHITECTURE.md](ARCHITECTURE.md) - Technical details
- [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md) - Deployment guide

### Logs
- Application: `pm2 logs movieace-resolver`
- Nginx Access: `/var/log/nginx/access.log`
- Nginx Error: `/var/log/nginx/error.log`
- System: `journalctl -u nginx`

### Diagnostics
- Test suite: `./test.sh`
- Health check: `curl http://localhost/health`
- PM2 status: `pm2 status`
- System resources: `htop`

## 🎓 Learning Path

### Beginner
1. Read [QUICK-START.md](QUICK-START.md)
2. Deploy using [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md)
3. Learn basic commands from [README.md](README.md)

### Intermediate
1. Understand architecture from [ARCHITECTURE.md](ARCHITECTURE.md)
2. Customize configuration files
3. Set up monitoring and alerts

### Advanced
1. Optimize for high traffic
2. Implement horizontal scaling
3. Add Redis caching layer
4. Set up CI/CD pipeline

## 📝 Version History

- **v1.0.0** (Current)
  - Initial release
  - Nginx + Node.js dual-service architecture
  - Guest cookie management
  - Search, resolve, subtitle APIs
  - In-memory caching
  - PM2 process management
  - Automated deployment scripts

## 🚧 Roadmap

- [ ] Redis cache layer
- [ ] HLS/DASH transcoding
- [ ] CDN caching
- [ ] Analytics dashboard
- [ ] Automatic failover
- [ ] Docker containerization
- [ ] Kubernetes deployment

## 📄 License

MIT License - See [LICENSE](../LICENSE) file

---

**Need help?** Start with [QUICK-START.md](QUICK-START.md) or run `./test.sh` to diagnose issues.
