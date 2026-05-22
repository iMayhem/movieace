export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 1. Health check
    if (url.pathname === '/health') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'text/plain'
        }
      });
    }

    // 2. Extract target URL from path: /https://... or /http://...
    let targetUrlStr = url.pathname.slice(1);
    
    // Support percent-encoded URLs
    if (targetUrlStr.startsWith('http%3A') || targetUrlStr.startsWith('https%3A') || targetUrlStr.startsWith('http%3a') || targetUrlStr.startsWith('https%3a')) {
      try {
        targetUrlStr = decodeURIComponent(targetUrlStr);
      } catch (e) {}
    }

    // Append search parameters back if any
    if (url.search) {
      targetUrlStr += url.search;
    }

    if (!targetUrlStr.startsWith('http://') && !targetUrlStr.startsWith('https://')) {
      return new Response('Bad Request: Missing or invalid target URL', { status: 400 });
    }

    // 3. Inject correct headers
    const newHeaders = new Headers(request.headers);
    
    // Remove Cloudflare-specific headers to avoid confusing target
    newHeaders.delete('cf-connecting-ip');
    newHeaders.delete('cf-ipcountry');
    newHeaders.delete('cf-ray');
    newHeaders.delete('cf-visitor');
    
    const isCdn = targetUrlStr.includes('hakunaymatata.com') || targetUrlStr.includes('bcdnxw.') || targetUrlStr.includes('cacdn.');
    
    if (isCdn) {
      newHeaders.set('Referer', 'https://moviebox.pk');
      newHeaders.set('Origin', 'https://moviebox.pk');
    } else {
      newHeaders.set('Origin', 'https://h5.aoneroom.com');
      const originalReferer = request.headers.get('referer');
      if (originalReferer && !originalReferer.includes(url.host)) {
        newHeaders.set('Referer', originalReferer);
      } else {
        newHeaders.set('Referer', 'https://h5.aoneroom.com');
      }
    }

    // 4. Fetch the target URL and pipe it back
    try {
      const response = await fetch(targetUrlStr, {
        method: request.method,
        headers: newHeaders,
        body: request.method === 'POST' || request.method === 'PUT' ? request.body : null,
        redirect: 'follow'
      });

      // Inject CORS headers in the response
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD, PUT');
      responseHeaders.set('Access-Control-Allow-Headers', '*');
      responseHeaders.set('Access-Control-Expose-Headers', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    } catch (err) {
      return new Response('Proxy Error: ' + err.message, { status: 502 });
    }
  }
}
