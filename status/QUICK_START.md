# ⚡ Quick Start Guide

Get your status monitor running in **under 5 minutes**.

## 🎯 What You'll Get

A beautiful, real-time status dashboard that monitors:
- ✅ 3 Core APIs (TMDB, AniList, Consumet)
- ✅ 16 Movie Embed Providers
- ✅ 2 Anime Providers
- ✅ 1 Backend Service (Supabase)

**Total: 22 services monitored automatically**

---

## 🚀 Fastest Deployment (2 minutes)

### Option 1: Netlify Drop (Easiest)

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the entire `status` folder onto the page
3. **Done!** You get an instant URL like: `https://random-name.netlify.app`

**Optional:** Change the URL:
- Click "Site settings"
- "Change site name"
- Now it's: `https://your-name.netlify.app`

### Option 2: Vercel (1 command)

```bash
cd status
npx vercel --prod
```

Follow prompts → Get instant URL: `https://status-xxx.vercel.app`

### Option 3: Your Own Server (3 steps)

1. **Upload** the `status` folder to your server
2. **Point** your subdomain to the folder
3. **Visit** `https://status.yourdomain.com`

---

## 🧪 Test Locally First

Want to test before deploying?

### Method 1: Python (Built-in)

```bash
cd status
python3 -m http.server 8000
```

Open: `http://localhost:8000`

### Method 2: Node.js

```bash
cd status
npx serve
```

Open: `http://localhost:3000`

### Method 3: PHP (Built-in)

```bash
cd status
php -S localhost:8000
```

Open: `http://localhost:8000`

---

## ✅ Verify It Works

After deployment, check:

1. **Page loads** ✓
2. **Services start checking** (you'll see spinners) ✓
3. **Status indicators appear** (green/yellow/red dots) ✓
4. **Stats update** (top cards show numbers) ✓
5. **Refresh button works** (bottom right corner) ✓

**First load takes 10-30 seconds** (checking 22 services)

---

## 🎨 Quick Customization (Optional)

### Change the Logo

Edit `index.html` line 91:

```html
<h1 class="logo">moovie ✦</h1>
```

Change `moovie` to your brand name.

### Change Colors

Edit `index.html` lines 14-30:

```css
:root {
    --ember: #ff5a1f;      /* Your primary color */
    --violet: #6366f1;     /* Your accent color */
}
```

### Update Your URLs

Edit `status-checker.js` line 5:

```javascript
{
    name: 'CineStream (Direct)',
    url: 'https://yourdomain.com/player.html',  // ← Change this
    testType: 'embed',
    note: 'Internal player'
}
```

---

## 📱 Mobile Check

Open on your phone → Should look perfect!

The status monitor is fully responsive:
- ✅ Desktop
- ✅ Tablet
- ✅ Mobile
- ✅ All screen sizes

---

## 🔄 Auto-Refresh

The page automatically refreshes every **60 seconds**.

No need to manually refresh!

**Want to change the interval?**

Edit `status-checker.js` line 380:

```javascript
}, 60000);  // Change to 30000 for 30 seconds
```

---

## 🎯 What Each Status Means

| Status | Color | Meaning |
|--------|-------|---------|
| **Operational** | 🟢 Green | Service is working perfectly |
| **Degraded** | 🟡 Yellow | Service is slow or having issues |
| **Down** | 🔴 Red | Service is not responding |
| **Checking** | 🔵 Blue | Currently testing the service |

---

## 💡 Pro Tips

### Tip 1: Bookmark It
Add to your browser bookmarks for quick access during incidents.

### Tip 2: Share the URL
Give the status page URL to your team/users for transparency.

### Tip 3: Check Response Times
Look at the "ms" values next to each service:
- **< 500ms** = Fast ⚡
- **500-2000ms** = Normal ✓
- **> 2000ms** = Slow 🐌

### Tip 4: Use Subdomain
Instead of `yourdomain.com/status/`, use `status.yourdomain.com`
- Looks more professional
- Easier to remember
- Can be hosted separately

---

## 🐛 Troubleshooting

### Problem: All services show "Down"

**Solution:** This is normal for embed providers due to CORS restrictions. They block cross-origin requests but still work fine. The status page uses fallback methods.

### Problem: Page is blank

**Solution:**
1. Check browser console (F12)
2. Verify all files are uploaded
3. Check file permissions (should be 644)

### Problem: Slow loading

**Solution:** Normal on first load. Checking 22 services takes time. Subsequent loads are faster.

---

## 📊 Understanding the Dashboard

### Top Section
- **Overall Status**: Summary of all services
- **Stats Cards**: Quick numbers at a glance

### Service Categories
- **Core APIs**: Essential data sources
- **Movie Embed Providers**: Video streaming services
- **Anime Providers**: Anime streaming services
- **Backend Services**: Database and infrastructure

### Each Service Shows
- **Name**: Service identifier
- **URL**: Endpoint being checked
- **Status**: Current health (Operational/Degraded/Down)
- **Response Time**: How fast it responded (in milliseconds)

---

## 🎉 You're Done!

Your status monitor is now live and monitoring all services.

### Next Steps (Optional)

1. ✅ Add custom domain (if using Netlify/Vercel)
2. ✅ Enable SSL/HTTPS (usually automatic)
3. ✅ Customize branding and colors
4. ✅ Add more services to monitor
5. ✅ Share with your team

---

## 📚 Need More Help?

- **Full deployment guide**: See `DEPLOYMENT_GUIDE.md`
- **Configuration options**: See `README.md`
- **Custom services**: See `config.example.js`

---

## ⏱️ Time Breakdown

- **Deploy to Netlify**: 2 minutes
- **Deploy to Vercel**: 1 minute
- **Deploy to your server**: 5 minutes
- **Test locally**: 30 seconds
- **Customize branding**: 2 minutes

**Total time to production: 2-5 minutes** ⚡

---

**Questions?** Check the other documentation files in this folder.

**Ready to deploy?** Pick your method above and go! 🚀
