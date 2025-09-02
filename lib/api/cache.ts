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
  const cacheKey = `${url}-${JSON.stringify(options?.method || 'GET')}`;
  const { ttl = 5 * 60 * 1000, skipCache = false } = cacheConfig || {};
  
  // Check cache first (only for GET requests)
  if (!skipCache && (!options?.method || options.method === 'GET')) {
    const cached = apiCache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }
  
  // Check for pending request (deduplication)
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }
  
  // Make the request
  const request = fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .finally(() => {
      pendingRequests.delete(cacheKey);
    });
  
  pendingRequests.set(cacheKey, request);
  
  const data = await request;
  
  // Cache GET requests
  if (!skipCache && (!options?.method || options.method === 'GET')) {
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
