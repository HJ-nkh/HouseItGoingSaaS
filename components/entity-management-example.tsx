'use client';

import React, { useState } from 'react';
import {
  useProjectsWithMutations,
  useDrawingsWithMutations,
  useSimulationsWithMutations,
  useReportsWithMutations,
} from '@/lib/api';

export function EntityManagementExample() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<number | null>(null);
  const [selectedSimulationId, setSelectedSimulationId] = useState<number | null>(null);

  // Projects
  const { 
    projects, 
    loading: projectsLoading, 
    createProject,
    mutationLoading: projectMutationLoading 
  } = useProjectsWithMutations({
    refetchOnWindowFocus: true,
  });

  // Drawings for selected project
  const { 
    drawings, 
    loading: drawingsLoading, 
    createDrawing,
    mutationLoading: drawingMutationLoading 
  } = useDrawingsWithMutations(
    { refetchOnWindowFocus: true },
    { projectId: selectedProjectId || undefined }
  );

  // Simulations for selected drawing
  const { 
    simulations, 
    loading: simulationsLoading, 
    createSimulation,
    mutationLoading: simulationMutationLoading 
  } = useSimulationsWithMutations(
    { refetchOnWindowFocus: true },
    { drawingId: selectedDrawingId || undefined, limit: 10 }
  );

  // Reports for selected simulation
  const { 
    reports, 
    loading: reportsLoading, 
    createReport,
    getDownloadUrl,
    mutationLoading: reportMutationLoading 
  } = useReportsWithMutations(
    { refetchOnWindowFocus: true },
    { simulationId: selectedSimulationId || undefined }
  );

  const handleCreateProject = async () => {
    try {
      const newProject = await createProject({
        title: `Project ${Date.now()}`,
        address: '123 Demo Street'
      });
      setSelectedProjectId(newProject.id);
    } catch (error) {
      alert('Failed to create project');
    }
  };

  const handleCreateDrawing = async () => {
    if (!selectedProjectId) return;
    
    try {
      const newDrawing = await createDrawing({
        projectId: selectedProjectId,
        title: `Drawing ${Date.now()}`,
        history: { shapes: [], version: 1 },
      });
      setSelectedDrawingId(newDrawing.id);
    } catch (error) {
      alert('Failed to create drawing');
    }
  };

  const handleCreateSimulation = async () => {
    if (!selectedProjectId || !selectedDrawingId) return;
    
    try {
      const newSimulation = await createSimulation({
        projectId: selectedProjectId,
        drawingId: selectedDrawingId,
        entities: { objects: [], settings: {} },
      });
      setSelectedSimulationId(newSimulation.id);
    } catch (error) {
      alert('Failed to create simulation');
    }
  };

  const handleCreateReport = async () => {
    if (!selectedSimulationId) return;
    
    try {
      await createReport({
        simulationId: selectedSimulationId,
        title: `Report ${Date.now()}`,
      });
    } catch (error) {
      alert('Failed to create report');
    }
  };

  const handleDownloadReport = async (reportId: string) => {
    try {
      const { downloadUrl } = await getDownloadUrl(reportId);
      window.open(downloadUrl, '_blank');
    } catch (error) {
      alert('Failed to get download URL');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Entity Management Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Projects */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Projects</h2>
            <button
              onClick={handleCreateProject}
              disabled={projectMutationLoading}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50"
            >
              {projectMutationLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
          
          {projectsLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {projects.map(project => (
                <div 
                  key={project.id}
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`p-2 border rounded cursor-pointer text-sm ${
                    selectedProjectId === project.id ? 'bg-blue-100 border-blue-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium truncate">{project.title}</div>
                  {project.address && (
                    <div className="text-gray-500 text-xs truncate">{project.address}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drawings */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Drawings</h2>
            <button
              onClick={handleCreateDrawing}
              disabled={!selectedProjectId || drawingMutationLoading}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm disabled:opacity-50"
            >
              {drawingMutationLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
          
          {!selectedProjectId ? (
            <div className="text-gray-500 text-sm">Select a project first</div>
          ) : drawingsLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {drawings.map(drawing => (
                <div 
                  key={drawing.id}
                  onClick={() => setSelectedDrawingId(drawing.id)}
                  className={`p-2 border rounded cursor-pointer text-sm ${
                    selectedDrawingId === drawing.id ? 'bg-green-100 border-green-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium truncate">{drawing.title}</div>
                  <div className="text-gray-500 text-xs">
                    {drawing.hasChanges ? '• Unsaved changes' : '• Saved'}
                    {drawing.isTemplate && ' • Template'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Simulations */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Simulations</h2>
            <button
              onClick={handleCreateSimulation}
              disabled={!selectedDrawingId || simulationMutationLoading}
              className="px-3 py-1 bg-purple-500 text-white rounded text-sm disabled:opacity-50"
            >
              {simulationMutationLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
          
          {!selectedDrawingId ? (
            <div className="text-gray-500 text-sm">Select a drawing first</div>
          ) : simulationsLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {simulations.map(simulation => (
                <div 
                  key={simulation.id}
                  onClick={() => setSelectedSimulationId(simulation.id)}
                  className={`p-2 border rounded cursor-pointer text-sm ${
                    selectedSimulationId === simulation.id ? 'bg-purple-100 border-purple-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">Simulation #{simulation.id}</div>
                  <div className={`text-xs ${
                    simulation.status === 'completed' ? 'text-green-600' :
                    simulation.status === 'failed' ? 'text-red-600' :
                    simulation.status === 'running' ? 'text-blue-600' :
                    'text-gray-600'
                  }`}>
                    {simulation.status.toUpperCase()}
                  </div>
                  {simulation.error && (
                    <div className="text-red-500 text-xs truncate">{simulation.error}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reports */}
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Reports</h2>
            <button
              onClick={handleCreateReport}
              disabled={!selectedSimulationId || reportMutationLoading}
              className="px-3 py-1 bg-orange-500 text-white rounded text-sm disabled:opacity-50"
            >
              {reportMutationLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
          
          {!selectedSimulationId ? (
            <div className="text-gray-500 text-sm">Select a simulation first</div>
          ) : reportsLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {reports.map(report => (
                <div 
                  key={report.id}
                  className="p-2 border rounded hover:bg-gray-50 text-sm"
                >
                  <div className="font-medium truncate">{report.title}</div>
                  <div className="text-gray-500 text-xs">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </div>
                  <button
                    onClick={() => handleDownloadReport(report.id)}
                    disabled={reportMutationLoading}
                    className="mt-1 px-2 py-1 bg-gray-500 text-white rounded text-xs disabled:opacity-50"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="font-semibold mb-2">Current Selection:</h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium">Project:</span> {selectedProjectId || 'None'}
          </div>
          <div>
            <span className="font-medium">Drawing:</span> {selectedDrawingId || 'None'}
          </div>
          <div>
            <span className="font-medium">Simulation:</span> {selectedSimulationId || 'None'}
          </div>
          <div>
            <span className="font-medium">Reports:</span> {reports.length}
          </div>
        </div>
      </div>
    </div>
  );
}
