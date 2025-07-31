/**
 * React hook for wind load calculations
 * Integrates the TypeScript wind calculation classes w    if (props.houseRotation === undefined || props.houseRotation < 0 || props.houseRotation >= 360) {
      errors.push('Hus rotation skal være mellem 0 og 360 grader');
    } React components
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  calculateWindLoads, 
  WindCalculationInputs, 
  WindCalculationResults,
  getWindLoadForZone,
  getAvailableZones,
  getWallZones
} from './index';

export interface UseWindCalculationsProps {
  // Building dimensions
  houseHeight?: number;
  houseWidth?: number;
  houseDepth?: number;
  
  // Roof properties
  roofType?: 'flat' | 'monopitch' | 'duopitch' | 'hipped';
  roofPitch?: number;
  hippedMainPitch?: number;
  hippedHipPitch?: number;
  
  // Flat roof edge properties
  flatRoofEdgeType?: 'sharp' | 'parapet' | 'rounded' | 'beveled';
  parapetHeight?: number;
  edgeRadius?: number;
  bevelAngle?: number;
  
  // Environmental conditions
  distanceToSea?: 'more_than_25km' | 'less_than_25km';
  terrainCategory?: '0' | '1' | '2' | '3' | '4';
  formFactor?: 'main_structure' | 'small_elements';
  houseRotation?: number;
  
  // Auto-calculate flag
  autoCalculate?: boolean;
}

export interface UseWindCalculationsReturn {
  // Calculation results
  results: WindCalculationResults | null;
  isCalculating: boolean;
  error: string | null;
  
  // Manual calculation trigger
  calculate: () => void;
  
  // Utility functions
  getLoadForZone: (surface: 'wall' | 'roof', surfaceName?: string, zone?: string, cpeType?: string) => number | null;
  getAvailableRoofZones: () => string[];
  getAvailableWallZones: () => string[];
  
  // Validation
  canCalculate: boolean;
  validationErrors: string[];
}

/**
 * Hook for wind load calculations with automatic or manual triggering
 */
export function useWindCalculations(props: UseWindCalculationsProps): UseWindCalculationsReturn {
  const [results, setResults] = useState<WindCalculationResults | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate required inputs
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    
    if (!props.houseHeight || props.houseHeight <= 0) {
      errors.push('Hus højde skal være større end 0');
    }
    
    if (!props.houseWidth || props.houseWidth <= 0) {
      errors.push('Hus bredde skal være større end 0');
    }
    
    if (!props.houseDepth || props.houseDepth <= 0) {
      errors.push('Hus dybde skal være større end 0');
    }
    
    if (!props.roofType) {
      errors.push('Tagtype skal vælges');
    }
    
    if (!props.distanceToSea) {
      errors.push('Afstand til Vesterhavet skal vælges');
    }
    
    if (!props.terrainCategory) {
      errors.push('Terrænkategori skal vælges');
    }
    
    if (!props.formFactor) {
      errors.push('Formfaktorer skal vælges');
    }
    
    if (props.houseRotation === undefined || props.houseRotation < 0 || props.houseRotation >= 360) {
      errors.push('Hus rotation skal være mellem 0 og 359 grader');
    }
    
    // Roof-specific validations
    if (props.roofType === 'flat' && props.flatRoofEdgeType === 'parapet' && (!props.parapetHeight || props.parapetHeight <= 0)) {
      errors.push('Brystningshøjde skal angives for brystninger');
    }
    
    if (props.roofType === 'flat' && props.flatRoofEdgeType === 'rounded' && (!props.edgeRadius || props.edgeRadius <= 0)) {
      errors.push('Radius skal angives for afrundede tagkanter');
    }
    
    if (props.roofType === 'flat' && props.flatRoofEdgeType === 'beveled' && (!props.bevelAngle || props.bevelAngle <= 0)) {
      errors.push('Hældning skal angives for afskårne tagkanter');
    }
    
    if ((props.roofType === 'monopitch' || props.roofType === 'duopitch') && (!props.roofPitch || props.roofPitch <= 0 || props.roofPitch > 90)) {
      errors.push('Taghældning skal være mellem 0 og 90 grader');
    }
    
    if (props.roofType === 'hipped') {
      if (!props.hippedMainPitch || props.hippedMainPitch <= 0 || props.hippedMainPitch > 90) {
        errors.push('Hovedhældning skal være mellem 0 og 90 grader for valmtag');
      }
      if (!props.hippedHipPitch || props.hippedHipPitch <= 0 || props.hippedHipPitch > 90) {
        errors.push('Valmhældning skal være mellem 0 og 90 grader for valmtag');
      }
    }
    
    return errors;
  }, [props]);

  const canCalculate = validationErrors.length === 0;

  // Perform wind load calculation
  const calculate = async () => {
    if (!canCalculate) {
      setError('Kan ikke beregne: ' + validationErrors.join(', '));
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const inputs: WindCalculationInputs = {
        houseHeight: props.houseHeight!,
        houseWidth: props.houseWidth!,
        houseDepth: props.houseDepth!,
        roofType: props.roofType!,
        roofPitch: props.roofPitch,
        hippedMainPitch: props.hippedMainPitch,
        hippedHipPitch: props.hippedHipPitch,
        flatRoofEdgeType: props.flatRoofEdgeType,
        parapetHeight: props.parapetHeight,
        edgeRadius: props.edgeRadius,
        bevelAngle: props.bevelAngle,
        distanceToSea: props.distanceToSea!,
        terrainCategory: props.terrainCategory!,
        formFactor: props.formFactor!,
        houseRotation: props.houseRotation!,
      };

      const calculationResults = calculateWindLoads(inputs);
      setResults(calculationResults);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ukendt fejl ved beregning';
      setError(errorMessage);
      console.error('Wind calculation error:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  // Auto-calculate when inputs change (if enabled)
  useEffect(() => {
    if (props.autoCalculate && canCalculate) {
      const timeoutId = setTimeout(() => {
        calculate();
      }, 500); // Debounce for 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [
    props.houseHeight,
    props.houseWidth,
    props.houseDepth,
    props.roofType,
    props.roofPitch,
    props.hippedMainPitch,
    props.hippedHipPitch,
    props.flatRoofEdgeType,
    props.parapetHeight,
    props.edgeRadius,
    props.bevelAngle,
    props.distanceToSea,
    props.terrainCategory,
    props.formFactor,
    props.houseRotation,
    props.autoCalculate,
    canCalculate,
  ]);

  // Utility function to get load for specific zone
  const getLoadForZone = (
    surface: 'wall' | 'roof',
    surfaceName?: string,
    zone?: string,
    cpeType: string = 'cpe,10'
  ) => {
    if (!results) return null;
    return getWindLoadForZone(results, surface, surfaceName, zone, cpeType);
  };

  // Get available zones for current roof configuration
  const getAvailableRoofZones = () => {
    if (!props.roofType) return [];
    return getAvailableZones(props.roofType, props.houseRotation);
  };

  const getAvailableWallZones = () => {
    return getWallZones();
  };

  return {
    results,
    isCalculating,
    error,
    calculate,
    getLoadForZone,
    getAvailableRoofZones,
    getAvailableWallZones,
    canCalculate,
    validationErrors,
  };
}

/**
 * Simple hook for one-time wind calculations
 */
export function useWindCalculation(inputs: WindCalculationInputs | null) {
  const [results, setResults] = useState<WindCalculationResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inputs) {
      setResults(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const calculationResults = calculateWindLoads(inputs);
      setResults(calculationResults);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Calculation error';
      setError(errorMessage);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [inputs]);

  return { results, isLoading, error };
}
