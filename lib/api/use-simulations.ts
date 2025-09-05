'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiCache, fetchWithCache, UseEntityConfig } from './cache';
import { Simulation } from '../types';

export interface CreateSimulationData {
  projectId: string;
  drawingId: string;
  entities: any;
}

export interface UpdateSimulationData {
  status?: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  error?: string;
  result?: any;
}

export interface UseSimulationsConfig extends UseEntityConfig {}

// Main simulations hook with enhanced caching
export function useSimulations(config: UseSimulationsConfig = {}, queryParams?: { projectId?: string; drawingId?: string; limit?: number }) {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSimulations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const searchParams = new URLSearchParams();
      if (queryParams?.projectId) searchParams.append('projectId', queryParams.projectId.toString());
      if (queryParams?.drawingId) searchParams.append('drawingId', queryParams.drawingId.toString());
      if (queryParams?.limit) searchParams.append('limit', queryParams.limit.toString());
      
      const url = `/api/simulations${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const data = await fetchWithCache<Simulation[]>(url, undefined, {
        ttl: config.cacheTime,
        skipCache: true, // always fetch fresh on refetch and to avoid stale caches
      });
      setSimulations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [config.cacheTime, queryParams?.projectId, queryParams?.drawingId, queryParams?.limit]);

  useEffect(() => {
    fetchSimulations();

    // Optional refetch interval
    if (config.refetchInterval) {
      const interval = setInterval(fetchSimulations, config.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchSimulations, config.refetchInterval]);

  // Optional refetch on window focus
  useEffect(() => {
    if (config.refetchOnWindowFocus) {
      const handleFocus = () => {
        fetchSimulations();
      };
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [fetchSimulations, config.refetchOnWindowFocus]);

  const invalidateCache = useCallback(() => {
    apiCache.invalidate('simulations');
  }, []);

  return {
    simulations,
    loading,
    error,
    refetch: fetchSimulations,
    invalidateCache,
  };
}

// Single simulation hook
export function useSimulation(id: number | null, config: UseSimulationsConfig = {}) {
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSimulation = useCallback(async () => {
    if (!id) {
      setSimulation(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchWithCache<Simulation>(`/api/simulations/${id}`, undefined, {
        ttl: config.cacheTime,
        skipCache: true,
      });
      setSimulation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [id, config.cacheTime]);

  useEffect(() => {
    fetchSimulation();
  }, [fetchSimulation]);

  return {
    simulation,
    loading,
    error,
    refetch: fetchSimulation,
  };
}

// Enhanced mutations with cache management
export function useSimulationMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSimulation = async (data: CreateSimulationData): Promise<Simulation> => {
    try {
      setLoading(true);
      setError(null);
      
      const newSimulation = await fetchWithCache<Simulation>('/api/simulations', {
        method: 'POST',
        body: JSON.stringify(data),
      }, { skipCache: true });
      
      // Invalidate simulations cache
      apiCache.invalidate('simulations');
      
      return newSimulation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateSimulation = async (id: number, data: UpdateSimulationData): Promise<Simulation> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedSimulation = await fetchWithCache<Simulation>(`/api/simulations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, { skipCache: true });
      
      // Invalidate related caches
      apiCache.invalidate('simulations');
      apiCache.invalidate(`simulations/${id}`);
      
      return updatedSimulation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteSimulation = async (id: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await fetchWithCache(`/api/simulations/${id}`, {
        method: 'DELETE',
      }, { skipCache: true });
      
      // Invalidate related caches
      apiCache.invalidate('simulations');
      apiCache.invalidate(`simulations/${id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createSimulation,
    updateSimulation,
    deleteSimulation,
    loading,
    error,
  };
}

// Combined hook for convenience
export function useSimulationsWithMutations(config: UseSimulationsConfig = {}, queryParams?: { projectId?: string; drawingId?: string; limit?: number }) {
  const { simulations, loading, error, refetch, invalidateCache } = useSimulations(config, queryParams);
  const mutations = useSimulationMutations();

  const createSimulation = async (data: CreateSimulationData): Promise<Simulation> => {
    const result = await mutations.createSimulation(data);
    refetch(); // Refresh the list
    return result;
  };

  const updateSimulation = async (id: number, data: UpdateSimulationData): Promise<Simulation> => {
    const result = await mutations.updateSimulation(id, data);
    refetch(); // Refresh the list
    return result;
  };

  const deleteSimulation = async (id: number): Promise<void> => {
    await mutations.deleteSimulation(id);
    refetch(); // Refresh the list
  };

  return {
    simulations,
    loading,
    error,
    mutationLoading: mutations.loading,
    refetch,
    invalidateCache,
    createSimulation,
    updateSimulation,
    deleteSimulation,
  };
}

// Utility function to clear all cache (useful for logout, etc.)
export function clearSimulationsCache() {
  apiCache.clear();
}

// Debug function to inspect cache state
export function getSimulationsCacheStats() {
  return apiCache.getStats();
}
