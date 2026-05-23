# moovie Status Monitor

A real-time status monitoring dashboard for all moovie services, APIs, and embed providers.

## 🚀 Features

- ✅ **Real-time monitoring** of all core APIs (TMDB, AniList, Consumet)
- ✅ **16 Movie embed providers** status tracking
- ✅ **Anime providers** monitoring (AnimePlay Sub/Dub)
- ✅ **Backend services** (Supabase) health checks
- ✅ **Response time tracking** with averages
- ✅ **Auto-refresh** every 60 seconds
- ✅ **Mobile responsive** design
- ✅ **Visual status indicators** (Operational/Degraded/Down)
- ✅ **Statistics dashboard** showing service health at a glance

## 📦 Deployment

### Option 1: Upload to Subdomain (Recommended)

1. **Create a subdomain** (e.g., `status.yourdomain.com`)

2. **Upload the entire `status` folder** to your subdomain's root directory:
   ```
   status/
   ├── index.html
   ├── status-checker.js
   └── README.md
   ```

3. **Configure your web server** (if needed):
   - No special configuration required
   - Works with any static hosting (Netlify, Vercel, GitHub Pages, etc.)
   - No backend or database needed

4. **Access your status page** at `https://status.yourdomain.com`

### Option 2: Deploy to Static Hosting

#### Netlify
```bash
# Drag and drop the status folder to Netlify
# Or use Netlify CLI:
cd status
netlify deploy --prod
```

#### Vercel
```bash
cd status
vercel --prod
```

#### GitHub Pages
```bash
# Push the status folder to a GitHub repo
# Enable GitHub Pages in repo settings
# Point to the status folder
```

### Option 3: Add to Existing Site

Copy the `status` folder to your existing site's public directory:
```
public/
├── status/
│   ├── index.html
│   ├── status-checker.js
│   └── README.md
```

Access at: `https://yourdomain.com/status/`

## 🔧 Configuration

### Adding New Services

Edit `status-checker.js` and add services to the appropriate category:

```javascript
const services = {
    coreApis: [
        {
            name: 'Your API Name',
            url: 'https://api.example.com/endpoint',
            testType: 'api', // 'api', 'embed', or 'graphql'
            requiresAuth: false // optional
        }
    ],
    embedProviders: [
        {
            name: 'New Embed Provider',
            url: 'https://embed.example.com/movie/123',
            testType: 'embed'
        }
    ]
    // ... more categories
};
```

### Test Types

- **`api`**: Standard REST API endpoint (checks HTTP status)
- **`embed`**: Embed/iframe provider (checks reachability)
- **`graphql`**: GraphQL endpoint (sends test query)

### Customizing Refresh Interval

Change the auto-refresh interval in `status-checker.js`:

```javascript
// Default: 60000ms (60 seconds)
autoRefreshInterval = setInterval(() => {
    checkAllServices();
}, 60000); // Change this value
```

## 🎨 Customization

### Branding

Edit `index.html` to change:
- Logo text (line 91): `<h1 class="logo">moovie ✦</h1>`
- Subtitle (line 92): `<p class="subtitle">Real-time System Status Monitor</p>`
- Favicon: Add `<link rel="icon" href="favicon.svg">` in `<head>`

### Colors

Modify CSS variables in `index.html` (lines 14-30):

```css
:root {
    --ember: #ff5a1f;      /* Primary brand color */
    --violet: #6366f1;     /* Accent color */
    --green: #10b981;      /* Operational status */
    --yellow: #f59e0b;     /* Degraded status */
    --red: #ef4444;        /* Down status */
    /* ... more variables */
}
```

## 📊 What Gets Monitored

### Core APIs (3 services)
- TMDB API (Movie/TV data)
- AniList API (Anime data)
- Consumet API (Anime streaming)

### Movie Embed Providers (16 services)
- CineStream (Internal)
- VidLink
- VidEasy
- VidSrc (to)
- VidKing
- Cinemaos
- VidSrc RU
- VidSrc SU
- VidSrcMe
- MultiEmbed
- Vsrc
- AutoEmbed
- VidFast
- 111Movies
- Vidora
- Smashy

### Anime Providers (2 services)
- AnimePlay (Sub)
- AnimePlay (Dub)

### Backend Services (1 service)
- Supabase (Database)

## 🔒 Security Notes

- No sensitive data is exposed
- All checks are client-side
- CORS limitations may affect some embed provider checks
- No API keys are stored in the status page

## 📱 Mobile Support

Fully responsive design optimized for:
- Desktop (1200px+)
- Tablet (768px - 1024px)
- Mobile (320px - 768px)

## 🐛 Troubleshooting

### Services showing as "Down" but they work

Some embed providers block CORS requests. The status checker uses fallback methods (iframe loading) but may still show false negatives. This is normal for embed providers with strict CORS policies.

### Slow loading times

- Check your internet connection
- Some providers may have rate limiting
- Consider increasing timeout values in `status-checker.js`

### Auto-refresh not working

- Check browser console for errors
- Ensure JavaScript is enabled
- Try manually refreshing with the button

## 📄 License

Part of the moovie project. Use freely for your status monitoring needs.

## 🤝 Contributing

To add more services or improve the monitoring:

1. Edit `status-checker.js`
2. Add your service to the appropriate category
3. Test the changes locally
4. Deploy the updated files

## 📞 Support

For issues or questions about the status monitor, check the main moovie project documentation.

---

**Last Updated:** 2026
**Version:** 1.0.0
