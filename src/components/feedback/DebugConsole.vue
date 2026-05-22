<template>
  <div class="debug-console" :class="{ 'debug-console--open': isOpen }">
    <!-- ── Floating Glow Button ────────────────────────────────────────── -->
    <button 
      class="debug-trigger" 
      @click="isOpen = !isOpen"
      aria-label="Toggle Debug Console"
      title="Diagnostics Console"
    >
      <span class="debug-trigger__icon" :class="{ 'debug-trigger__icon--close': isOpen }">🛠️</span>
      <span v-if="hasNewErrors" class="debug-trigger__badge">!</span>
    </button>

    <!-- ── Console Drawer ──────────────────────────────────────────────── -->
    <div class="debug-drawer">
      <!-- Header -->
      <div class="debug-drawer__header">
        <div class="debug-drawer__title-group">
          <span class="debug-drawer__indicator" />
          <h3 class="debug-drawer__title">Diagnostics & Logs</h3>
        </div>
        <div class="debug-drawer__controls">
          <button @click="clearLogs" class="debug-btn debug-btn--text">Clear</button>
          <button @click="isOpen = false" class="debug-btn debug-btn--close" aria-label="Close drawer">×</button>
        </div>
      </div>



      <!-- Logs Viewport -->
      <div class="debug-viewport" ref="viewportRef">
        <div v-if="logs.length === 0" class="debug-empty">
          No logs captured yet. Perform an action or run a test to populate logs.
        </div>
        <div 
          v-for="(log, idx) in logs" 
          :key="idx" 
          class="debug-log-line" 
          :class="`debug-log-line--${log.level}`"
        >
          <span class="debug-log-time">{{ log.time }}</span>
          <span class="debug-log-tag" :class="`debug-log-tag--${log.level}`">[{{ log.level.toUpperCase() }}]</span>
          <span class="debug-log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';

interface LogEntry {
  time: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

export default defineComponent({
  name: 'DebugConsole',
  setup() {
    const isOpen = ref(false);
    const logs = ref<LogEntry[]>([]);
    const hasNewErrors = ref(false);
    const viewportRef = ref<HTMLDivElement | null>(null);

    // Capture standard console calls
    let originalLog: typeof console.log;
    let originalWarn: typeof console.warn;
    let originalError: typeof console.error;

    const addLog = (level: 'info' | 'warn' | 'error' | 'success', args: any[]) => {
      const time = new Date().toTimeString().split(' ')[0] || '';
      const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
      
      logs.value.push({ time, level, message });
      
      // Limit to last 500 entries to prevent memory leak
      if (logs.value.length > 500) {
        logs.value.shift();
      }

      if (level === 'error' && !isOpen.value) {
        hasNewErrors.value = true;
      }

      // Auto scroll viewport
      nextTick(() => {
        if (viewportRef.value) {
          viewportRef.value.scrollTop = viewportRef.value.scrollHeight;
        }
      });
    };

    const clearLogs = () => {
      logs.value = [];
      hasNewErrors.value = false;
    };

    onMounted(() => {
      // Hijack console logs beautifully
      originalLog = console.log;
      originalWarn = console.warn;
      originalError = console.error;

      console.log = (...args) => {
        originalLog.apply(console, args);
        addLog('info', args);
      };

      console.warn = (...args) => {
        originalWarn.apply(console, args);
        addLog('warn', args);
      };

      console.error = (...args) => {
        originalError.apply(console, args);
        addLog('error', args);
      };

      addLog('success', ['[DEBUG WIDGET] Diagnostics initialized successfully. Developer options are fully enabled!']);
    });

    onBeforeUnmount(() => {
      // Restore console methods to avoid leaks
      if (originalLog) console.log = originalLog;
      if (originalWarn) console.warn = originalWarn;
      if (originalError) console.error = originalError;
    });

    watch(isOpen, (newVal) => {
      if (newVal) {
        hasNewErrors.value = false;
        nextTick(() => {
          if (viewportRef.value) {
            viewportRef.value.scrollTop = viewportRef.value.scrollHeight;
          }
        });
      }
    });

    return {
      isOpen,
      logs,
      hasNewErrors,
      viewportRef,
      clearLogs
    };
  }
});
</script>

<style scoped lang="scss">
.debug-console {
  position: fixed;
  z-index: 999999;
  bottom: 1.5rem;
  right: 1.5rem;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  pointer-events: none;
}

// ── Floating Button ──────────────────────────────────────────────────────────
.debug-trigger {
  pointer-events: auto;
  position: relative;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: rgba(18, 17, 15, 0.85);
  border: 1px solid rgba(212, 163, 89, 0.4);
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 15px rgba(212, 163, 89, 0.2);
  color: var(--bone-50, #f7f5f0);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  &:hover {
    transform: scale(1.1) rotate(10deg);
    border-color: rgba(212, 163, 89, 0.8);
    box-shadow: 
      0 12px 35px rgba(0, 0, 0, 0.7),
      0 0 25px rgba(212, 163, 89, 0.4);
  }

  &__icon {
    font-size: 1.5rem;
    transition: transform 0.3s ease;
    
    &--close {
      transform: rotate(90deg);
    }
  }

  &__badge {
    position: absolute;
    top: -3px;
    right: -3px;
    background: #f87171;
    color: white;
    font-size: 0.75rem;
    font-weight: bold;
    width: 1.15rem;
    height: 1.15rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(18, 17, 15, 0.85);
    box-shadow: 0 0 10px rgba(248, 113, 113, 0.5);
    animation: pulse 1.5s infinite;
  }
}

// ── Drawer Panel ─────────────────────────────────────────────────────────────
.debug-drawer {
  pointer-events: auto;
  position: absolute;
  bottom: 4.5rem;
  right: 0;
  width: 480px;
  max-width: calc(100vw - 3rem);
  height: 520px;
  max-height: calc(100vh - 8rem);
  background: rgba(13, 12, 10, 0.95);
  border: 1px solid rgba(212, 163, 89, 0.2);
  border-radius: 1rem;
  box-shadow: 
    0 30px 70px rgba(0, 0, 0, 0.8),
    0 0 35px rgba(212, 163, 89, 0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  opacity: 0;
  transform: translateY(15px) scale(0.97);
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(25px);
  -webkit-backdrop-filter: blur(25px);

  .debug-console--open & {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

// Header
.debug-drawer__header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.debug-drawer__title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.debug-drawer__indicator {
  width: 8px;
  height: 8px;
  background: #4ade80;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.8);
  animation: pulse-green 2s infinite;
}

.debug-drawer__title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--bone-50, #f7f5f0);
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.debug-drawer__controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

// Test Runner Block
.debug-tester {
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  &__heading {
    margin: 0;
    font-size: 0.78rem;
    text-transform: uppercase;
    color: rgba(212, 163, 89, 0.85);
    letter-spacing: 0.5px;
    font-weight: 600;
  }

  &__row {
    display: flex;
    gap: 0.5rem;
  }
}

// Form Controls
.debug-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  color: white;
  font-size: 0.85rem;
  transition: border-color 0.2s ease;

  &:focus {
    outline: none;
    border-color: rgba(212, 163, 89, 0.5);
  }
}

.debug-select {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.375rem;
  padding: 0.5rem 1.5rem 0.5rem 0.5rem;
  color: white;
  font-size: 0.85rem;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: rgba(212, 163, 89, 0.5);
  }
}

// Viewport
.debug-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: 0.8rem;
  background: rgba(0, 0, 0, 0.25);

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
}

.debug-empty {
  color: rgba(255, 255, 255, 0.35);
  font-style: italic;
  text-align: center;
  padding: 2rem 0;
  font-family: sans-serif;
  font-size: 0.85rem;
}

// Log line coloring
.debug-log-line {
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.4;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.2rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.02);

  &--info {
    color: #e2e8f0;
  }
  &--success {
    color: #4ade80; // Neon Green
    background: rgba(74, 222, 128, 0.05);
  }
  &--warn {
    color: #facc15; // Neon Yellow
    background: rgba(250, 204, 21, 0.03);
  }
  &--error {
    color: #f87171; // Neon Red
    background: rgba(248, 113, 113, 0.05);
  }
}

.debug-log-time {
  color: rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.debug-log-tag {
  font-weight: bold;
  flex-shrink: 0;
  
  &--info { color: #38bdf8; }
  &--success { color: #22c55e; }
  &--warn { color: #eab308; }
  &--error { color: #ef4444; }
}

.debug-log-message {
  flex: 1;
}

// Buttons styles
.debug-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-family: sans-serif;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &--text {
    color: rgba(255, 255, 255, 0.5);
    &:hover { color: #ef4444; }
  }

  &--close {
    color: rgba(255, 255, 255, 0.5);
    font-size: 1.4rem;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: white;
    }
  }

  &--primary {
    background: rgba(212, 163, 89, 0.85);
    border: 1px solid rgba(212, 163, 89, 0.9);
    color: #0d0c0a;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 600;
    
    &:hover:not(:disabled) {
      background: rgba(212, 163, 89, 1);
      box-shadow: 0 0 12px rgba(212, 163, 89, 0.3);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

// Animations
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}

@keyframes pulse-green {
  0% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
  70% { box-shadow: 0 0 0 6px rgba(74, 222, 128, 0); }
  100% { box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
}
</style>
