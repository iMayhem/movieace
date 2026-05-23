/** Paths that stay on the main site (static assets, API, party lobby). */
const BYPASS_PREFIXES = ['/api/', '/party', '/favicon', '/player.html'];

export function isBypassPath(pathname: string): boolean {
    if (BYPASS_PREFIXES.some(p => pathname === p || pathname.startsWith(p))) return true;
    if (/\.[a-z0-9]+$/i.test(pathname)) return true;
    return false;
}

export function isMobileAppPath(pathname: string): boolean {
    return pathname === '/m' || pathname.startsWith('/m/');
}

/** Map a desktop path to its /m equivalent. */
export function toMobilePath(pathname: string, search = '', hash = ''): string {
    if (isBypassPath(pathname) || isMobileAppPath(pathname)) {
        return `${pathname}${search}${hash}`;
    }
    const rest = pathname === '/' ? '' : pathname;
    return `/m${rest}${search}${hash}`;
}

/** Map an /m path back to desktop. */
export function toDesktopPath(pathname: string, search = '', hash = ''): string {
    if (!isMobileAppPath(pathname)) {
        return `${pathname}${search}${hash}`;
    }
    const rest = pathname === '/m' ? '/' : pathname.slice(2) || '/';
    return `${rest}${search}${hash}`;
}
