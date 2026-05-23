// ============================================================================
// useAntiInspect — production-only anti-inspection guard.
//
// Wires up the typical "streaming site" deterrents:
//   - Right-click context menu disabled
//   - DevTools keyboard shortcuts blocked (F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U, Ctrl/Cmd+S)
//   - DevTools detection via window inner/outer size delta
//   - `debugger` trap on a recurring interval (freezes execution while DevTools is open)
//   - console.* muted + periodic console.clear()
//   - text selection / drag / copy events suppressed
//
// Only runs when `import.meta.env.PROD` is true so dev experience stays usable.
// This is *deterrence*, not security — anyone determined can still bypass it
// by disabling JS, using a proxy, or pulling the bundle directly.
// ============================================================================

const THRESHOLD = 160;
const TICK_MS = 1000;
const NOOP = () => {};

let installed = false;
let intervalId: number | null = null;
let listeners: Array<{ target: EventTarget; type: string; handler: any; opts?: any }> = [];

const shouldGuard = () => {
    // Always guard in production
    if (import.meta.env.PROD) return true;
    // In dev, check if VITE_ANTI_INSPECT is explicitly enabled
    return import.meta.env.VITE_ANTI_INSPECT === '1';
};

const swallow = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
};

const isBlockedKey = (e: KeyboardEvent): boolean => {
    // F12 - DevTools
    if (e.key === 'F12') return true;
    
    // F1-F11 (optional - can be too aggressive)
    // if (e.key.startsWith('F') && e.key.length <= 3) return true;
    
    const meta = e.ctrlKey || e.metaKey;
    if (!meta) return false;
    
    const k = (e.key || '').toUpperCase();
    
    // Ctrl/Cmd + Shift + I/J/C (DevTools)
    if (e.shiftKey && (k === 'I' || k === 'J' || k === 'C')) return true;
    
    // Ctrl/Cmd + U (View Source)
    if (k === 'U') return true;
    
    // Ctrl/Cmd + S (Save Page)
    if (k === 'S') return true;
    
    // Ctrl/Cmd + P (Print - can reveal source)
    if (k === 'P') return true;
    
    // Ctrl/Cmd + Shift + K (Firefox Console)
    if (e.shiftKey && k === 'K') return true;
    
    // Ctrl/Cmd + Shift + M (Responsive Design Mode)
    if (e.shiftKey && k === 'M') return true;
    
    // Ctrl/Cmd + Shift + E (Network Panel in Firefox)
    if (e.shiftKey && k === 'E') return true;
    
    // Ctrl/Cmd + Option/Alt + I (Safari DevTools)
    if (e.altKey && k === 'I') return true;
    
    // Ctrl/Cmd + Option/Alt + J (Chrome DevTools)
    if (e.altKey && k === 'J') return true;
    
    // Ctrl/Cmd + Option/Alt + C (Inspect Element)
    if (e.altKey && k === 'C') return true;
    
    return false;
};

const onKeyDown = (e: KeyboardEvent) => {
    if (isBlockedKey(e)) {
        e.preventDefault();
        e.stopPropagation();
    }
};

const lockScreen = () => {
    if (typeof document === 'undefined') return;
    if (document.body.classList.contains('lm-locked')) return;
    document.body.classList.add('lm-locked');

    const overlay = document.createElement('div');
    overlay.className = 'lm-lock-overlay';
    overlay.setAttribute('role', 'alert');
    overlay.innerHTML = `
        <div class="lm-lock-overlay__panel">
            <p class="lm-lock-overlay__eyebrow">Closed Set</p>
            <h2 class="lm-lock-overlay__title">Inspection paused</h2>
            <p class="lm-lock-overlay__copy">
                Developer tools were detected. Close them and reload to continue.
            </p>
        </div>
    `;
    document.body.appendChild(overlay);
};

const unlockScreen = () => {
    if (typeof document === 'undefined') return;
    document.body.classList.remove('lm-locked');
    document.querySelectorAll('.lm-lock-overlay').forEach(n => n.remove());
};

// Mobile browsers (notably iOS Chrome) report a large outer/inner height
// delta because of the floating address bar, which trips the size heuristic.
// DevTools also can't be opened the conventional way on touch devices, so
// skip the lock there entirely.
const isTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    if ('ontouchstart' in window) return true;
    if ((navigator as any).maxTouchPoints > 0) return true;
    if (window.matchMedia?.('(pointer: coarse)').matches) return true;
    return false;
};

let wasOpen = false;
const detectDevTools = () => {
    if (isTouchDevice()) return;
    
    // Method 1: Window size delta detection
    const widthDelta = window.outerWidth - window.innerWidth;
    const heightDelta = window.outerHeight - window.innerHeight;
    const sizeOpen = widthDelta > THRESHOLD || heightDelta > THRESHOLD;
    
    // Method 2: Console.log timing detection
    let timingOpen = false;
    const start = performance.now();
    // eslint-disable-next-line no-console
    console.profile?.('check');
    // eslint-disable-next-line no-console
    console.profileEnd?.('check');
    const elapsed = performance.now() - start;
    if (elapsed > 100) timingOpen = true;
    
    // Method 3: toString override detection
    let toStringOpen = false;
    const element = new Image();
    Object.defineProperty(element, 'id', {
        get: function() {
            toStringOpen = true;
            return 'detect';
        }
    });
    // eslint-disable-next-line no-console
    console.dir?.(element);
    
    // Method 4: Firebug detection (legacy but still useful)
    const firebugOpen = !!(window as any).console?.firebug;
    
    // Method 5: Chrome DevTools detection via console.table
    let tableOpen = false;
    const before = new Date().getTime();
    // eslint-disable-next-line no-console
    console.table?.([]);
    const after = new Date().getTime();
    if (after - before > 10) tableOpen = true;
    
    const open = sizeOpen || timingOpen || toStringOpen || firebugOpen || tableOpen;
    
    if (open && !wasOpen) {
        wasOpen = true;
        lockScreen();
    } else if (!open && wasOpen) {
        wasOpen = false;
        unlockScreen();
    }
};

// Toggling a `debugger` line every tick freezes execution as long as DevTools
// is open. With DevTools closed, the V8/JSCore engine treats it as a no-op.
const debuggerTrap = () => {
    // eslint-disable-next-line no-debugger
    debugger;
};

const muteConsole = () => {
    if (typeof console === 'undefined') return;
    const methods: Array<keyof Console> = [
        'log', 'info', 'warn', 'error', 'debug', 'trace',
        'table', 'dir', 'dirxml', 'group', 'groupCollapsed', 'groupEnd'
    ];
    methods.forEach(m => {
        try { (console as any)[m] = NOOP; } catch { /* ignore */ }
    });
};

const addListener = (target: EventTarget, type: string, handler: any, opts?: any) => {
    target.addEventListener(type, handler, opts);
    listeners.push({ target, type, handler, opts });
};

export function installAntiInspect() {
    if (installed) return;
    if (typeof window === 'undefined') return;
    if (!shouldGuard()) return;
    installed = true;

    // Block right-click context menu
    addListener(document, 'contextmenu', swallow);
    
    // Block keyboard shortcuts
    addListener(document, 'keydown', onKeyDown, { capture: true });
    addListener(document, 'keyup', onKeyDown, { capture: true });
    
    // Block text selection and copying
    addListener(document, 'selectstart', swallow);
    addListener(document, 'copy', swallow);
    addListener(document, 'cut', swallow);
    addListener(document, 'paste', swallow);
    addListener(document, 'dragstart', swallow);
    
    // Block mouse events that could be used for inspection
    addListener(document, 'mousedown', (e: MouseEvent) => {
        // Block middle mouse button (often used to open in new tab)
        if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
        }
    });
    
    // Disable text selection via CSS (backup)
    const style = document.createElement('style');
    style.id = 'anti-inspect-styles';
    style.textContent = `
        * {
            -webkit-user-select: none !important;
            -moz-user-select: none !important;
            -ms-user-select: none !important;
            user-select: none !important;
        }
        input, textarea {
            -webkit-user-select: text !important;
            -moz-user-select: text !important;
            -ms-user-select: text !important;
            user-select: text !important;
        }
    `;
    document.head.appendChild(style);

    // Mute console
    muteConsole();
    
    // Prevent iframe inspection
    try {
        Object.defineProperty(window, 'frameElement', {
            get: () => null,
            configurable: false
        });
    } catch { /* ignore */ }
    
    // Detect DevTools via toString override
    const detectToString = () => {
        const element = document.createElement('div');
        Object.defineProperty(element, 'id', {
            get: function() {
                lockScreen();
                return 'devtools-detected';
            }
        });
        // eslint-disable-next-line no-console
        console.log('%c', element);
    };
    
    // Prevent source viewing via data URIs
    addListener(window, 'beforeunload', (e: BeforeUnloadEvent) => {
        if (document.activeElement?.tagName === 'IFRAME') {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    // Main detection interval
    intervalId = window.setInterval(() => {
        try { console.clear(); } catch { /* ignore */ }
        detectDevTools();
        debuggerTrap();
        detectToString();
    }, TICK_MS);
    
    // Additional rapid detection for faster response
    const rapidInterval = window.setInterval(() => {
        debuggerTrap();
    }, 100);
    
    // Store rapid interval for cleanup
    (window as any).__rapidAntiInspectInterval = rapidInterval;
    
    // Detect DevTools via performance timing
    const checkPerformance = () => {
        const start = performance.now();
        // eslint-disable-next-line no-debugger
        debugger;
        const end = performance.now();
        if (end - start > 100) {
            lockScreen();
        }
    };
    
    // Run performance check periodically
    const perfInterval = window.setInterval(checkPerformance, 2000);
    (window as any).__perfAntiInspectInterval = perfInterval;
}

export function uninstallAntiInspect() {
    if (!installed) return;
    installed = false;

    if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
    }
    
    // Clear rapid interval
    if ((window as any).__rapidAntiInspectInterval) {
        window.clearInterval((window as any).__rapidAntiInspectInterval);
        delete (window as any).__rapidAntiInspectInterval;
    }
    
    // Clear performance interval
    if ((window as any).__perfAntiInspectInterval) {
        window.clearInterval((window as any).__perfAntiInspectInterval);
        delete (window as any).__perfAntiInspectInterval;
    }
    
    listeners.forEach(({ target, type, handler, opts }) => {
        target.removeEventListener(type, handler, opts);
    });
    listeners = [];
    
    // Remove injected styles
    document.getElementById('anti-inspect-styles')?.remove();
    
    unlockScreen();
}
