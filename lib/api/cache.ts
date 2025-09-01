/**
 * Shared API cache and utilities for all entity hooks
 * This prevents code duplication and provides consistent caching behavior
 */

// Enhanced in-memory cache with proper TypeScript types
export class ApiCache {
  private cache = new Map<string, { 
    data: any; 
    timestamp: number; 
    ttl: number; 
  }>();

  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  invalidate(keyPattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Global cache instance
export const apiCache = new ApiCache();

// Pending requests for deduplication
export const pendingRequests = new Map<string, Promise<any>>();

// Enhanced fetch function with caching and request deduplication
export async function fetchWithCache<T>(
  url: string, 
  options?: RequestInit,
  cacheConfig?: { ttl?: number; skipCache?: boolean }
): Promise<T> {
  // Bust CDN/proxy caches when skipCache is set or GET requests should be fresh
  const isGet = !options?.method || options.method === 'GET';
  const forceFresh = cacheConfig?.skipCache === true;
  const urlWithBuster = isGet
    ? `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`
    : url;

  const cacheKey = `${url}-${JSON.stringify(options?.method || 'GET')}`;
  const { ttl = 5 * 60 * 1000, skipCache = false } = cacheConfig || {};
  
  // Check cache first (only for GET requests)
  if (!skipCache && isGet) {
    const cached = apiCache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  // Check for pending request (deduplication)
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey) as Promise<T>;
  }
  
  // Make the request with no-store semantics
  const request = fetch(urlWithBuster, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      ...options?.headers,
    },
    cache: 'no-store',
    ...options,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json() as Promise<T>;
    })
    .finally(() => {
      pendingRequests.delete(cacheKey);
    });
  
  pendingRequests.set(cacheKey, request);
  
  const data = await request;
  
  // Cache GET requests
  if (!skipCache && isGet) {
    apiCache.set(cacheKey, data, ttl);
  }
  
  return data;
}

// Common configuration interface
export interface UseEntityConfig {
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
}

// Utility to clear all cache (useful for logout, etc.)
export function clearAllCache() {
  apiCache.clear();
}

// Debug function to inspect cache state  
export function getAllCacheStats() {
  return apiCache.getStats();
}
