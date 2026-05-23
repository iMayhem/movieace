# 🚀 Status Monitor Deployment Guide

## Quick Start (5 minutes)

### Step 1: Choose Your Deployment Method

Pick one of these options based on your setup:

#### Option A: Subdomain (Recommended) ⭐
**Best for:** Professional setup, easy to remember URL

1. Create subdomain `status.yourdomain.com` in your hosting control panel
2. Upload the entire `status` folder to the subdomain's root
3. Done! Access at `https://status.yourdomain.com`

#### Option B: Subfolder
**Best for:** Quick setup, no subdomain needed

1. Upload `status` folder to your main site's public directory
2. Access at `https://yourdomain.com/status/`

#### Option C: Free Static Hosting
**Best for:** Zero cost, instant deployment

Choose one:
- **Netlify**: Drag & drop the `status` folder → Get instant URL
- **Vercel**: `cd status && vercel --prod`
- **GitHub Pages**: Push to repo → Enable Pages → Done
- **Cloudflare Pages**: Connect repo → Deploy

---

## Detailed Setup Instructions

### 🌐 Subdomain Setup (cPanel/Plesk)

#### cPanel:
1. Login to cPanel
2. Go to **Domains** → **Subdomains**
3. Create subdomain: `status`
4. Document root: `/public_html/status` (or similar)
5. Click **Create**
6. Upload files via **File Manager** or FTP:
   ```
   /public_html/status/
   ├── index.html
   ├── status-checker.js
   ├── README.md
   └── .htaccess
   ```
7. Visit `https://status.yourdomain.com`

#### Plesk:
1. Login to Plesk
2. Go to **Websites & Domains**
3. Click **Add Subdomain**
4. Subdomain name: `status`
5. Document root: `/status`
6. Click **OK**
7. Upload files via **File Manager** or FTP
8. Visit `https://status.yourdomain.com`

---

### 📦 Static Hosting Platforms

#### Netlify (Easiest)

**Method 1: Drag & Drop**
1. Go to [netlify.com](https://netlify.com)
2. Drag the `status` folder to the upload area
3. Get instant URL: `https://random-name.netlify.app`
4. Optional: Add custom domain in settings

**Method 2: CLI**
```bash
npm install -g netlify-cli
cd status
netlify deploy --prod
```

#### Vercel

```bash
npm install -g vercel
cd status
vercel --prod
```

Follow prompts, get instant URL: `https://status-xxx.vercel.app`

#### GitHub Pages

1. Create new repo: `moovie-status`
2. Upload `status` folder contents to repo root
3. Go to **Settings** → **Pages**
4. Source: `main` branch, `/ (root)`
5. Save → Get URL: `https://username.github.io/moovie-status`

#### Cloudflare Pages

1. Push `status` folder to GitHub repo
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
3. Connect your repo
4. Build settings:
   - Build command: (leave empty)
   - Build output directory: `/`
5. Deploy → Get URL: `https://status.pages.dev`

---

### 🔧 Server Configuration

#### Nginx

Create config file: `/etc/nginx/sites-available/status`

```nginx
server {
    listen 80;
    server_name status.yourdomain.com;
    
    root /var/www/status;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/status /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Apache

The `.htaccess` file is already included. Just ensure:

1. `mod_rewrite` is enabled:
   ```bash
   sudo a2enmod rewrite
   sudo systemctl restart apache2
   ```

2. AllowOverride is set in your VirtualHost:
   ```apache
   <Directory /var/www/status>
       AllowOverride All
   </Directory>
   ```

---

### 🔐 SSL/HTTPS Setup

#### Free SSL with Let's Encrypt

**For cPanel:**
1. Go to **SSL/TLS Status**
2. Select your subdomain
3. Click **Run AutoSSL**

**For Certbot (Nginx/Apache):**
```bash
sudo certbot --nginx -d status.yourdomain.com
# or
sudo certbot --apache -d status.yourdomain.com
```

**For Cloudflare:**
1. Add subdomain to Cloudflare DNS
2. SSL/TLS mode: **Full** or **Full (strict)**
3. Automatic HTTPS enabled

---

### ⚙️ Customization After Deployment

#### 1. Update Service URLs

Edit `status-checker.js` to match your actual URLs:

```javascript
// Line 2-10: Update CineStream URL
{
    name: 'CineStream (Direct)',
    url: 'https://yourdomain.com/player.html',  // ← Change this
    testType: 'embed',
    note: 'Internal player'
}

// Line 50-55: Update Supabase URL
{
    name: 'Supabase',
    url: 'https://your-project.supabase.co',  // ← Change this
    testType: 'api'
}
```

#### 2. Add Your Branding

Edit `index.html`:

```html
<!-- Line 91: Change logo -->
<h1 class="logo">YourBrand ✦</h1>

<!-- Line 92: Change subtitle -->
<p class="subtitle">Your Custom Subtitle</p>
```

#### 3. Adjust Colors

Edit CSS variables in `index.html` (lines 14-30):

```css
:root {
    --ember: #your-color;
    --violet: #your-accent;
}
```

---

### 📊 Testing Your Deployment

1. **Open the status page** in your browser
2. **Check that all services load** (may take 10-30 seconds on first load)
3. **Verify status indicators** show correct colors:
   - 🟢 Green = Operational
   - 🟡 Yellow = Degraded
   - 🔴 Red = Down
4. **Test refresh button** (bottom right)
5. **Check mobile view** (resize browser or use phone)
6. **Verify auto-refresh** (wait 60 seconds, should update automatically)

---

### 🐛 Common Issues & Fixes

#### Issue: All services show "Down"

**Cause:** CORS restrictions or network issues

**Fix:**
- This is normal for some embed providers
- They block cross-origin requests but still work
- The status page uses fallback methods (iframe checks)
- If critical APIs show down, check your internet connection

#### Issue: Page doesn't load

**Fix:**
- Check file permissions: `chmod 644 index.html status-checker.js`
- Verify files are in correct location
- Check browser console for errors (F12)

#### Issue: Auto-refresh not working

**Fix:**
- Clear browser cache
- Check browser console for JavaScript errors
- Ensure JavaScript is enabled

#### Issue: Slow loading

**Fix:**
- Normal on first load (checking 20+ services)
- Consider reducing timeout in `status-checker.js`:
  ```javascript
  // Line 85: Change timeout from 10000 to 5000
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  ```

---

### 📈 Performance Optimization

#### Enable Caching

Add to `.htaccess` (Apache) or nginx config:

```apache
# Cache HTML for 5 minutes
<FilesMatch "\.(html)$">
    Header set Cache-Control "max-age=300, public"
</FilesMatch>

# Cache JS/CSS for 1 week
<FilesMatch "\.(js|css)$">
    Header set Cache-Control "max-age=604800, public"
</FilesMatch>
```

#### Enable Compression

Already included in `.htaccess`, but verify it's working:
```bash
curl -H "Accept-Encoding: gzip" -I https://status.yourdomain.com
```

Should see: `Content-Encoding: gzip`

---

### 🔒 Security Checklist

- ✅ HTTPS enabled (SSL certificate)
- ✅ Security headers configured (in `.htaccess`)
- ✅ No sensitive data exposed
- ✅ CORS properly configured
- ✅ Regular updates to service URLs

---

### 📱 Mobile Testing

Test on these viewports:
- **Desktop:** 1920x1080, 1366x768
- **Tablet:** 768x1024 (iPad)
- **Mobile:** 375x667 (iPhone), 360x640 (Android)

Use browser DevTools (F12) → Toggle device toolbar

---

### 🎯 Next Steps

1. ✅ Deploy to your chosen platform
2. ✅ Test all functionality
3. ✅ Customize branding and colors
4. ✅ Update service URLs to match your setup
5. ✅ Share the status page URL with your team
6. ✅ Bookmark for quick access
7. ✅ Set up monitoring alerts (optional)

---

### 💡 Pro Tips

1. **Bookmark the status page** for quick access during incidents
2. **Share the URL** with your team/users for transparency
3. **Check regularly** to catch issues early
4. **Update service list** as you add/remove providers
5. **Monitor response times** to identify slow services
6. **Use subdomain** for professional appearance

---

### 📞 Need Help?

- Check the main `README.md` for configuration details
- Review `status-checker.js` comments for customization
- Test in browser console (F12) for debugging
- Verify all files are uploaded correctly

---

**Deployment Time:** ~5 minutes  
**Maintenance:** Minimal (update service URLs as needed)  
**Cost:** Free (with static hosting)

🎉 **You're all set! Your status monitor is ready to go.**
