/**
 * Centralized exports for all API hooks
 * Import everything you need from this single file
 */

// Projects
export {
  useProjects,
  useProject,
  useProjectMutations,
  useProjectsWithMutations,
  clearProjectsCache,
  getProjectsCacheStats,
  type CreateProjectData,
  type UpdateProjectData,
  type UseProjectsConfig,
} from './use-projects';

// Drawings
export {
  useDrawings,
  useDrawing,
  useDrawingMutations,
  useDrawingsWithMutations,
  clearDrawingsCache,
  getDrawingsCacheStats,
  type CreateDrawingData,
  type UpdateDrawingData,
  type UseDrawingsConfig,
} from './use-drawings';

// Simulations
export {
  useSimulations,
  useSimulation,
  useSimulationMutations,
  useSimulationsWithMutations,
  clearSimulationsCache,
  getSimulationsCacheStats,
  type CreateSimulationData,
  type UpdateSimulationData,
  type UseSimulationsConfig,
} from './use-simulations';

// Reports
export {
  useReports,
  useReport,
  useReportMutations,
  useReportsWithMutations,
  clearReportsCache,
  getReportsCacheStats,
  type CreateReportData,
  type UpdateReportData,
  type UseReportsConfig,
} from './use-reports';

// Cache utilities
export {
  clearAllCache,
  getAllCacheStats,
  type UseEntityConfig,
} from './cache';
