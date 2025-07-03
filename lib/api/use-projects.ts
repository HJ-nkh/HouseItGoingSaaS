'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiCache, fetchWithCache, UseEntityConfig } from './cache';
import { Project } from '../types';

export interface CreateProjectData {
  title: string;
  address?: string;
}

export interface UpdateProjectData {
  title?: string;
  address?: string;
}

export interface UseProjectsConfig extends UseEntityConfig {}

// Main projects hook with enhanced caching
export function useProjects(config: UseProjectsConfig = {}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWithCache<Project[]>('/api/projects', undefined, {
        ttl: config.cacheTime,
      });
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [config.cacheTime]);

  useEffect(() => {
    fetchProjects();

    // Optional refetch interval
    if (config.refetchInterval) {
      const interval = setInterval(fetchProjects, config.refetchInterval);
      return () => clearInterval(interval);
    }
  }, [fetchProjects, config.refetchInterval]);

  // Optional refetch on window focus
  useEffect(() => {
    if (config.refetchOnWindowFocus) {
      const handleFocus = () => {
        // Only refetch if data is stale
        fetchProjects();
      };
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [fetchProjects, config.refetchOnWindowFocus]);

  const invalidateCache = useCallback(() => {
    apiCache.invalidate('projects');
  }, []);

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
    invalidateCache,
  };
}

// Single project hook
export function useProject(id: number | null, config: UseProjectsConfig = {}) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!id) {
      setProject(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchWithCache<Project>(`/api/projects/${id}`, undefined, {
        ttl: config.cacheTime,
      });
      setProject(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [id, config.cacheTime]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return {
    project,
    loading,
    error,
    refetch: fetchProject,
  };
}

// Enhanced mutations with cache management
export function useProjectMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createProject = async (data: CreateProjectData): Promise<Project> => {
    try {
      setLoading(true);
      setError(null);
      
      const newProject = await fetchWithCache<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }, { skipCache: true });
      
      // Invalidate projects cache
      apiCache.invalidate('projects');
      
      return newProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (id: string, data: UpdateProjectData): Promise<Project> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedProject = await fetchWithCache<Project>(`/api/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, { skipCache: true });
      
      // Invalidate related caches
      apiCache.invalidate('projects');
      apiCache.invalidate(`projects/${id}`);
      
      return updatedProject;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      await fetchWithCache(`/api/projects/${id}`, {
        method: 'DELETE',
      }, { skipCache: true });
      
      // Invalidate related caches
      apiCache.invalidate('projects');
      apiCache.invalidate(`projects/${id}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    createProject,
    updateProject,
    deleteProject,
    loading,
    error,
  };
}

// Combined hook for convenience
export function useProjectsWithMutations(config: UseProjectsConfig = {}) {
  const { projects, loading, error, refetch, invalidateCache } = useProjects(config);
  const mutations = useProjectMutations();

  const createProject = async (data: CreateProjectData): Promise<Project> => {
    const result = await mutations.createProject(data);
    refetch(); // Refresh the list
    return result;
  };

  const updateProject = async (id: string, data: UpdateProjectData): Promise<Project> => {
    const result = await mutations.updateProject(id, data);
    refetch(); // Refresh the list
    return result;
  };

  const deleteProject = async (id: string): Promise<void> => {
    await mutations.deleteProject(id);
    refetch(); // Refresh the list
  };

  return {
    projects,
    loading,
    error,
    mutationLoading: mutations.loading,
    refetch,
    invalidateCache,
    createProject,
    updateProject,
    deleteProject,
  };
}

// Utility function to clear all cache (useful for logout, etc.)
export function clearProjectsCache() {
  apiCache.clear();
}

// Debug function to inspect cache state
export function getProjectsCacheStats() {
  return apiCache.getStats();
}
