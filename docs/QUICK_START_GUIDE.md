# Quick Start Guide: History & Settings Features

## 🚀 Getting Started

### Step 1: Database Setup (REQUIRED)

Before using the new features, you **must** update your Supabase database:

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `/docs/supabase_migration.sql`
4. Click **Run** to execute the migration
5. Verify success - you should see "Success. No rows returned"

### Step 2: Build and Deploy

```bash
npm run build
```

The build should complete successfully with no errors.

### Step 3: Test the Features

#### Test Settings Access:
1. Open your app in a browser
2. Look for the **gear icon (⚙️)** in the header (next to watchlist)
3. Click it to open the Settings modal
4. You should see options to clear watch and search history

#### Test Watch History:
1. Watch any movie, TV show, or anime
2. The item should appear in your "Continue Watching" section
3. If logged in, check Supabase to verify it's synced to `watch_history` column

#### Test Search History:
1. Search for any content using the search bar (⌘K or Ctrl+K)
2. Open the command palette again
3. You should see your recent searches under "Recent"

#### Test Clear History:
1. Open Settings (gear icon)
2. Click "Clear Watch History" or "Clear Search History"
3. Confirm the action
4. Verify the history is cleared both locally and in Supabase

## 📍 Where to Find Things

### Settings Button Location:
- **Desktop**: Header bar, between Watchlist and Party buttons (gear icon ⚙️)
- **Mobile**: Open menu (☰) → scroll to "Settings" (⚙ icon)

### Watch History Display:
- **Home Page**: "Continue Watching" section (if you have watched items)
- **Stored**: localStorage key `viewHistory` + Supabase `watch_history` column

### Search History Display:
- **Command Palette**: Press ⌘K (Mac) or Ctrl+K (Windows/Linux)
- **Recent Section**: Shows last 5 searches
- **Stored**: localStorage key `searchHistory` + Supabase `search_history` column

## 🔧 Configuration

### Maximum History Length
Default: 20 items

To change, edit `/src/composables/useHistory.ts`:
```typescript
const MAX_HISTORY_LENGTH = 20; // Change this number
```

### Disable Auto-Sync
If you want to disable automatic Supabase sync, comment out the watch blocks in:
- `/src/composables/useHistory.ts`
- `/src/composables/useWatchlist.ts`

## 🐛 Troubleshooting

### History Not Syncing to Supabase
**Check:**
1. Did you run the SQL migration?
2. Is the user logged in? (Guest users only use localStorage)
3. Check browser console for errors
4. Verify Supabase connection in Network tab

**Fix:**
```sql
-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'movora_users' 
AND column_name IN ('watch_history', 'search_history');
```

### Settings Button Not Visible
**Check:**
1. Clear browser cache and hard reload (Ctrl+Shift+R)
2. Verify build completed successfully
3. Check browser console for component errors

### Clear History Not Working
**Check:**
1. Browser console for errors
2. Supabase permissions (RLS policies)
3. Network tab to see if API call is made

**Manual Clear:**
```javascript
// In browser console
localStorage.removeItem('viewHistory');
localStorage.removeItem('searchHistory');
location.reload();
```

### Watch Together Video Still Playing
**This was fixed!** The video should now stop when you leave the party lobby.

**If issue persists:**
1. Hard refresh the page (Ctrl+Shift+R)
2. Clear browser cache
3. Check if you're using the latest version

## 📊 Data Structure

### Watch History Item:
```typescript
{
  id: number | string,
  title: string,
  image: string | null,
  rating: number,
  categories: number[],
  adult: boolean,
  type: 'movie' | 'tv' | 'anime'
}
```

### Search History:
```typescript
string[] // Array of search terms
```

### Supabase Storage:
```sql
-- Both stored as JSONB
watch_history JSONB DEFAULT '[]'::jsonb
search_history JSONB DEFAULT '[]'::jsonb
```

## 🔐 Privacy & Security

### User Control:
- ✅ Users can clear their history anytime
- ✅ Confirmation required before deletion
- ✅ Deletion is permanent and immediate
- ✅ History is user-specific (not shared)

### Data Storage:
- **Logged-in users**: Synced to Supabase (encrypted at rest)
- **Guest users**: localStorage only (device-specific)
- **On login**: Local + cloud data is merged (no data loss)

### Compliance:
- Users have full control over their data
- Clear history = permanent deletion
- No tracking without user knowledge
- Data is not shared with third parties

## 📱 Mobile Considerations

### Responsive Design:
- Settings modal adapts to screen size
- Buttons stack vertically on small screens
- Touch-friendly button sizes
- Drawer menu for easy access

### Performance:
- History limited to 20 items (prevents bloat)
- Efficient JSONB storage in Supabase
- Debounced sync (prevents excessive API calls)
- GIN indexes for fast queries

## 🎯 User Experience

### Automatic Features:
- ✅ History tracked automatically while watching
- ✅ Searches saved automatically
- ✅ Sync happens in background (no user action needed)
- ✅ Merge on login (preserves all data)

### Manual Controls:
- ✅ Clear watch history (with confirmation)
- ✅ Clear search history (with confirmation)
- ✅ View account info
- ✅ Access from desktop or mobile

## 📈 Next Steps

### Recommended Enhancements:
1. Add history export (JSON/CSV)
2. Add viewing statistics dashboard
3. Add history search/filter
4. Add recommendations based on history
5. Add history retention settings (7 days, 30 days, forever)

### Optional Features:
- History sharing with friends
- Watch party history
- Collaborative watchlists
- History-based achievements

## 💡 Tips

1. **For Developers**: Check browser console for detailed sync logs
2. **For Users**: Sign in to sync history across devices
3. **For Testing**: Use incognito mode to test guest user experience
4. **For Privacy**: Clear history regularly if sharing device

## 📞 Support

If you encounter issues:
1. Check this guide first
2. Review browser console errors
3. Check Supabase logs
4. Verify migration was run successfully
5. Test in incognito mode (rules out cache issues)

## ✅ Success Checklist

- [ ] SQL migration executed successfully
- [ ] Build completes without errors
- [ ] Settings button visible in header
- [ ] Settings modal opens and closes
- [ ] Watch history tracks when viewing content
- [ ] Search history tracks when searching
- [ ] Clear watch history works
- [ ] Clear search history works
- [ ] History syncs to Supabase (logged-in users)
- [ ] History persists after logout/login
- [ ] Watch together video stops when leaving party

---

**Last Updated**: May 22, 2026
**Version**: 1.0.0
**Status**: ✅ Production Ready
