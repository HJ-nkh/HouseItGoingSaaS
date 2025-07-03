'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiCache, fetchWithCache, UseEntityConfig } from './cache';
import { Report } from '../types';

export interface CreateReportData {
  simulationId: string;
}

export interface UpdateReportData {
  title?: string;
}

export interface UseReportsConfig extends UseEntityConfig {}

// Main reports hook with enhanced caching
export function useReports(config: UseReportsConfig = {}, queryParams?: { projectId?: string; drawingId?: string; simulationId?: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const searchParams = new URLSearchParams();
      if (queryParams?.projectId) searchParams.append('projectId', queryParams.projectId.toString());
      if (queryParams?.drawingId) searchParams.append('drawingId', queryParams.drawingId.toString());
      if (queryParams?.simulationId) searchParams.append('simulationId', queryParams.simulationId.toString());
      
      const url = `/api/reports${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
      const data = await fetchWithCache<Report[]>(url, undefined, {
        ttl: config.cacheTime,
      });
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [config.cacheTime, queryParams?.projectId, queryParams?.drawingId, queryParams?.simulationId]);

  useEffect(() => {
    fetchReports();

    // Optional refetch interval
    if (config.refetchInterval) {
      const interval = setInterval(fetchReports, config.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchReports, config.refetchInterval]);

  // Optional refetch on window focus
  useEffect(() => {
    if (config.refetchOnWindowFocus) {
      const handleFocus = () => {
        fetchReports();
      };
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [fetchReports, config.refetchOnWindowFocus]);

  const invalidateCache = useCallback(() => {
    apiCache.invalidate('reports');
  }, []);

  return {
    reports,
    loading,
    error,
    refetch: fetchReports,
    invalidateCache,
  };
}

// Single report hook
export function useReport(id: string | null, config: UseReportsConfig = {}) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    if (!id) {
      setReport(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchWithCache<Report>(`/api/reports/${id}`, undefined, {
        ttl: config.cacheTime,
      });
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [id, config.cacheTime]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return {
    report,
    loading,
    error,
    refetch: fetchReport,
  };
}

// Enhanced mutations with cache management
export function useReportMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createReport = async (data: CreateReportData): Promise<Report> => {
    try {
      setLoading(true);
      setError(null);
      
      const newReport = await fetchWithCache<Report>('/api/reports', {
        method: 'POST',
        body: JSON.stringify(data),
      }, { skipCache: true });
      
      // Invalidate reports cache
      apiCache.invalidate('reports');
      
      return newReport;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateReport = async (id: string, data: UpdateReportData): Promise<Report> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedReport = await fetchWithCache<Report>(`/api/reports/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, { skipCache: true });
      
      // Invalidate related caches
      apiCache.invalidate('reports');
      apiCache.invalidate(`reports/${id}`);
      
      return updatedReport;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await fetchWithCache(`/api/reports/${id}`, {
        method: 'DELETE',
      }, { skipCache: true });
      
      // Invalidate related caches
      apiCache.invalidate('reports');
      apiCache.invalidate(`reports/${id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Special function for generating download URLs
  const getDownloadUrl = async (id: string): Promise<{ downloadUrl: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await fetchWithCache<{ downloadUrl: string }>(`/api/reports/${id}/download-url`, undefined, {
        skipCache: true, // Don't cache download URLs as they may expire
      });
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createReport,
    updateReport,
    deleteReport,
    getDownloadUrl,
    loading,
    error,
  };
}

// Combined hook for convenience
export function useReportsWithMutations(config: UseReportsConfig = {}, queryParams?: { projectId?: string; drawingId?: string; simulationId?: string }) {
  const { reports, loading, error, refetch, invalidateCache } = useReports(config, queryParams);
  const mutations = useReportMutations();

  const createReport = async (data: CreateReportData): Promise<Report> => {
    const result = await mutations.createReport(data);
    refetch(); // Refresh the list
    return result;
  };

  const updateReport = async (id: string, data: UpdateReportData): Promise<Report> => {
    const result = await mutations.updateReport(id, data);
    refetch(); // Refresh the list
    return result;
  };

  const deleteReport = async (id: string): Promise<void> => {
    await mutations.deleteReport(id);
    refetch(); // Refresh the list
  };

  const getDownloadUrl = async (id: string): Promise<{ downloadUrl: string }> => {
    return await mutations.getDownloadUrl(id);
  };

  return {
    reports,
    loading,
    error,
    mutationLoading: mutations.loading,
    refetch,
    invalidateCache,
    createReport,
    updateReport,
    deleteReport,
    getDownloadUrl,
  };
}

// Utility function to clear all cache (useful for logout, etc.)
export function clearReportsCache() {
  apiCache.clear();
}

// Debug function to inspect cache state
export function getReportsCacheStats() {
  return apiCache.getStats();
}
