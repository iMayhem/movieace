const MOBILE_UA =
    /Android|webOS|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile/i;

const TABLET_UA = /iPad|Tablet|tablet|PlayBook|Silk/i;

const TABLET_MAX_WIDTH = 1024;

export type DevicePreference = 'auto' | 'mobile' | 'desktop';

const PREF_KEY = 'movieace-device-pref';

export function getStoredDevicePreference(): DevicePreference {
    if (typeof localStorage === 'undefined') return 'auto';
    const raw = localStorage.getItem(PREF_KEY);
    if (raw === 'mobile' || raw === 'desktop') return raw;
    return 'auto';
}

export function setStoredDevicePreference(pref: DevicePreference): void {
    if (typeof localStorage === 'undefined') return;
    if (pref === 'auto') localStorage.removeItem(PREF_KEY);
    else localStorage.setItem(PREF_KEY, pref);
}

/** Query override: ?mobile=1 or ?desktop=1 */
export function preferenceFromQuery(search: string): DevicePreference | null {
    const params = new URLSearchParams(search);
    if (params.has('mobile')) return 'mobile';
    if (params.has('desktop')) return 'desktop';
    return null;
}

export function isTouchDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error legacy IE
        (navigator.msMaxTouchPoints ?? 0) > 0
    );
}

export function isNarrowViewport(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${TABLET_MAX_WIDTH}px)`).matches;
}

/** True for phones, tablets, and touch laptops under tablet breakpoint. */
export function isMobileOrTabletUserAgent(ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
    if (MOBILE_UA.test(ua) || TABLET_UA.test(ua)) return true;
    // iPadOS 13+ may report as Macintosh
    if (/Macintosh/i.test(ua) && isTouchDevice() && isNarrowViewport()) return true;
    return isTouchDevice() && isNarrowViewport();
}

export function shouldUseMobileSite(search = typeof location !== 'undefined' ? location.search : ''): boolean {
    const fromQuery = preferenceFromQuery(search);
    if (fromQuery === 'mobile') return true;
    if (fromQuery === 'desktop') return false;

    const stored = getStoredDevicePreference();
    if (stored === 'mobile') return true;
    if (stored === 'desktop') return false;

    return isMobileOrTabletUserAgent();
}
