'use client';

import React, { useState } from 'react';
import { useProjectsWithMutations, CreateProjectData, UpdateProjectData } from '@/lib/api/use-projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export default function ProjectsExample() {
  const { 
    projects, 
    loading, 
    error, 
    refetch, 
    createProject, 
    updateProject, 
    deleteProject, 
    mutationLoading 
  } = useProjectsWithMutations({
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
  
  // Form state for creating new projects
  const [newProject, setNewProject] = useState<CreateProjectData>({
    title: '',
    address: '',
  });
  
  // State for editing projects
  const [editingProject, setEditingProject] = useState<{ id: number; data: UpdateProjectData } | null>(null);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProject.title.trim()) {
      alert('Project title is required');
      return;
    }

    try {
      await createProject(newProject);
      setNewProject({ title: '', address: '' });
      // No need to call refetch() - it's handled automatically
      alert('Project created successfully!');
    } catch (error) {
      alert(`Error creating project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdateProject = async (id: number, data: UpdateProjectData) => {
    try {
      await updateProject(id, data);
      setEditingProject(null);
      // No need to call refetch() - it's handled automatically
      alert('Project updated successfully!');
    } catch (error) {
      alert(`Error updating project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      await deleteProject(id);
      // No need to call refetch() - it's handled automatically
      alert('Project deleted successfully!');
    } catch (error) {
      alert(`Error deleting project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return <div className="p-4">Loading projects...</div>;
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-600">Error: {error}</div>
        <Button onClick={refetch} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Projects Management</h1>
      
      {/* Create Project Form */}
      <Card className="p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Create New Project</h2>
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              type="text"
              value={newProject.title}
              onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
              placeholder="Enter project title"
              required
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              type="text"
              value={newProject.address}
              onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
              placeholder="Enter project address (optional)"
            />
          </div>
          <Button type="submit" disabled={mutationLoading}>
            {mutationLoading ? 'Creating...' : 'Create Project'}
          </Button>
        </form>
      </Card>

      {/* Projects List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Projects ({projects.length})</h2>
        
        {projects.length === 0 ? (
          <p className="text-gray-500">No projects found. Create your first project above!</p>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="p-4">
              {editingProject?.id === project.id ? (
                // Edit mode
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input
                      type="text"
                      value={editingProject.data.title || project.title}
                      onChange={(e) => {
                        if (editingProject) {
                          setEditingProject({
                            ...editingProject,
                            data: { ...editingProject.data, title: e.target.value }
                          });
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input
                      type="text"
                      value={editingProject.data.address || project.address || ''}
                      onChange={(e) => {
                        if (editingProject) {
                          setEditingProject({
                            ...editingProject,
                            data: { ...editingProject.data, address: e.target.value }
                          });
                        }
                      }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (editingProject) {
                          handleUpdateProject(project.id, editingProject.data);
                        }
                      }}
                      disabled={mutationLoading}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingProject(null)}
                      disabled={mutationLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{project.title}</h3>
                    {project.address && (
                      <p className="text-gray-600">{project.address}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      Created: {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                    {project.updatedAt !== project.createdAt && (
                      <p className="text-sm text-gray-500">
                        Updated: {new Date(project.updatedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => 
                        setEditingProject({
                          id: project.id,
                          data: { title: project.title, address: project.address || undefined }
                        })
                      }
                      disabled={mutationLoading}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteProject(project.id)}
                      disabled={mutationLoading}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
