# Frontend Integration Guide

## Quick Start: Integrate MovieAce VPS Backend

Your backend is fully operational at `http://161.118.191.46`. Here's how to integrate it with your Vue frontend.

---

## API Base URL

```javascript
const API_BASE = 'http://161.118.191.46:8080/vps-proxy';
```

---

## 1. Search Movies/TV Shows

### Endpoint
```
GET /vps-proxy/search?q={query}&type={movie|tv}
```

### Example
```javascript
async function searchMovies(query) {
  const response = await fetch(
    `${API_BASE}/search?q=${encodeURIComponent(query)}&type=movie`
  );
  const data = await response.json();
  return data.results;
}

// Usage
const results = await searchMovies('avatar');
console.log(results[0]);
// {
//   id: "8906247916759695608",
//   title: "Avatar",
//   year: 2009,
//   posterPath: "https://pbcdnw.aoneroom.com/image/...",
//   category: "movie",
//   rating: 7.9,
//   hasResource: true,
//   raw: {
//     detailPath: "avatar-WLDIi21IUBa",
//     subjectId: "8906247916759695608"
//   }
// }
```

### Parameters
- `q` (required): Search query
- `type` (optional): `movie` or `tv` (default: `movie`)

### Response Fields
- `id`: Unique identifier (same as subjectId)
- `title`: Movie/show title
- `year`: Release year
- `posterPath`: Poster image URL
- `backdropPath`: Backdrop image URL
- `category`: `movie` or `tv`
- `rating`: IMDb rating (0-10)
- `description`: Plot summary
- `genres`: Array of genre strings
- `hasResource`: Boolean - if streaming is available
- `raw.detailPath`: Required for stream resolution
- `raw.subjectId`: Required for stream resolution

---

## 2. Resolve Stream URLs

### Endpoint
```
GET /vps-proxy/resolve?subjectId={id}&detailPath={path}&type={movie|tv}&season={n}&episode={n}
```

### Example (Movie)
```javascript
async function getMovieStream(searchResult) {
  const { subjectId, detailPath } = searchResult.raw;
  
  const response = await fetch(
    `${API_BASE}/resolve?subjectId=${subjectId}&detailPath=${detailPath}&type=movie`
  );
  const data = await response.json();
  return data;
}

// Usage
const streamData = await getMovieStream(results[0]);
console.log(streamData);
// {
//   stream: {
//     id: "...",
//     quality: "1080p",
//     resolution: 1080,
//     format: "MP4",
//     codec: "h264",
//     size: 5184360316,
//     duration: 10689,
//     url: "http://161.118.191.46/proxy-media/https://..."
//   },
//   options: [...],  // All quality options
//   captions: [...], // All subtitle options
//   hasResource: true
// }
```

### Example (TV Show)
```javascript
async function getEpisodeStream(searchResult, season, episode) {
  const { subjectId, detailPath } = searchResult.raw;
  
  const response = await fetch(
    `${API_BASE}/resolve?subjectId=${subjectId}&detailPath=${detailPath}&type=tv&season=${season}&episode=${episode}`
  );
  const data = await response.json();
  return data;
}

// Usage
const streamData = await getEpisodeStream(results[0], 1, 1);
```

### Parameters
- `subjectId` (required): From search result's `raw.subjectId`
- `detailPath` (required): From search result's `raw.detailPath`
- `type` (optional): `movie` or `tv` (default: `movie`)
- `season` (optional): Season number for TV shows (default: 0)
- `episode` (optional): Episode number for TV shows (default: 0)

### Response Fields
- `stream`: Default/highest quality stream
  - `quality`: "1080p", "720p", "480p", "360p"
  - `resolution`: Numeric resolution (1080, 720, etc.)
  - `format`: Video format (usually "MP4")
  - `codec`: Video codec (usually "h264")
  - `size`: File size in bytes
  - `duration`: Duration in seconds
  - `url`: Proxied stream URL (ready to use)
- `options`: Array of all available quality options
- `captions`: Array of subtitle options
- `hasResource`: Boolean - if stream is available
- `freeStreamsRemaining`: Number of free streams left (if limited)
- `isLimited`: Boolean - if account has limits

---

## 3. Play Video

### Basic HTML5 Video Player
```html
<video id="player" controls width="100%">
  <source :src="streamData.stream.url" type="video/mp4">
  <track 
    v-for="caption in streamData.captions"
    :key="caption.languageCode"
    kind="subtitles"
    :src="caption.url"
    :srclang="caption.languageCode"
    :label="caption.language"
  >
</video>
```

### Vue Component Example
```vue
<template>
  <div class="video-player">
    <video 
      ref="videoPlayer"
      controls
      @loadedmetadata="onVideoLoaded"
      @error="onVideoError"
    >
      <source :src="currentStream.url" type="video/mp4">
      <track 
        v-for="caption in captions"
        :key="caption.languageCode"
        kind="subtitles"
        :src="caption.url"
        :srclang="caption.languageCode"
        :label="caption.language"
      >
    </video>
    
    <!-- Quality Selector -->
    <div class="quality-selector">
      <button 
        v-for="option in qualityOptions"
        :key="option.id"
        @click="changeQuality(option)"
        :class="{ active: option.id === currentStream.id }"
      >
        {{ option.quality }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      currentStream: null,
      qualityOptions: [],
      captions: [],
      currentTime: 0
    };
  },
  
  methods: {
    async loadMovie(searchResult) {
      const { subjectId, detailPath } = searchResult.raw;
      
      const response = await fetch(
        `http://161.118.191.46:8080/vps-proxy/resolve?subjectId=${subjectId}&detailPath=${detailPath}&type=movie`
      );
      const data = await response.json();
      
      this.currentStream = data.stream;
      this.qualityOptions = data.options;
      this.captions = data.captions;
    },
    
    changeQuality(option) {
      // Save current time
      this.currentTime = this.$refs.videoPlayer.currentTime;
      
      // Change source
      this.currentStream = option;
      
      // Wait for load and restore time
      this.$nextTick(() => {
        this.$refs.videoPlayer.load();
        this.$refs.videoPlayer.currentTime = this.currentTime;
        this.$refs.videoPlayer.play();
      });
    },
    
    onVideoLoaded() {
      console.log('Video loaded successfully');
    },
    
    onVideoError(e) {
      console.error('Video error:', e);
    }
  }
};
</script>
```

---

## 4. Complete Integration Example

```javascript
// movieService.js
const API_BASE = 'http://161.118.191.46:8080/vps-proxy';

export const movieService = {
  // Search movies
  async search(query, type = 'movie') {
    const response = await fetch(
      `${API_BASE}/search?q=${encodeURIComponent(query)}&type=${type}`
    );
    if (!response.ok) throw new Error('Search failed');
    return response.json();
  },
  
  // Get movie stream
  async getMovieStream(subjectId, detailPath) {
    const response = await fetch(
      `${API_BASE}/resolve?subjectId=${subjectId}&detailPath=${detailPath}&type=movie`
    );
    if (!response.ok) throw new Error('Stream resolution failed');
    return response.json();
  },
  
  // Get TV episode stream
  async getEpisodeStream(subjectId, detailPath, season, episode) {
    const response = await fetch(
      `${API_BASE}/resolve?subjectId=${subjectId}&detailPath=${detailPath}&type=tv&season=${season}&episode=${episode}`
    );
    if (!response.ok) throw new Error('Stream resolution failed');
    return response.json();
  }
};

// Usage in component
import { movieService } from './movieService';

export default {
  data() {
    return {
      searchResults: [],
      streamData: null,
      loading: false,
      error: null
    };
  },
  
  methods: {
    async searchMovies(query) {
      this.loading = true;
      this.error = null;
      
      try {
        const data = await movieService.search(query, 'movie');
        this.searchResults = data.results;
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },
    
    async playMovie(searchResult) {
      this.loading = true;
      this.error = null;
      
      try {
        const { subjectId, detailPath } = searchResult.raw;
        this.streamData = await movieService.getMovieStream(subjectId, detailPath);
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    }
  }
};
```

---

## 5. Advanced Features

### Quality Selector with File Size
```javascript
function formatFileSize(bytes) {
  const gb = bytes / 1024 / 1024 / 1024;
  return `${gb.toFixed(2)} GB`;
}

// Display quality options
streamData.options.forEach(option => {
  console.log(`${option.quality} - ${formatFileSize(option.size)}`);
});
// Output:
// 1080p - 4.83 GB
// 720p - 2.91 GB
// 480p - 0.62 GB
// 360p - 0.58 GB
```

### Duration Formatting
```javascript
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

console.log(formatDuration(streamData.stream.duration));
// Output: 2h 58m
```

### Subtitle Language Selector
```vue
<select v-model="selectedSubtitle" @change="changeSubtitle">
  <option value="">No Subtitles</option>
  <option 
    v-for="caption in captions"
    :key="caption.languageCode"
    :value="caption.url"
  >
    {{ caption.language }}
  </option>
</select>
```

### Error Handling
```javascript
async function loadStream(searchResult) {
  try {
    const { subjectId, detailPath } = searchResult.raw;
    
    const response = await fetch(
      `${API_BASE}/resolve?subjectId=${subjectId}&detailPath=${detailPath}&type=movie`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.hasResource) {
      throw new Error('No streaming sources available for this content');
    }
    
    return data;
    
  } catch (error) {
    console.error('Stream loading failed:', error);
    // Show user-friendly error message
    alert('Failed to load video. Please try another title.');
    return null;
  }
}
```

---

## 6. Performance Tips

### Cache Search Results
```javascript
const searchCache = new Map();

async function searchWithCache(query, type = 'movie') {
  const cacheKey = `${query}:${type}`;
  
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey);
  }
  
  const data = await movieService.search(query, type);
  searchCache.set(cacheKey, data);
  
  return data;
}
```

### Preload Next Episode
```javascript
async function preloadNextEpisode(subjectId, detailPath, season, episode) {
  const nextEpisode = episode + 1;
  
  // Preload in background
  movieService.getEpisodeStream(subjectId, detailPath, season, nextEpisode)
    .then(data => {
      console.log('Next episode preloaded');
      // Store in cache
    })
    .catch(err => {
      console.log('Next episode not available');
    });
}
```

---

## 7. Testing

### Test Search
```bash
curl "http://161.118.191.46:8080/vps-proxy/search?q=avatar&type=movie"
```

### Test Stream Resolution
```bash
curl "http://161.118.191.46:8080/vps-proxy/resolve?subjectId=8906247916759695608&detailPath=avatar-WLDIi21IUBa&type=movie"
```

### Test Video Playback
Open in browser:
```
http://161.118.191.46/proxy-media/https://bcdnxw.hakunaymatata.com/resource/...
```

---

## 8. Troubleshooting

### Video Won't Play
1. Check if `hasResource` is `true` in resolve response
2. Verify the stream URL is accessible
3. Check browser console for CORS errors
4. Try a different quality option

### Subtitles Not Loading
1. Verify caption URL is accessible
2. Check if subtitle format is WebVTT (should be handled automatically)
3. Ensure `<track>` element has correct attributes

### Slow Loading
1. Use lower quality option (480p or 360p)
2. Check VPS bandwidth usage
3. Verify Nginx is running: `systemctl status nginx`

---

## 9. API Response Examples

### Search Response
```json
{
  "results": [
    {
      "id": "8906247916759695608",
      "title": "Avatar",
      "year": 2009,
      "posterPath": "https://pbcdnw.aoneroom.com/image/2026/01/27/d0afc52be1b6f93d5c9a70f9105f3a37.jpg",
      "backdropPath": "https://pbcdnw.aoneroom.com/image/2026/01/27/d0afc52be1b6f93d5c9a70f9105f3a37.jpg",
      "category": "movie",
      "rating": 7.9,
      "description": "",
      "genres": ["Action", "Adventure", "Fantasy"],
      "hasResource": true,
      "raw": {
        "detailPath": "avatar-WLDIi21IUBa",
        "subjectId": "8906247916759695608"
      }
    }
  ],
  "total": 20,
  "page": 1,
  "hasMore": false
}
```

### Resolve Response
```json
{
  "stream": {
    "id": "1928694177462715880",
    "quality": "1080p",
    "resolution": 1080,
    "format": "MP4",
    "codec": "h264",
    "size": 5184360316,
    "duration": 10689,
    "url": "http://161.118.191.46/proxy-media/https://bcdnxw.hakunaymatata.com/resource/a26a05e0c4fc46d2a2489b5d2223723f.mp4?sign=b26561103e90175bde00c8c2e62532df&t=1779443098",
    "originalUrl": "https://bcdnxw.hakunaymatata.com/resource/a26a05e0c4fc46d2a2489b5d2223723f.mp4?sign=b26561103e90175bde00c8c2e62532df&t=1779443098"
  },
  "options": [
    {"quality": "1080p", "resolution": 1080, "size": 5184360316, ...},
    {"quality": "720p", "resolution": 720, "size": 3119803643, ...},
    {"quality": "480p", "resolution": 480, "size": 666976066, ...},
    {"quality": "360p", "resolution": 360, "size": 623914683, ...}
  ],
  "captions": [
    {
      "language": "English",
      "languageCode": "en",
      "url": "http://161.118.191.46/vps-proxy/subtitle?url=https%3A%2F%2Fcacdn.hakunaymatata.com%2Fsubtitle%2F..."
    }
  ],
  "hasResource": true,
  "freeStreamsRemaining": null,
  "isLimited": false
}
```

---

## Support

If you encounter issues:
1. Check VPS status: `ssh -i ~/key/ssh-key4.key opc@161.118.191.46 "pm2 status"`
2. View logs: `ssh -i ~/key/ssh-key4.key opc@161.118.191.46 "pm2 logs movieace-resolver"`
3. Test health: `curl http://161.118.191.46/health`

---

**Backend Status**: ✅ Fully Operational  
**API Base**: http://161.118.191.46:8080/vps-proxy  
**Documentation**: Complete and tested
