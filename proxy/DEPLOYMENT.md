# Proxy Deployment - COMPLETED ✓

## Server Details
- **IP**: 161.118.191.46
- **OS**: Oracle Linux Server 9.7
- **Proxy**: Node.js (port 8080) + Nginx (port 80, for future use)
- **Status**: ✅ Running

## What Was Done

### 1. Started Node.js Proxy
- Using existing `/home/opc/moovie-proxy/server.js`
- Running on port 8080 via PM2 process manager
- Handles the `/https://target-url` proxy pattern
- Auto-restarts on crashes, survives server reboots

### 2. Installed Nginx (for future optimization)
- Nginx 1.24.0 installed and configured
- Running on port 80
- Ready to use when we implement proper URL routing
- Currently Node.js proxy is handling all traffic

### 3. Updated Movieace Code
- Changed proxy URL in `netlify/functions/moovie.mjs` to `http://161.118.191.46:8080/`
- Deployed to Netlify
- All Moovie streams now go through the Node.js proxy

## How to Manage

### Check if proxy is running
```bash
ssh -i ~/key/ssh-key4.key opc@161.118.191.46 "pm2 list"
```

### Start proxy (after server restart)
```bash
ssh -i ~/key/ssh-key4.key opc@161.118.191.46 "pm2 resurrect"
```

### Stop proxy
```bash
ssh -i ~/key/ssh-key4.key opc@161.118.191.46 "pm2 stop moovie-proxy"
```

### Restart proxy
```bash
ssh -i ~/key/ssh-key4.key opc@161.118.191.46 "pm2 restart moovie-proxy"
```

### View logs
```bash
ssh -i ~/key/ssh-key4.key opc@161.118.191.46 "pm2 logs moovie-proxy"
```

### View real-time stats
```bash
ssh -i ~/key/ssh-key4.key opc@161.118.191.46 "pm2 monit"
```

## Testing

Test the proxy is working:
```bash
# Should return CORS headers and proxy the request
curl -I "http://161.118.191.46:8080/https://h5.aoneroom.com/"
```

## Why Node.js Instead of Nginx?

The moovie bff resolver uses a pattern like `PROXY + originalUrl` which creates URLs like:
```
http://161.118.191.46:8080/https://h5.aoneroom.com/api/search
```

Nginx can't easily handle this pattern because:
1. `proxy_pass` with variables requires no scheme in the URL
2. The URL has `https://` embedded in the path
3. Would need Lua or complex rewrites

The Node.js proxy already handles this perfectly:
```javascript
let rawTarget = req.url.slice(1); // strip leading /
// rawTarget is now: https://h5.aoneroom.com/api/search
```

## Future Optimization

Once we migrate to a cleaner URL pattern (like `/api/proxy?url=...`), we can switch to Nginx for better performance. For now, Node.js works fine and handles the traffic.

## Files Modified

- `netlify/functions/moovie.mjs` - Changed PROXY to port 8080
- Server: PM2 managing `/home/opc/moovie-proxy/server.js`

## Status: ✅ COMPLETE

Node.js proxy is running on port 8080 and handling all Moovie streams. The app should now work correctly!
