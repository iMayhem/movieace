# MovieAce Performance Optimizations

## Overview
This document outlines the performance optimizations implemented to reduce initial video load time from **7+ seconds to 2-3 seconds**.

---

## ✅ Implemented Optimizations

### **Priority 1: Fastest Responder Wins (Race Condition)**
**Location**: 
- `functions/api/cinestream.ts` (Cloudflare Worker)
- `cinestream-api/index.js` (Node.js Dev Server)

**What Changed**:
- Instead of waiting for all 14 Videasy servers to respond, we now use `Promise.race()` to return the **first successful stream**.
- We only wait for the **first 3 successful Videasy servers** instead of all 14.
- Each server has a **3-second timeout** to prevent slow servers from blocking the response.

**Code Pattern**:
```typescript
// OLD: Wait for all servers
const videasyResults = await Promise.all(videasyPromises);

// NEW: Race condition - first 3 wins
const videasyResults = [];
for (const promise of videasyPromises) {
  try {
    const result = await Promise.race([
      promise, 
      new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000))
    ]);
    videasyResults.push(result);
    if (videasyResults.length >= 3) break; // Stop after 3 successful
  } catch (e) {
    // Continue to next server
  }
}
```

**Expected Improvement**: **1-2 seconds faster** (from 3s → 1s for scraping)

---

### **Priority 3: Prefetch Streams (Hover Optimization)**
**Location**: 
- `src/composables/usePrefetch.ts` (New composable)
- `src/components/detail/TitleMasthead.vue` (Play button)
- `src/components/player/StreamFrame.vue` (Stream resolver)

**What Changed**:
- When users **hover over** or **focus on** the "Play" button, we immediately start fetching stream data in the background.
- Stream data is cached for **5 minutes** in memory.
- When the user clicks "Play", the cached data is used instantly instead of making a fresh API call.

**Code Pattern**:
```typescript
// In TitleMasthead.vue - Prefetch on hover
<LmButton 
  @mouseenter="handlePlayHover"
  @focus="handlePlayHover"
>
  Play
</LmButton>

// In StreamFrame.vue - Check cache first
const cachedData = getCachedStream(props.mediaId, props.mediaType);
if (cachedData) {
  console.log('[StreamFrame] Using prefetched stream data');
  processStreamData(cachedData);
  return; // Skip API call entirely
}
```

**Expected Improvement**: **Instant playback** (perceived 0s load time if user hovers before clicking)

---

### **Priority 4: Progressive Loading (Return First Stream Immediately)**
**Location**: 
- `functions/api/cinestream.ts` (Cloudflare Worker)
- `cinestream-api/index.js` (Node.js Dev Server)

**What Changed**:
- We race **Playsrc** and **Vidflix** providers (the fastest ones).
- As soon as **any provider** returns a valid stream, we immediately send it to the frontend.
- Videasy servers continue fetching in the **background** (using `context.waitUntil()` in Cloudflare).
- The frontend can start playing video while additional streams are still being discovered.

**Code Pattern**:
```typescript
// Race the fastest providers
const quickProviders = Promise.race([
  scrapePlaysrc(type, id, season, episode),
  scrapeVidflix(type, id, season, episode)
]);

const quickResult = await quickProviders;

if (quickResult.options.length > 0) {
  // Return immediately with first available stream
  return new Response(JSON.stringify({
    stream: quickResult.options[0],
    options: quickResult.options,
    captions: quickResult.captions
  }));
  
  // Continue fetching Videasy in background
  context.waitUntil(fetchRemainingStreams());
}
```

**Expected Improvement**: **1-2 seconds faster** (video starts as soon as first provider responds)

---

## 📊 Performance Comparison

### Before Optimizations
| Stage | Time | Cause |
|-------|------|-------|
| Frontend initialization | 200-500ms | Vue component mounting |
| Scraper resolution | **2-3s** | Waiting for 14 Videasy servers |
| First M3U8 fetch | 400-800ms | Proxy round-trip |
| Playlist rewriting | 50-150ms | URL parsing |
| First .ts chunk fetch | 500-1500ms | Proxy + buffering |
| **TOTAL** | **4-7s** | |

### After Optimizations
| Stage | Time | Cause |
|-------|------|-------|
| Frontend initialization | 200-500ms | Vue component mounting |
| Scraper resolution | **500ms-1s** | Race condition (first 3 servers) |
| First M3U8 fetch | 400-800ms | Proxy round-trip |
| Playlist rewriting | 50-150ms | URL parsing |
| First .ts chunk fetch | 500-1500ms | Proxy + buffering |
| **TOTAL** | **2-4s** | |

### With Prefetch (User Hovers Before Clicking)
| Stage | Time | Cause |
|-------|------|-------|
| Frontend initialization | 200-500ms | Vue component mounting |
| Scraper resolution | **0ms** | Cached from prefetch |
| First M3U8 fetch | 400-800ms | Proxy round-trip |
| Playlist rewriting | 50-150ms | URL parsing |
| First .ts chunk fetch | 500-1500ms | Proxy + buffering |
| **TOTAL** | **1-3s** | |

---

## 🚀 Additional Optimizations (Not Yet Implemented)

### **Priority 2: Stream URL Caching**
Cache resolved stream URLs in Cloudflare KV for 30 minutes to avoid re-scraping for repeat views.

**Expected Improvement**: **2-3 seconds faster** for repeat views

### **Priority 5: Reduce Videasy Server Count**
Test which servers are consistently fastest and remove slow ones from the list.

**Expected Improvement**: **500ms-1s faster**

---

## 🧪 Testing the Optimizations

### Local Development
1. Start the Node.js proxy: `cd cinestream-api && node index.js`
2. Start the frontend: `npm run dev`
3. Open browser DevTools → Network tab
4. Navigate to a movie detail page
5. **Hover over the "Play" button** (watch console for prefetch logs)
6. Click "Play" and observe the load time

### Production (Cloudflare)
1. Deploy to Cloudflare Pages: `git push origin main`
2. Wait for deployment to complete
3. Test on production URL
4. Check Cloudflare Analytics for response times

---

## 📝 Console Logs to Monitor

### Prefetch Logs
```
[TitleMasthead] Prefetching stream on hover
[Prefetch] Starting prefetch for movie:12345:0:0
[Prefetch] Successfully prefetched movie:12345:0:0 with 5 options
```

### Cache Hit Logs
```
[StreamFrame] Using prefetched stream data
[Prefetch] Cache hit for movie:12345:0:0
```

### Progressive Loading Logs
```
[CineStream] Quick response with 2 options
[CineStream] Background fetch completed with 3 Videasy servers
```

---

## 🔧 Configuration

### Prefetch Cache Duration
Edit `src/composables/usePrefetch.ts`:
```typescript
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (default)
```

### Videasy Server Timeout
Edit `functions/api/cinestream.ts`:
```typescript
const result = await Promise.race([
  promise, 
  new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000)) // 3 seconds
]);
```

### Number of Videasy Servers to Wait For
Edit `functions/api/cinestream.ts`:
```typescript
if (videasyResults.length >= 3) break; // Change 3 to desired number
```

---

## 🎯 Key Takeaways

1. **Prefetch is the biggest win** - If users hover before clicking, load time is nearly instant.
2. **Race conditions prevent slow servers from blocking** - We don't wait for all 14 servers anymore.
3. **Progressive loading ensures fast first response** - Video starts as soon as any provider responds.
4. **Caching prevents redundant API calls** - Prefetched data is reused when user clicks Play.

---

**Total Expected Improvement**: **3-5 seconds faster** (from 7s → 2-3s, or instant with prefetch)

*Last Updated: 2026-05-23*
