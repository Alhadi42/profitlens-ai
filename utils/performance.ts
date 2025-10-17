// Performance monitoring utility
export const performanceMonitor = {
  startTime: new Map<string, number>(),
  
  start(label: string) {
    this.startTime.set(label, performance.now());
  },
  
  end(label: string) {
    const start = this.startTime.get(label);
    if (start) {
      const duration = performance.now() - start;
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
      this.startTime.delete(label);
      return duration;
    }
    return 0;
  },
  
  measure<T>(label: string, fn: () => T): T {
    this.start(label);
    const result = fn();
    this.end(label);
    return result;
  }
};

// Debounce utility for search and input optimization
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle utility for scroll and resize events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memory usage monitoring
export const memoryMonitor = {
  log() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      console.log('🧠 Memory Usage:', {
        used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
      });
    }
  }
};

// Local storage with error handling
export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('LocalStorage getItem failed:', error);
      return null;
    }
  },
  
  setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('LocalStorage setItem failed:', error);
      return false;
    }
  },
  
  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('LocalStorage removeItem failed:', error);
      return false;
    }
  }
};