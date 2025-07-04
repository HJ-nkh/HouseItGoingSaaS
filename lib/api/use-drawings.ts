'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiCache, fetchWithCache, UseEntityConfig } from './cache';
import { Drawing } from '../types';

export interface CreateDrawingData {
  projectId: string;
  title: string;
  history: any;
  hasChanges?: boolean;
  isTemplate?: boolean;
}

export interface UpdateDrawingData {
  title?: string;
  history?: any;
  hasChanges?: boolean;
  isTemplate?: boolean;
}

export interface UseDrawingsConfig extends UseEntityConfig {}

// Main drawings hook with enhanced caching
export function useDrawings(config: UseDrawingsConfig = {}, queryParams?: { projectId?: number }) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrawings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const searchParams = new URLSearchParams();
      if (queryParams?.projectId) searchParams.append('projectId', queryParams.projectId.toString());
      
      const url = `/api/drawings${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const data = await fetchWithCache<Drawing[]>(url, undefined, {
        ttl: config.cacheTime,
      });
      setDrawings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [config.cacheTime, queryParams?.projectId]);

  useEffect(() => {
    fetchDrawings();

    // Optional refetch interval
    if (config.refetchInterval) {
      const interval = setInterval(fetchDrawings, config.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchDrawings, config.refetchInterval]);

  // Optional refetch on window focus
  useEffect(() => {
    if (config.refetchOnWindowFocus) {
      const handleFocus = () => {
        fetchDrawings();
      };
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [fetchDrawings, config.refetchOnWindowFocus]);

  const invalidateCache = useCallback(() => {
    apiCache.invalidate('drawings');
  }, []);

  return {
    drawings,
    loading,
    error,
    refetch: fetchDrawings,
    invalidateCache,
  };
}

// Single drawing hook
export function useDrawing(id: string | null, config: UseDrawingsConfig = {}) {
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrawing = useCallback(async () => {
    if (!id) {
      setDrawing(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchWithCache<Drawing>(`/api/drawings/${id}`, undefined, {
        ttl: config.cacheTime,
      });
      setDrawing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [id, config.cacheTime]);

  useEffect(() => {
    fetchDrawing();
  }, [fetchDrawing]);

  return {
    drawing,
    loading,
    error,
    refetch: fetchDrawing,
  };
}

// Enhanced mutations with cache management
export function useDrawingMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDrawing = async (data: CreateDrawingData): Promise<Drawing> => {
    try {
      setLoading(true);
      setError(null);
      
      const newDrawing = await fetchWithCache<Drawing>('/api/drawings', {
        method: 'POST',
        body: JSON.stringify(data),
      }, { skipCache: true });
      
      // Invalidate drawings cache
      apiCache.invalidate('drawings');
      
      return newDrawing;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateDrawing = async (id: string, data: UpdateDrawingData): Promise<Drawing> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedDrawing = await fetchWithCache<Drawing>(`/api/drawings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, { skipCache: true });
      
      // Invalidate related caches
      apiCache.invalidate('drawings');
      apiCache.invalidate(`drawings/${id}`);
      
      return updatedDrawing;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteDrawing = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await fetchWithCache(`/api/drawings/${id}`, {
        method: 'DELETE',
      }, { skipCache: true });
      
      // Invalidate related caches
      apiCache.invalidate('drawings');
      apiCache.invalidate(`drawings/${id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createDrawing,
    updateDrawing,
    deleteDrawing,
    loading,
    error,
  };
}

// Combined hook for convenience
export function useDrawingsWithMutations(config: UseDrawingsConfig = {}, queryParams?: { projectId?: number }) {
  const { drawings, loading, error, refetch, invalidateCache } = useDrawings(config, queryParams);
  const mutations = useDrawingMutations();

  const createDrawing = async (data: CreateDrawingData): Promise<Drawing> => {
    const result = await mutations.createDrawing(data);
    refetch(); // Refresh the list
    return result;
  };

  const updateDrawing = async (id: string, data: UpdateDrawingData): Promise<Drawing> => {
    const result = await mutations.updateDrawing(id, data);
    refetch(); // Refresh the list
    return result;
  };

  const deleteDrawing = async (id: string): Promise<void> => {
    await mutations.deleteDrawing(id);
    refetch(); // Refresh the list
  };

  return {
    drawings,
    loading,
    error,
    mutationLoading: mutations.loading,
    refetch,
    invalidateCache,
    createDrawing,
    updateDrawing,
    deleteDrawing,
  };
}

// Utility function to clear all cache (useful for logout, etc.)
export function clearDrawingsCache() {
  apiCache.clear();
}

// Debug function to inspect cache state
export function getDrawingsCacheStats() {
  return apiCache.getStats();
}
