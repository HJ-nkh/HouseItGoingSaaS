// Utility function to reshape simulation data for the drawing board
export function toMemberSimulations(simulation: any) {
  if (!simulation) return null;
  
  // This is a placeholder implementation - you'll need to adapt this
  // based on your actual simulation data structure
  return {
    memberSimulations: simulation.result?.memberSimulations || [],
    R0: simulation.result?.R0 || [],
    loadCombinationsUR: simulation.result?.loadCombinationsUR || {},
    loadCombinationsFactorMat: simulation.result?.loadCombinationsFactorMat || [],
    loadCombinationsFactorMatIds: simulation.result?.loadCombinationsFactorMatIds || []
  };
}
