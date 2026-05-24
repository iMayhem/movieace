/**
 * Image Optimization Utilities
 * Provides lazy loading, WebP conversion, and responsive image handling
 */

interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  blur?: number;
}

/**
 * Generate optimized image URL using wsrv.nl
 */
export function getOptimizedImageUrl(
  originalUrl: string,
  options: ImageOptions = {}
): string {
  if (!originalUrl) return '';
  
  // If already a full URL from external source, use it directly
  if (originalUrl.startsWith('http') && !originalUrl.includes('tmdb.org')) {
    return originalUrl;
  }

  const {
    width,
    height,
    quality = 85,
    format = 'webp',
    blur
  } = options;

  // Build wsrv.nl URL
  const params = new URLSearchParams();
  
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  params.set('output', format);
  params.set('q', quality.toString());
  if (blur) params.set('blur', blur.toString());
  
  // Handle TMDB images
  if (originalUrl.includes('tmdb.org') || originalUrl.startsWith('/')) {
    const tmdbUrl = originalUrl.startsWith('http') 
      ? originalUrl 
      : `https://image.tmdb.org/t/p/original${originalUrl}`;
    params.set('url', tmdbUrl);
  } else {
    params.set('url', originalUrl);
  }

  return `https://wsrv.nl/?${params.toString()}`;
}

/**
 * Generate srcset for responsive images
 */
export function generateSrcSet(
  originalUrl: string,
  widths: number[] = [320, 640, 960, 1280, 1920]
): string {
  return widths
    .map(width => `${getOptimizedImageUrl(originalUrl, { width })} ${width}w`)
    .join(', ');
}

/**
 * Lazy load image with Intersection Observer
 */
export function lazyLoadImage(
  img: HTMLImageElement,
  src: string,
  options: IntersectionObserverInit = {}
): () => void {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLImageElement;
        target.src = src;
        target.classList.add('loaded');
        observer.unobserve(target);
      }
    });
  }, {
    rootMargin: '50px',
    threshold: 0.01,
    ...options
  });

  observer.observe(img);

  // Return cleanup function
  return () => observer.disconnect();
}

/**
 * Preload critical images
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Generate blur placeholder data URL
 */
export function getBlurPlaceholder(
  originalUrl: string,
  width: number = 20
): string {
  return getOptimizedImageUrl(originalUrl, {
    width,
    quality: 10,
    blur: 5
  });
}

/**
 * Check if WebP is supported
 */
export function isWebPSupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }
  return false;
}

/**
 * Debounced image loader for scroll performance
 */
export function createDebouncedImageLoader(delay: number = 100) {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (callback: () => void) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(callback, delay);
  };
}
