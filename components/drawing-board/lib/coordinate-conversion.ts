/**
 * Utility functions for converting between screen coordinates (UI) and structural coordinates (internal)
 * 
 * In screen coordinates: Y increases downward (positive Y = down)
 * In structural coordinates: Y increases upward (positive Y = up)
 * 
 * Therefore: screenY = -structuralY and structuralY = -screenY
 */

/**
 * Convert from structural coordinates (internal) to screen coordinates (UI display)
 * @param structuralY - Y coordinate in structural system
 * @returns Y coordinate for UI display
 */
export const structuralToScreenY = (structuralY: number): number => {
  return -structuralY;
};

/**
 * Convert from screen coordinates (UI input) to structural coordinates (internal storage)
 * @param screenY - Y coordinate from UI input
 * @returns Y coordinate for internal storage
 */
export const screenToStructuralY = (screenY: number): number => {
  return -screenY;
};

/**
 * Convert X/Y coordinates from structural to screen system
 * X coordinates remain unchanged, only Y is flipped
 */
export const structuralToScreenCoords = (coords: { x: number; y: number }): { x: number; y: number } => {
  return {
    x: coords.x,
    y: structuralToScreenY(coords.y)
  };
};

/**
 * Convert X/Y coordinates from screen to structural system
 * X coordinates remain unchanged, only Y is flipped
 */
export const screenToStructuralCoords = (coords: { x: number; y: number }): { x: number; y: number } => {
  return {
    x: coords.x,
    y: screenToStructuralY(coords.y)
  };
};
