# Watch History & Search History Features

## Overview

The application now tracks user watch history and search history, with automatic synchronization to Supabase for logged-in users.

## Features

### 1. Watch History Tracking
- Automatically tracks movies, TV shows, and anime that users watch
- Displays in the "Continue Watching" section on the home page
- Syncs to Supabase for logged-in users
- Stored locally for guest users

### 2. Search History Tracking
- Tracks all search queries made by users
- Shows recent searches in the command palette (⌘K / Ctrl+K)
- Syncs to Supabase for logged-in users
- Stored locally for guest users

### 3. Settings Panel
- New settings button in the header (gear icon)
- Accessible from both desktop and mobile navigation
- Features:
  - **Clear Watch History**: Remove all viewing history
  - **Clear Search History**: Remove all search queries
  - Account information display for logged-in users

## Database Schema

### Required Columns in `movora_users` table:

```sql
watch_history JSONB DEFAULT '[]'::jsonb
search_history JSONB DEFAULT '[]'::jsonb
```

### Migration

Run the SQL migration script located at `/docs/supabase_migration.sql` in your Supabase SQL Editor to add the required columns.

## Implementation Details

### Watch History Structure
```typescript
interface ViewedItem {
  id: number | string;
  title: string;
  image: string | null;
  rating: number;
  categories: number[];
  adult: boolean;
  type: 'movie' | 'tv' | 'anime';
}
```

### Search History Structure
```typescript
string[] // Array of search terms
```

### Automatic Syncing

- **For logged-in users**: All history is automatically synced to Supabase in real-time
- **For guest users**: History is stored in localStorage only
- **On login**: Local history is merged with cloud history to preserve data

### Privacy Controls

Users can clear their history at any time through the Settings modal:
1. Click the settings icon (⚙️) in the header
2. Choose to clear watch history or search history
3. Confirm the action
4. Data is immediately removed from both local storage and Supabase

## Usage

### Accessing Settings
- **Desktop**: Click the gear icon in the header
- **Mobile**: Open the menu and select "Settings"

### Clearing History
1. Open Settings
2. Click "Clear Watch History" or "Clear Search History"
3. Confirm the action in the dialog
4. History is permanently deleted

## Technical Notes

- Maximum history length: 20 items (configurable in `useHistory.ts`)
- History is stored as JSONB in Supabase for efficient querying
- GIN indexes are created for better performance
- All sync operations are debounced to prevent excessive API calls
- Error handling ensures graceful degradation if Supabase is unavailable

## Files Modified/Created

### New Files:
- `/src/components/navigation/SettingsModal.vue` - Settings modal component
- `/docs/supabase_migration.sql` - Database migration script
- `/docs/HISTORY_FEATURES.md` - This documentation

### Modified Files:
- `/src/lib/auth.ts` - Added history sync functions
- `/src/composables/useHistory.ts` - Added Supabase sync
- `/src/components/navigation/SiteHeader.vue` - Added settings button
- `/public/party/index.html` - Fixed video playback issue

## Future Enhancements

Potential improvements:
- Export history data
- History statistics and insights
- Customizable history retention period
- History search and filtering
- Recommendations based on watch history
