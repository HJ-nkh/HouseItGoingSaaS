'use client';

import React from 'react';
import { useProjectsWithMutations, useProject } from '@/lib/api/use-projects';

// Simple example showing the cleaned-up API
export function SimpleProjectsExample() {
  const { 
    projects, 
    loading, 
    error, 
    createProject,
    updateProject,
    deleteProject,
    mutationLoading 
  } = useProjectsWithMutations({
    cacheTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: true, // Refetch when window gets focus
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });

  const handleQuickCreate = () => {
    createProject({ 
      title: `Project ${Date.now()}`, 
      address: '123 Demo Street' 
    });
  };

  if (loading) return <div>Loading projects...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">Projects ({projects.length})</h1>
      
      <button 
        onClick={handleQuickCreate}
        disabled={mutationLoading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {mutationLoading ? 'Creating...' : 'Quick Create Project'}
      </button>

      <div className="grid gap-4">
        {projects.map(project => (
          <div key={project.id} className="p-4 border rounded">
            <h3 className="font-bold">{project.title}</h3>
            {project.address && <p className="text-gray-600">{project.address}</p>}
            <div className="mt-2 space-x-2">
              <button
                onClick={() => updateProject(project.id, { 
                  title: project.title + ' (Updated)' 
                })}
                disabled={mutationLoading}
                className="px-2 py-1 bg-green-500 text-white rounded text-sm disabled:opacity-50"
              >
                Update
              </button>
              <button
                onClick={() => deleteProject(project.id)}
                disabled={mutationLoading}
                className="px-2 py-1 bg-red-500 text-white rounded text-sm disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Example showing single project usage
export function ProjectDetail({ projectId }: { projectId: number }) {
  const { project, loading, error } = useProject(projectId, {
    cacheTime: 10 * 60 * 1000, // 10 minutes cache for single projects
  });

  if (loading) return <div>Loading project...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!project) return <div>Project not found</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl mb-4">{project.title}</h1>
      {project.address && (
        <p className="text-gray-600 mb-2">📍 {project.address}</p>
      )}
      <div className="text-sm text-gray-500">
        <p>Created: {new Date(project.createdAt).toLocaleDateString()}</p>
        <p>Last updated: {new Date(project.updatedAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
