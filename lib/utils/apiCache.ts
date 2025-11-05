'use client';

/**
 * API Response Cache Utility
 * Mengurangi jumlah API calls dengan caching responses
 * 
 * Features:
 * - Memory-based cache untuk performa cepat
 * - TTL (Time-To-Live) untuk auto-invalidation
 * - Manual cache invalidation
 * - Cache key berdasarkan URL + query params
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class ApiCache {
  private cache: Map<string, CacheEntry> = new Map();
  
  /**
   * Generate cache key dari URL dan options
   */
  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Check jika cache entry masih valid
   */
  private isValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  /**
   * Fetch dengan caching
   * @param url - API endpoint URL
   * @param options - Fetch options
   * @param ttl - Time to live dalam milliseconds (default: 30 detik = 30000ms)
   * @param forceRefresh - Force refresh dari server, skip cache
   */
  async fetch(
    url: string,
    options?: RequestInit,
    ttl: number = 30000, // Default 30 detik
    forceRefresh: boolean = false
  ): Promise<Response> {
    const cacheKey = this.getCacheKey(url, options);
    
    // Jika tidak force refresh dan cache masih valid, return cached data
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const entry = this.cache.get(cacheKey)!;
      if (this.isValid(entry)) {
        // Return response-like object dari cache
        return new Response(JSON.stringify(entry.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Cache expired, remove it
        this.cache.delete(cacheKey);
      }
    }

    // Fetch dari server
    const response = await fetch(url, options);
    
    // Only cache successful GET requests
    if (response.ok && (!options?.method || options.method === 'GET')) {
      try {
        const data = await response.clone().json(); // Clone response untuk cache
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl
        });
      } catch (error) {
        // Jika response bukan JSON, skip caching
        console.warn('Failed to cache non-JSON response:', url);
      }
    }

    return response;
  }

  /**
   * Clear cache untuk specific URL atau all cache
   */
  clear(url?: string, options?: RequestInit): void {
    if (url) {
      const cacheKey = this.getCacheKey(url, options);
      this.cache.delete(cacheKey);
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpired(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache size (number of entries)
   */
  getSize(): number {
    return this.cache.size;
  }
}

// Singleton instance
const apiCache = new ApiCache();

// Auto-cleanup expired entries setiap 1 menit
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.clearExpired();
  }, 60000); // Every 1 minute
}

export default apiCache;

/**
 * Helper function untuk cached fetch dengan auto JSON parsing
 */
export async function cachedFetch(
  url: string,
  options?: RequestInit,
  ttl?: number,
  forceRefresh?: boolean
): Promise<any> {
  const response = await apiCache.fetch(url, options, ttl, forceRefresh);
  return response.json();
}

