# MovieAce: Architectural Context & System Design

This document outlines the complete system architecture, proxy mechanisms, server infrastructure, and streaming logic for the **MovieAce** platform.

## 1. Project Overview
MovieAce is a modern, high-performance web application designed for streaming movies and TV shows. It aggregates content using third-party scrapers (like CineStream, Vidflix, Playsrc) and provides a premium viewing experience through a custom-configured web video player.

- **Frontend Framework**: Vue 3 (Composition API)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (with custom premium aesthetics)
- **Video Player**: Artplayer (with `hls.js` integration for M3U8 playback)
- **Deployment Platform**: Cloudflare Pages

## 2. The Streaming Challenge (CORS & Referer Blocks)
The core engineering challenge of MovieAce revolves around bypassing CDN security restrictions. 

Providers like **Videasy** (hosted on CDNs like `yoru.midwesteagle.com`) protect their media assets (`.m3u8` playlists and `.ts` video chunks) using strict HTTP `Referer` checks (e.g., `Referer: https://www.cineby.sc`). 

Because standard web browsers inherently **forbid** client-side JavaScript from modifying or spoofing the `Referer` header, native browser playback is impossible. The browser will always throw a `403 Forbidden` and `CORS (Cross-Origin Resource Sharing)` error when attempting to fetch these streams.

*(Note: Android applications like the CSX app bypass this natively because Android's ExoPlayer allows developers to spoof any header. Web browsers do not have this freedom).*

## 3. The Proxy Tunneling Engine
To solve the browser restriction, MovieAce employs a highly optimized, dual-layer proxy architecture. The proxy intercepts the requests, spoofs the required headers, and forwards the data back to the browser.

### A. Production: Cloudflare Edge Worker (`functions/api/cinestream.ts`)
In production, MovieAce utilizes **Cloudflare Pages Functions**. This is a serverless edge worker that executes directly on Cloudflare's global network.
- **Header Injection**: The worker attaches the required `User-Agent`, `Origin`, and `Referer` headers to authenticate with the external CDN.
- **M3U8 Playlist Rewriting**: When the worker fetches a Master Playlist (`.m3u8`), it parses the text and intercepts any internal variant playlists or chunk URLs. It rewrites these internal URLs using standard `new URL()` resolution, wrapping them so they point *back* to the Cloudflare proxy (`/api/cinestream?proxyUrl=...`).
- **Binary Streaming**: For heavy `.ts` video chunks, the worker streams the `ArrayBuffer` directly to the client without holding it in memory, ensuring ultra-low latency and bypassing 50MB execution limits.
- **Infinite Bandwidth**: Because this runs on Cloudflare, it safely handles gigabytes of video tunneling without utilizing a single byte of VPS bandwidth.

### B. Development & Fallback: Node.js Express Server (`cinestream-api/index.js`)
For local development and testing, a mirrored Node.js Express server runs on port `3000`.
- Utilizes `axios` configured with `responseType: 'arraybuffer'` to safely handle binary video chunks without corrupting the data.
- Emulates the exact same playlist rewriting and header spoofing logic as the Cloudflare worker.
- Can be deployed to the Oracle VPS (Port `80`) as a fallback API.

## 4. Oracle VPS Infrastructure & Constraints
The project utilizes an **Oracle Cloud Free Tier VPS** with the following specifications:
- **OS**: Oracle Linux
- **Resources**: 1GB RAM, 1 CPU Core (Micro instance)

### 🚨 Critical Constraint: Zero Video Tunneling
The Oracle VPS is strictly designated for **lightweight background tasks**, scraping, or API resolution. **It must NEVER be used to tunnel heavy video data (.ts chunks).**
- If the VPS were configured to proxy video streams, the 1GB RAM and 1 CPU would instantly bottleneck, and the server would crash with just 2-3 concurrent users.
- By offloading all proxying to the **Cloudflare Edge Worker** in production, the Oracle VPS is completely insulated from bandwidth exhaustion.

## 5. Player Integration (`StreamFrame.vue`)
The frontend integrates **Artplayer**, an HTML5 video player, heavily customized to support proxied HLS streams.
- **Forced Engine Detection**: Because proxied URLs (e.g., `/api/cinestream/proxy?url=...`) do not explicitly end in `.m3u8`, the player normally attempts to play them as native MP4s, resulting in a `NotSupportedError`.
- To fix this, `StreamFrame.vue` scans the encoded proxy URL. If it detects `m3u8` or `hls` anywhere in the string, it explicitly forces the player to initialize the `hls.js` engine (`type: 'm3u8'`).
- **Unified Subtitles**: Subtitle `.vtt` tracks are also routed through the same proxy tunnel to bypass identical CORS restrictions, ensuring text tracks render flawlessly without console errors.

## 6. Development Workflow
- **Frontend Start**: `npm run dev`
- **Frontend Build**: `npm run build`
- **Start Local Proxy**: `cd cinestream-api && node index.js`
- **VPS Deployment**: Code is transferred via SSH/SCP. The Node process is managed using `pkill node` and `nohup node index.js &`.
- **Production Deployment**: Pushing to GitHub automatically triggers the Cloudflare Pages CI/CD pipeline.

---
*Documented by: Senior Engineering AI (Antigravity)*
