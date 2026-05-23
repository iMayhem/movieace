# 🚀 Local Development Setup

## Problem
When running `npm run dev` locally, movies don't play because the **local proxy server is not running**.

---

## Solution: Start Both Servers

You need to run **TWO servers** simultaneously:

### **Terminal 1: Frontend Dev Server**
```bash
npm run dev
```
This runs on `http://localhost:5173`

### **Terminal 2: Local Proxy Server**
```bash
cd cinestream-api
node index.js
```
This runs on `http://localhost:3000`

---

## Quick Start Commands

### Option 1: Two Separate Terminals

**Terminal 1:**
```bash
npm run dev
```

**Terminal 2:**
```bash
cd cinestream-api && node index.js
```

### Option 2: Single Command (Background)
```bash
# Start proxy in background
cd cinestream-api && node index.js &

# Start frontend
cd .. && npm run dev
```

### Option 3: Using tmux/screen
```bash
# Start proxy in tmux
tmux new -d -s proxy 'cd cinestream-api && node index.js'

# Start frontend
npm run dev

# To stop proxy later:
tmux kill-session -t proxy
```

---

## How to Verify It's Working

### 1. Check Proxy Server is Running
```bash
curl http://localhost:3000/api/cinestream/resolve?type=movie&id=550
```

**Expected:** JSON response with stream options

### 2. Check Frontend is Running
Open browser: `http://localhost:5173`

### 3. Test Movie Playback
1. Navigate to any movie
2. Click "Play"
3. **Expected:** Video loads within 2-3 seconds

---

## Troubleshooting

### Issue: "CineStream resolver is offline"
**Cause:** Local proxy server (port 3000) is not running

**Solution:**
```bash
cd cinestream-api
node index.js
```

### Issue: Port 3000 already in use
**Solution:**
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 node index.js
```

### Issue: "Cannot find module"
**Solution:**
```bash
cd cinestream-api
npm install
node index.js
```

---

## Production vs Development

| Environment | Proxy Server | How It Works |
|-------------|--------------|--------------|
| **Production** | Cloudflare Worker | Automatic (no setup needed) |
| **Development** | Local Node.js | Manual (must start `node index.js`) |

---

## Why Two Servers?

1. **Frontend (Vite)** - Serves the Vue.js app
2. **Proxy (Node.js)** - Handles video stream scraping and CORS bypass

The frontend makes requests to `http://localhost:3000/api/cinestream/resolve` which the proxy server handles.

---

## Quick Reference

```bash
# Start everything
cd cinestream-api && node index.js &
npm run dev

# Stop everything
pkill node
# (or Ctrl+C in both terminals)

# Check if proxy is running
curl http://localhost:3000/api/cinestream/resolve?type=movie&id=550

# Check logs
# Proxy logs appear in Terminal 2
# Frontend logs appear in Terminal 1
```

---

## Summary

✅ **Always run BOTH servers** when developing locally  
✅ Proxy server on port 3000  
✅ Frontend server on port 5173  
✅ In production, Cloudflare Worker handles the proxy automatically  

---

*Last Updated: 2026-05-23*
