/**
 * Wind calculations module
 * Exports wind load calculation classes and utilities
 */

import { WindProp } from './windprop';
import { EC14 } from './EC1-4';
export { WindProp } from './windprop';
export type { Number } from './windprop';
export { EC14 } from './EC1-4';

// Export hooks
export { useWindCalculations, useWindCalculation } from './useWindCalculations';
export type { UseWindCalculationsProps, UseWindCalculationsReturn } from './useWindCalculations';

// Wind calculation input interface that matches the React component state
export interface WindCalculationInputs {
  // Building dimensions
  houseHeight: number;
  houseWidth: number;
  houseDepth: number;
  
  // Roof properties
  roofType: 'flat' | 'monopitch' | 'duopitch' | 'hipped';
  roofPitch?: number;
  hippedMainPitch?: number;
  hippedHipPitch?: number;
  
  // Flat roof edge properties
  flatRoofEdgeType?: 'sharp' | 'parapet' | 'rounded' | 'beveled';
  parapetHeight?: number;
  edgeRadius?: number;
  bevelAngle?: number;
  
  // Environmental conditions
  distanceToSea: 'more_than_25km' | 'less_than_25km';
  terrainCategory: '0' | '1' | '2' | '3' | '4';
  formFactor: 'main_structure' | 'small_elements';
  windDirection: number;
}

// Wind calculation results interface
export interface WindCalculationResults {
  // Basic wind parameters
  basicWindSpeed: number;        // vB [m/s]
  meanWindVelocity: number;      // vM [m/s]
  turbulenceIntensity: number;   // iV
  peakVelocityPressure: number;  // qP [Pa]
  
  // Wind load coefficients and pressures by surface/zone
  wallLoads?: {
    [surface: string]: {
      [cpeType: string]: { [zone: string]: number };
    };
  };
  
  roofLoads?: {
    [cpeType: string]: { [zone: string]: number };
  };
}

/**
 * Main wind calculation function that integrates with the React component
 */
export function calculateWindLoads(inputs: WindCalculationInputs): WindCalculationResults {
  // Convert distance to sea to kilometers
  const distToCoastKm = inputs.distanceToSea === 'more_than_25km' ? 30 : 15;
  
  // Convert terrain category to number
  const terrainCat = parseInt(inputs.terrainCategory);
  
  // Use roof pitch or default values based on roof type
  let roofPitch = inputs.roofPitch || 0;
  if (inputs.roofType === 'duopitch' && !inputs.roofPitch) {
    roofPitch = 30; // Default for duopitch
  } else if (inputs.roofType === 'monopitch' && !inputs.roofPitch) {
    roofPitch = 15; // Default for monopitch
  } else if (inputs.roofType === 'hipped') {
    roofPitch = inputs.hippedMainPitch || 30;
  }
  
  // Create EC1-4 calculator instance
  const ec14 = new EC14(
    roofPitch,                    // roof pitch [°]
    inputs.houseHeight,           // building height [m]
    inputs.houseWidth,            // building width [m]
    inputs.houseDepth,            // building depth [m]
    distToCoastKm,                // distance to coast [km]
    terrainCat,                   // terrain category
    inputs.windDirection,         // wind direction [°]
    1.0,                          // season factor
    true                          // use DK NA
  );
  
  // Calculate basic wind pressure
  ec14.windPressure();
  
  // Log basic wind parameters
  console.log('=== VINDBEREGNING RESULTATER ===');
  console.log('Grundvindhastighed v_b0:', ec14.vB0.toFixed(2), 'm/s');
  console.log('Retningsfaktor c_dir:', ec14.cDir.toFixed(3));
  console.log('Basisvindhastighed v_b:', ec14.vB.toFixed(2), 'm/s');
  console.log('Middelvindhastighed v_m:', ec14.vM.toFixed(2), 'm/s');
  console.log('Turbulensintensitet I_v:', ec14.iV.toFixed(3));
  console.log('Toppunkthastighed q_p:', ec14.qP.toFixed(1), 'Pa');
  console.log('');
  
  // Calculate wall loads
  const wallLoads = ec14.windLoadWall();
  
  // Log wall loads
  console.log('=== VÆGBELASTNINGER ===');
  Object.entries(wallLoads).forEach(([surface, loads]) => {
    console.log(`${surface}:`);
    Object.entries(loads).forEach(([cpeType, zones]) => {
      console.log(`  ${cpeType}:`);
      Object.entries(zones).forEach(([zone, value]) => {
        console.log(`    ${zone}: ${value.toFixed(1)} Pa`);
      });
    });
  });
  console.log('');
  
  // Calculate roof loads based on roof type
  let roofLoads;
  
  try {
    switch (inputs.roofType) {
      case 'flat': {
        // Determine flat roof parameters
        let roofTypeParam = 'Parapets';
        let parameter = 0.05; // default hp/h ratio
        
        if (inputs.flatRoofEdgeType === 'parapet' && inputs.parapetHeight) {
          roofTypeParam = 'Parapets';
          parameter = inputs.parapetHeight / inputs.houseHeight;
        } else if (inputs.flatRoofEdgeType === 'rounded' && inputs.edgeRadius) {
          roofTypeParam = 'Curved';
          parameter = inputs.edgeRadius / inputs.houseHeight;
        } else if (inputs.flatRoofEdgeType === 'beveled' && inputs.bevelAngle) {
          roofTypeParam = 'Mansard';
          parameter = inputs.bevelAngle;
        }
        
        roofLoads = ec14.windLoadFlatRoof(roofTypeParam, parameter);
        break;
      }
      
      case 'monopitch': {
        // For monopitch, calculate for primary wind direction
        roofLoads = ec14.windLoadMonopitchRoof(0);
        break;
      }
      
      case 'duopitch': {
        // For duopitch, calculate for primary wind direction
        roofLoads = ec14.windLoadDuopitchRoof(0);
        break;
      }
      
      case 'hipped': {
        roofLoads = ec14.windLoadHippedRoof();
        break;
      }
      
      default:
        throw new Error(`Unsupported roof type: ${inputs.roofType}`);
    }
  } catch (error) {
    console.warn('Roof load calculation failed:', error);
    roofLoads = { "cpe,10": {} };
  }
  
  // Log roof loads
  console.log('=== TAGBELASTNINGER ===');
  console.log(`Tagtype: ${inputs.roofType}`);
  if (roofLoads) {
    Object.entries(roofLoads).forEach(([cpeType, zones]) => {
      console.log(`${cpeType}:`);
      Object.entries(zones).forEach(([zone, value]) => {
        console.log(`  ${zone}: ${value.toFixed(1)} Pa`);
      });
    });
  }
  console.log('');
  console.log('=== BEREGNING AFSLUTTET ===');
  
  return {
    basicWindSpeed: ec14.vB,
    meanWindVelocity: ec14.vM,
    turbulenceIntensity: ec14.iV,
    peakVelocityPressure: ec14.qP,
    wallLoads,
    roofLoads,
  };
}

/**
 * Utility function to get wind load for a specific surface and zone
 */
export function getWindLoadForZone(
  results: WindCalculationResults,
  surface: 'wall' | 'roof',
  surfaceName?: string,
  zone?: string,
  cpeType: string = 'cpe,10'
): number | null {
  if (surface === 'wall' && results.wallLoads && surfaceName && zone) {
    const surfaceData = results.wallLoads[surfaceName as keyof typeof results.wallLoads];
    if (surfaceData && surfaceData[cpeType] && surfaceData[cpeType]['q' + zone] !== undefined) {
      return surfaceData[cpeType]['q' + zone];
    }
  } else if (surface === 'roof' && results.roofLoads && zone) {
    if (results.roofLoads[cpeType] && results.roofLoads[cpeType]['q' + zone] !== undefined) {
      return results.roofLoads[cpeType]['q' + zone];
    }
  }
  
  return null;
}

/**
 * Get all available zones for a given surface type and roof configuration
 */
export function getAvailableZones(roofType: string, windDirection?: number): string[] {
  switch (roofType) {
    case 'flat':
      return ['F', 'G', 'H', 'Itryk', 'Isug'];
    
    case 'monopitch':
      if (windDirection === 0) {
        return ['F1', 'F2', 'G1', 'G2', 'H1', 'H2'];
      } else if (windDirection === 90) {
        return ['Fup', 'Flow', 'G', 'H', 'I'];
      } else if (windDirection === 180) {
        return ['F', 'G', 'H'];
      }
      return ['F1', 'F2', 'G1', 'G2', 'H1', 'H2']; // default
    
    case 'duopitch':
      if (windDirection === 0) {
        return ['F1', 'F2', 'G1', 'G2', 'H1', 'H2', 'I1', 'I2', 'J1', 'J2'];
      } else if (windDirection === 90) {
        return ['F', 'G', 'H', 'I'];
      }
      return ['F1', 'F2', 'G1', 'G2', 'H1', 'H2', 'I1', 'I2', 'J1', 'J2']; // default
    
    case 'hipped':
      return ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
    
    default:
      return [];
  }
}

/**
 * Get wall zones
 */
export function getWallZones(): string[] {
  return ['A', 'B', 'C', 'D', 'E'];
}
