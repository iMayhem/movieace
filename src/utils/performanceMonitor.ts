/**
 * Performance Monitoring Utilities
 * Track and report Web Vitals and custom metrics
 */

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

/**
 * Get First Contentful Paint (FCP)
 */
export function getFCP(): Promise<PerformanceMetric | null> {
  return new Promise((resolve) => {
    if (!('PerformanceObserver' in window)) {
      resolve(null);
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
      
      if (fcpEntry) {
        const value = fcpEntry.startTime;
        resolve({
          name: 'FCP',
          value,
          rating: value < 1800 ? 'good' : value < 3000 ? 'needs-improvement' : 'poor',
          timestamp: Date.now()
        });
        observer.disconnect();
      }
    });

    observer.observe({ entryTypes: ['paint'] });

    // Timeout after 10 seconds
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 10000);
  });
}

/**
 * Get Largest Contentful Paint (LCP)
 */
export function getLCP(): Promise<PerformanceMetric | null> {
  return new Promise((resolve) => {
    if (!('PerformanceObserver' in window)) {
      resolve(null);
      return;
    }

    let lcpValue = 0;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as any;
      lcpValue = lastEntry.renderTime || lastEntry.loadTime;
    });

    observer.observe({ entryTypes: ['largest-contentful-paint'] });

    // Report after page is fully loaded
    window.addEventListener('load', () => {
      setTimeout(() => {
        observer.disconnect();
        resolve({
          name: 'LCP',
          value: lcpValue,
          rating: lcpValue < 2500 ? 'good' : lcpValue < 4000 ? 'needs-improvement' : 'poor',
          timestamp: Date.now()
        });
      }, 0);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      observer.disconnect();
      if (lcpValue > 0) {
        resolve({
          name: 'LCP',
          value: lcpValue,
          rating: lcpValue < 2500 ? 'good' : lcpValue < 4000 ? 'needs-improvement' : 'poor',
          timestamp: Date.now()
        });
      } else {
        resolve(null);
      }
    }, 10000);
  });
}

/**
 * Get First Input Delay (FID)
 */
export function getFID(): Promise<PerformanceMetric | null> {
  return new Promise((resolve) => {
    if (!('PerformanceObserver' in window)) {
      resolve(null);
      return;
    }

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const firstInput = entries[0] as any;
      
      if (firstInput) {
        const value = firstInput.processingStart - firstInput.startTime;
        resolve({
          name: 'FID',
          value,
          rating: value < 100 ? 'good' : value < 300 ? 'needs-improvement' : 'poor',
          timestamp: Date.now()
        });
        observer.disconnect();
      }
    });

    observer.observe({ entryTypes: ['first-input'] });

    // Timeout after 30 seconds
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, 30000);
  });
}

/**
 * Get Cumulative Layout Shift (CLS)
 */
export function getCLS(): Promise<PerformanceMetric | null> {
  return new Promise((resolve) => {
    if (!('PerformanceObserver' in window)) {
      resolve(null);
      return;
    }

    let clsValue = 0;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
    });

    observer.observe({ entryTypes: ['layout-shift'] });

    // Report after page is fully loaded
    window.addEventListener('load', () => {
      setTimeout(() => {
        observer.disconnect();
        resolve({
          name: 'CLS',
          value: clsValue,
          rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
          timestamp: Date.now()
        });
      }, 0);
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      observer.disconnect();
      resolve({
        name: 'CLS',
        value: clsValue,
        rating: clsValue < 0.1 ? 'good' : clsValue < 0.25 ? 'needs-improvement' : 'poor',
        timestamp: Date.now()
      });
    }, 10000);
  });
}

/**
 * Get Time to Interactive (TTI)
 */
export function getTTI(): Promise<PerformanceMetric | null> {
  return new Promise((resolve) => {
    if (!('performance' in window)) {
      resolve(null);
      return;
    }

    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.timing;
        const value = timing.domInteractive - timing.navigationStart;
        
        resolve({
          name: 'TTI',
          value,
          rating: value < 3800 ? 'good' : value < 7300 ? 'needs-improvement' : 'poor',
          timestamp: Date.now()
        });
      }, 0);
    });

    // Timeout after 10 seconds
    setTimeout(() => resolve(null), 10000);
  });
}

/**
 * Report all Web Vitals
 */
export async function reportWebVitals(
  callback?: (metric: PerformanceMetric) => void
): Promise<void> {
  if (import.meta.env.PROD) {
    // Only report in production
    const metrics = await Promise.all([
      getFCP(),
      getLCP(),
      getFID(),
      getCLS(),
      getTTI()
    ]);

    metrics.forEach(metric => {
      if (metric && callback) {
        callback(metric);
      }
    });
  }
}

/**
 * Measure custom performance mark
 */
export function measurePerformance(
  name: string,
  startMark?: string,
  endMark?: string
): number | null {
  if (!('performance' in window)) return null;

  try {
    if (startMark && endMark) {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0];
      return measure.duration;
    } else {
      const mark = performance.getEntriesByName(name)[0];
      return mark ? mark.startTime : null;
    }
  } catch (e) {
    return null;
  }
}

/**
 * Create performance mark
 */
export function markPerformance(name: string): void {
  if ('performance' in window && 'mark' in performance) {
    performance.mark(name);
  }
}

/**
 * Log performance metrics to console (dev only)
 */
export function logPerformanceMetrics(): void {
  if (import.meta.env.DEV) {
    reportWebVitals((metric) => {
      console.log(`[Performance] ${metric.name}:`, {
        value: `${metric.value.toFixed(2)}ms`,
        rating: metric.rating
      });
    });
  }
}
