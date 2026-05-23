# Deployment Guide: Performance Optimizations

## 🚀 Quick Deployment Steps

### 1. **Test Locally First**

```bash
# Terminal 1: Start the Node.js proxy server
cd cinestream-api
node index.js

# Terminal 2: Start the frontend dev server
npm run dev
```

Open `http://localhost:5173` and test:
1. Navigate to any movie detail page
2. **Hover over the "Play" button** (check console for prefetch logs)
3. Click "Play" and observe load time
4. Check browser DevTools → Network tab for timing

### 2. **Deploy to Cloudflare Pages**

```bash
# Commit the changes
git add .
git commit -m "feat: implement performance optimizations (Priority 1, 3, 4)"
git push origin main
```

Cloudflare Pages will automatically:
- Build the frontend (`npm run build`)
- Deploy the Cloudflare Worker (`functions/api/cinestream.ts`)
- Make it live on your production domain

### 3. **Deploy Node.js Server to Oracle VPS (Optional)**

If you want to use the VPS as a fallback API:

```bash
# SSH into your VPS
ssh -i ~/.ssh/id_rsa opc@88.223.227.41

# Navigate to project directory
cd /path/to/movieace

# Pull latest changes
git pull origin main

# Install dependencies (if needed)
cd cinestream-api
npm install

# Stop existing Node process
pkill node

# Start the server in background
nohup node index.js > server.log 2>&1 &

# Verify it's running
curl http://localhost:3000/api/cinestream/resolve?type=movie&id=550
```

---

## 🧪 Testing the Optimizations

### Test 1: Prefetch Functionality
1. Open browser DevTools → Console
2. Navigate to a movie detail page
3. **Hover over the "Play" button** (don't click yet)
4. You should see:
   ```
   [TitleMasthead] Prefetching stream on hover
   [Prefetch] Starting prefetch for movie:12345:0:0
   [Prefetch] Successfully prefetched movie:12345:0:0 with X options
   ```
5. Now click "Play"
6. You should see:
   ```
   [StreamFrame] Using prefetched stream data
   [Prefetch] Cache hit for movie:12345:0:0
   ```
7. Video should start **instantly** (no loading spinner)

### Test 2: Progressive Loading
1. Open browser DevTools → Network tab
2. Navigate to a movie detail page
3. Click "Play" **without hovering first**
4. Watch the Network tab for the API call to `/api/cinestream`
5. You should see the response come back in **1-2 seconds** (instead of 3-5 seconds)
6. Check console for:
   ```
   [CineStream] Quick response with X options
   [CineStream] Background fetch completed with X Videasy servers
   ```

### Test 3: Race Condition (Fastest Responder)
1. Open browser DevTools → Network tab
2. Click "Play" on a movie
3. Check the timing of the `/api/cinestream` request
4. Response should be **under 2 seconds** (previously 3-5 seconds)
5. The response will contain streams from the **fastest providers** (Playsrc/Vidflix)

---

## 📊 Performance Metrics to Monitor

### Before Optimizations
- **Time to First Frame**: 4-7 seconds
- **API Response Time**: 3-5 seconds
- **User Experience**: Long loading spinner

### After Optimizations (Without Prefetch)
- **Time to First Frame**: 2-4 seconds
- **API Response Time**: 1-2 seconds
- **User Experience**: Shorter loading spinner

### After Optimizations (With Prefetch)
- **Time to First Frame**: 1-3 seconds
- **API Response Time**: 0 seconds (cached)
- **User Experience**: Nearly instant playback

---

## 🔍 Troubleshooting

### Issue: Prefetch not working
**Symptoms**: No prefetch logs in console when hovering over Play button

**Solution**:
1. Check that `usePrefetch.ts` is imported correctly in `TitleMasthead.vue`
2. Verify `handlePlayHover` is called on `@mouseenter` and `@focus` events
3. Check browser console for any errors

### Issue: Streams still loading slowly
**Symptoms**: Video takes 5+ seconds to start even with optimizations

**Possible Causes**:
1. **Slow CDN**: The actual video CDN (not our proxy) might be slow
2. **Network latency**: User's internet connection is slow
3. **Cloudflare cold start**: First request after inactivity has cold start penalty

**Solution**:
1. Test with different movies (different CDNs)
2. Check Cloudflare Analytics for worker execution time
3. Implement Priority 2 (Stream URL Caching) for repeat views

### Issue: "CineStream resolver is offline" error
**Symptoms**: Error message when trying to play video

**Possible Causes**:
1. Cloudflare Worker is not deployed
2. Node.js server is not running (local dev)
3. All scraper APIs are down

**Solution**:
1. Check Cloudflare Pages deployment status
2. Verify Node.js server is running: `curl http://localhost:3000/api/cinestream/resolve?type=movie&id=550`
3. Check scraper API status manually

---

## 🎯 Next Steps (Future Optimizations)

### Priority 2: Stream URL Caching
Implement Cloudflare KV caching to store resolved stream URLs for 30 minutes.

**Expected Improvement**: 2-3 seconds faster for repeat views

### Priority 5: Reduce Videasy Server Count
Analyze which Videasy servers are consistently fastest and remove slow ones.

**Expected Improvement**: 500ms-1s faster

### Priority 6: Service Worker Caching
Implement a service worker to cache M3U8 playlists and .ts chunks locally.

**Expected Improvement**: Instant playback for recently watched content

---

## 📝 Rollback Plan

If the optimizations cause issues, you can rollback:

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or reset to specific commit
git reset --hard <commit-hash>
git push origin main --force
```

---

## ✅ Deployment Checklist

- [ ] Test locally with `npm run dev` and `node cinestream-api/index.js`
- [ ] Verify prefetch works (hover over Play button)
- [ ] Verify progressive loading works (check console logs)
- [ ] Commit and push to GitHub
- [ ] Wait for Cloudflare Pages deployment to complete
- [ ] Test on production URL
- [ ] Monitor Cloudflare Analytics for errors
- [ ] Check user feedback for improved load times

---

**Deployment Date**: _____________________

**Deployed By**: _____________________

**Production URL**: _____________________

**Status**: ⬜ Pending | ⬜ Deployed | ⬜ Verified | ⬜ Rolled Back
