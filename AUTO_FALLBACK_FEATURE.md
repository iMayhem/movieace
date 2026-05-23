# Auto-Fallback Feature: Smart Stream Switching

## 🎯 Feature Overview

The **Auto-Fallback** feature automatically switches to the next available stream if the current one is buffering or fails to load. This ensures users get the best possible streaming experience without manual intervention.

---

## 🔧 How It Works

### Initial Load Phase (Auto-Switching Enabled)
When a video first loads:
1. Player attempts to play the **first available stream**
2. If the stream **buffers for 2+ seconds** → Automatically switches to next stream
3. If the stream **errors out** → Immediately switches to next stream
4. Shows notification: `"Switching to backup stream (2/5)..."`
5. Continues until a working stream is found

### After Successful Playback (Auto-Switching Disabled)
Once the video starts playing successfully:
- Auto-switching is **permanently disabled** for this session
- Normal buffering during playback **does not trigger** auto-switch
- User can manually change streams via quality selector

### User Manual Control (Auto-Switching Disabled)
If the user manually changes the stream/quality:
- Auto-switching is **permanently disabled** for this session
- User has full control over stream selection
- No automatic interference

---

## 📊 State Machine

```
┌─────────────────────────────────────────────────────────────┐
│                    Initial Load State                        │
│  • hasPlayedSuccessfully = false                            │
│  • isUserManualSwitch = false                               │
│  • Auto-fallback: ENABLED                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─── Video buffering (2s) ───┐
                            │                             │
                            ├─── Video error ─────────────┤
                            │                             │
                            │                             ▼
                            │              ┌──────────────────────────┐
                            │              │  Try Next Stream         │
                            │              │  currentStreamIndex++    │
                            │              └──────────────────────────┘
                            │                             │
                            │                             │
                            ▼                             │
                ┌───────────────────────┐                │
                │  Video Playing        │◄───────────────┘
                │  hasPlayedSuccessfully│
                │  = true               │
                └───────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Auto-fallback:       │
                │  DISABLED             │
                │  (User in control)    │
                └───────────────────────┘
```

---

## 🎬 User Experience Scenarios

### Scenario 1: First Stream Works (Best Case)
```
1. User clicks "Play"
2. Stream 1 loads successfully
3. Video starts playing in 2-3 seconds
4. Auto-fallback disabled (video playing)
5. User enjoys content
```

### Scenario 2: First Stream Fails (Auto-Fallback)
```
1. User clicks "Play"
2. Stream 1 buffers for 2 seconds
3. Notification: "Switching to backup stream (2/5)..."
4. Stream 2 loads successfully
5. Video starts playing
6. Auto-fallback disabled (video playing)
7. User enjoys content
```

### Scenario 3: Multiple Streams Fail (Cascading Fallback)
```
1. User clicks "Play"
2. Stream 1 buffers → Auto-switch to Stream 2
3. Stream 2 errors → Auto-switch to Stream 3
4. Stream 3 loads successfully
5. Video starts playing
6. Auto-fallback disabled
```

### Scenario 4: All Streams Fail (Worst Case)
```
1. User clicks "Play"
2. Stream 1 buffers → Auto-switch to Stream 2
3. Stream 2 errors → Auto-switch to Stream 3
4. Stream 3 buffers → Auto-switch to Stream 4
5. Stream 4 errors → Auto-switch to Stream 5
6. Stream 5 fails
7. Notification: "All streams failed. Please try a different server."
8. User can manually select a different server from sidebar
```

### Scenario 5: User Manually Changes Stream
```
1. Video is playing on Stream 2
2. User opens quality selector
3. User selects "Stream 4"
4. isUserManualSwitch = true
5. Auto-fallback permanently disabled
6. User has full control
```

---

## 🔍 Technical Implementation

### Key Variables

```typescript
// Track current stream index in the resolutions array
const currentStreamIndex = ref(0);

// Track if user manually changed stream (disables auto-fallback)
const isUserManualSwitch = ref(false);

// Track if video has started playing successfully (disables auto-fallback)
const hasPlayedSuccessfully = ref(false);

// Timeout for buffering detection (2 seconds)
let bufferingTimeout: ReturnType<typeof setTimeout> | null = null;
```

### Event Listeners

```typescript
// Buffering detected
artplayerInstance.on('video:waiting', () => {
  if (hasPlayedSuccessfully.value || isUserManualSwitch.value) {
    return; // Don't auto-switch
  }
  
  bufferingTimeout = setTimeout(() => {
    tryNextStream(); // Switch after 2 seconds
  }, 2000);
});

// Video playing successfully
artplayerInstance.on('video:playing', () => {
  hasPlayedSuccessfully.value = true; // Disable auto-fallback
  clearTimeout(bufferingTimeout);
});

// Video error
artplayerInstance.on('video:error', () => {
  tryNextStream(); // Immediately switch
});

// User manually changed quality
artplayerInstance.on('quality', (quality) => {
  isUserManualSwitch.value = true; // Disable auto-fallback
});
```

### Auto-Switch Logic

```typescript
const tryNextStream = () => {
  // Don't auto-switch if user has control or video is playing
  if (isUserManualSwitch.value || hasPlayedSuccessfully.value) {
    return;
  }

  // Try next stream if available
  if (currentStreamIndex.value < resolutions.value.length - 1) {
    currentStreamIndex.value++;
    const nextStream = resolutions.value[currentStreamIndex.value];
    videoUrl.value = nextStream.url;
    
    // Show notification
    artplayerInstance.notice.show = 
      `Switching to backup stream (${currentStreamIndex.value + 1}/${resolutions.value.length})...`;
  } else {
    // No more streams available
    artplayerInstance.notice.show = 
      'All streams failed. Please try a different server.';
  }
};
```

---

## 🧪 Testing the Feature

### Test 1: Verify Auto-Fallback Works
1. Open browser DevTools → Console
2. Navigate to a movie and click "Play"
3. If first stream buffers, you should see:
   ```
   [AUTO-FALLBACK] Video buffering detected, starting 2s timeout...
   [AUTO-FALLBACK] Buffering timeout reached, trying next stream...
   [AUTO-FALLBACK] Switching to stream 2/5: Auto (M3U8)
   ```
4. Player should automatically switch to next stream

### Test 2: Verify Auto-Fallback Disables After Playback
1. Wait for video to start playing
2. You should see:
   ```
   [AUTO-FALLBACK] Video playing successfully
   ```
3. If video buffers during playback, it should **NOT** auto-switch
4. Console should show:
   ```
   [AUTO-FALLBACK] Skipping auto-switch (user control or already playing)
   ```

### Test 3: Verify User Manual Control
1. Start playing a video
2. Open quality selector and manually change stream
3. You should see:
   ```
   [ARTPLAYER] Quality changed by user: Auto (M3U8)
   ```
4. Auto-fallback should be permanently disabled
5. If new stream buffers, it should **NOT** auto-switch

### Test 4: Verify All Streams Fail Scenario
1. Simulate all streams failing (disconnect internet briefly)
2. Player should try all available streams
3. Final notification should show:
   ```
   All streams failed. Please try a different server.
   ```

---

## 📝 Configuration

### Buffering Timeout Duration
Edit `src/components/player/StreamFrame.vue`:

```typescript
// Change 2000ms (2 seconds) to desired timeout
bufferingTimeout = setTimeout(() => {
  tryNextStream();
}, 2000); // ← Change this value
```

### Disable Auto-Fallback Entirely
Set `isUserManualSwitch` to `true` on mount:

```typescript
onMounted(() => {
  isUserManualSwitch.value = true; // Disable auto-fallback
  // ... rest of code
});
```

---

## 🎯 Benefits

### For Users
- ✅ **Seamless experience** - No manual intervention needed
- ✅ **Faster playback** - Automatically finds working stream
- ✅ **Less frustration** - No staring at buffering spinner
- ✅ **Full control** - Can manually override at any time

### For Platform
- ✅ **Higher engagement** - Users less likely to leave due to buffering
- ✅ **Better retention** - Smooth playback = happy users
- ✅ **Reduced support** - Fewer complaints about buffering
- ✅ **Smart resource usage** - Only uses working streams

---

## 🚨 Edge Cases Handled

### Case 1: Rapid Buffering/Playing Cycles
If video rapidly switches between buffering and playing:
- Timeout is cleared when video starts playing
- Auto-fallback only triggers after sustained 2-second buffering

### Case 2: User Changes Stream During Auto-Switch
If user manually changes stream while auto-switch is in progress:
- `isUserManualSwitch` is set to `true`
- Auto-fallback is immediately disabled
- User's choice is respected

### Case 3: New Episode/Movie Loaded
When user navigates to new content:
- All state variables are reset in `processStreamData()`
- Auto-fallback is re-enabled for new content
- Fresh start for each video

### Case 4: Player Destroyed During Auto-Switch
If component unmounts during auto-switch:
- `bufferingTimeout` is cleared in `onUnmounted()`
- No memory leaks or orphaned timers

---

## 📈 Success Metrics

### Technical Metrics
- **Reduced buffering time**: Users spend less time waiting
- **Higher playback success rate**: More videos start playing successfully
- **Lower error rate**: Fewer "video failed to load" errors

### User Experience Metrics
- **Reduced bounce rate**: Users less likely to leave due to buffering
- **Higher completion rate**: Users more likely to finish watching
- **Fewer support tickets**: Less complaints about buffering

---

## 🔮 Future Enhancements

### Priority 1: Smart Stream Ranking
- Track which streams work most reliably
- Prioritize working streams for future playback
- Store success rate per stream provider

### Priority 2: Bandwidth Detection
- Detect user's bandwidth before selecting stream
- Auto-select appropriate quality based on connection speed
- Avoid buffering by choosing lower quality on slow connections

### Priority 3: Predictive Switching
- Monitor buffer health during playback
- Proactively switch before buffering occurs
- Seamless quality adaptation

---

## 🎉 Summary

The Auto-Fallback feature provides a **Netflix-like experience** where users don't have to worry about buffering or failed streams. The system intelligently handles stream failures while respecting user control.

**Key Principles**:
1. **Auto-switch during initial load** (before video plays)
2. **Respect user control** (disable after manual selection)
3. **Don't interfere during playback** (disable after successful play)
4. **Provide feedback** (show notifications during switches)

---

*Feature implemented on: May 23, 2026*
*Ready for production deployment*
