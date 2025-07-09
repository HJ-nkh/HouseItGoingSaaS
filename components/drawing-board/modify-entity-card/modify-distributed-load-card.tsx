import React from 'react';
import { DistributedLoad, LoadType, ConstraintType } from "../lib/types";
import {
  Card,
  CardHeader,
  CardFooter,
  CardContent,
} from "@/components/ui/card";
import { EntitySet } from "../lib/reduce-history";
import NumberInput from "../../number-input";
import CardActionButtons from "../../card-action-buttons";
import { Select } from "@/components/select";
import ConstraintSelect from "./constraint-select/xy-only-select";
import { getDisabledConstraintTypes } from "../lib/validate-side-mounted-node";
import { resolveDistributedLoadPosition } from "../lib/reduce-history/resolve-position";
import { useState } from "react";
import HouseOutline from "../../house-outline";
import HouseCompassView from "../../house-compass-view";
// Import wind calculation functionality
import { useWindCalculations } from "../lib/wind-calculations";

// Extended interface for DistributedLoad with additional calculation properties
interface ExtendedDistributedLoad extends DistributedLoad {
  ccDistance?: number;
  areaLoad?: number;
  ccDistanceSuction?: number;
  areaLoadSuction?: number;
  magnitude1Suction?: number;
  magnitude2Suction?: number;
  // 3D model properties for wind loads
  houseHeight?: number;
  houseWidth?: number;
  houseDepth?: number;
  houseRotation?: number;
  roofType?: 'flat' | 'monopitch' | 'duopitch' | 'hipped';
  // Flat roof edge properties
  flatRoofEdgeType?: 'sharp' | 'parapet' | 'rounded' | 'beveled';
  parapetHeight?: number;
  edgeRadius?: number;
  bevelAngle?: number;
  roofPitch?: number;
  // Hipped roof specific properties
  hippedMainPitch?: number;  // Hældning langs facaderne
  hippedHipPitch?: number;   // Hældning på valmene i enderne
  // Wind calculation properties
  distanceToSea?: 'more_than_25km' | 'less_than_25km';
  terrainCategory?: '0' | '1' | '2' | '3' | '4';
  formFactor?: 'main_structure' | 'small_elements';
  windDirection?: number;  // Wind direction in degrees
  // Second set of wind load properties
  ccDistance2?: number;
  areaLoad2?: number;
  ccDistanceSuction2?: number;
  areaLoadSuction2?: number;
  magnitude1Suction2?: number;
  magnitude2Suction2?: number;
  magnitude1_2?: number;
  magnitude2_2?: number;
}

const LoadTypeOptions = [
  { label: "Egenlast", value: LoadType.Dead },
  { label: "Nyttelast", value: LoadType.Live },
  { label: "Sne", value: LoadType.Snow },
  { label: "Vind", value: LoadType.Wind },
  { label: "Uden lastkombination", value: LoadType.Standard },
];

const RoofTypeOptions = [
  { label: "Fladt tag", value: "flat" },
  { label: "Pulttag", value: "monopitch" },
  { label: "Sadeltag", value: "duopitch" },
  { label: "Valmtag", value: "hipped" },
];

const FlatRoofEdgeTypeOptions = [
  { label: "Skarp", value: "sharp" },
  { label: "Med brystninger", value: "parapet" },
  { label: "Afrundet", value: "rounded" },
  { label: "Afskåret", value: "beveled" },
];

const DistanceToSeaOptions = [
  { label: "Mere end 25km", value: "more_than_25km" },
  { label: "Mindre end 25km", value: "less_than_25km" },
];

const TerrainCategoryOptions = [
  { label: "0 - Hav, kystområde udsat for åbent hav", value: "0", selectedLabel: "0 - Hav, kystområde..." },
  { label: "1 - Søer eller fladt og vandret område uden væsentlig vegetation og uden forhindringer", value: "1", selectedLabel: "1 - Søer eller fladt område..." },
  { label: "2 - Område med lav vegetation som fx græs og enkelte forhindringer (træer, bygninger) med indbyrdes afstande på mindst 20 gange forhindringens højde", value: "2", selectedLabel: "2 - Lav vegetation..." },
  { label: "3 - Område med regelmæssig vegetation eller bebyggelse eller med enkeltvise forhindringer med afstande på højst 20 gange forhindringens højde (som fx landsbyer, forstadsområder, permanent skov)", value: "3", selectedLabel: "3 - Regelmæssig vegetation..." },
  { label: "4 - Område, hvor mindst 15 % af overfladen er dækket med bygninger, hvis gennemsnitshøjde er over 15 m.", value: "4", selectedLabel: "4 - Område med bygninger..." },
];

const FormFactorOptions = [
  { label: "Bygningers overordnede bærende konstruktion", value: "main_structure", selectedLabel: "Hovedkonstruktion" },
  { label: "Små elementer og fastgørelser", value: "small_elements", selectedLabel: "Små elementer" },
];

type ModifyDistributedLoadCardProps = {
  load: DistributedLoad;
  entitySet: EntitySet;
  windCalculatorSettings?: {
    houseHeight?: number;
    houseWidth?: number;
    houseDepth?: number;
    houseRotation: number;
    roofType: 'flat' | 'monopitch' | 'duopitch' | 'hipped';
    flatRoofEdgeType: 'sharp' | 'parapet' | 'rounded' | 'beveled';
    parapetHeight?: number;
    edgeRadius?: number;
    bevelAngle?: number;
    roofPitch?: number;
    hippedMainPitch?: number;
    hippedHipPitch?: number;
    distanceToSea: 'more_than_25km' | 'less_than_25km';
    terrainCategory: '0' | '1' | '2' | '3' | '4';
    formFactor: 'main_structure' | 'small_elements';
    windDirection: number;
  };
  onWindCalculatorSettingsChange?: (settings: Partial<NonNullable<ModifyDistributedLoadCardProps['windCalculatorSettings']>>) => void;
  onChange: (load: ExtendedDistributedLoad) => void;
  onSubmit: (load: DistributedLoad) => void;
  onClose: () => void;
  onDelete?: () => void;
  houseRotation?: number;
};

const ModifyDistributedLoadCard: React.FC<ModifyDistributedLoadCardProps> = ({
  load,
  entitySet,
  windCalculatorSettings,
  onWindCalculatorSettingsChange,
  onChange,
  onSubmit,
  onClose,
  onDelete,
  houseRotation = 0,
}) => {  const onEnter = () => onSubmit(load as DistributedLoad);
    // State for c/c distance and area load calculations
  // Initialize from load properties if they exist
  const extendedLoad = load as ExtendedDistributedLoad;
  const [ccDistance, setCcDistance] = useState<number | undefined>(extendedLoad.ccDistance);
  const [areaLoad, setAreaLoad] = useState<number | undefined>(extendedLoad.areaLoad);
  
  // State for house rotation - use shared wind calculator settings with fallback
  const [currentHouseRotation, setCurrentHouseRotation] = useState<number>(
    extendedLoad.houseRotation ?? windCalculatorSettings?.houseRotation ?? houseRotation ?? 0
  );
  
  // State for wind loads (pressure and suction)
  const [ccDistanceSuction, setCcDistanceSuction] = useState<number | undefined>(extendedLoad.ccDistanceSuction);
  const [areaLoadSuction, setAreaLoadSuction] = useState<number | undefined>(extendedLoad.areaLoadSuction);
  
  // State for 3D house model inputs (wind loads only) - initialize from shared settings with fallbacks
  const [houseHeight, setHouseHeight] = useState<number | undefined>(
    extendedLoad.houseHeight ?? windCalculatorSettings?.houseHeight
  );
  const [houseWidth, setHouseWidth] = useState<number | undefined>(
    extendedLoad.houseWidth ?? windCalculatorSettings?.houseWidth
  );
  const [houseDepth, setHouseDepth] = useState<number | undefined>(
    extendedLoad.houseDepth ?? windCalculatorSettings?.houseDepth
  );
  const [roofType, setRoofType] = useState<'flat' | 'monopitch' | 'duopitch' | 'hipped'>(
    extendedLoad.roofType ?? windCalculatorSettings?.roofType ?? 'duopitch'
  );
  
  // State for flat roof edge settings - initialize from shared settings with fallbacks
  const [flatRoofEdgeType, setFlatRoofEdgeType] = useState<'sharp' | 'parapet' | 'rounded' | 'beveled'>(
    extendedLoad.flatRoofEdgeType ?? windCalculatorSettings?.flatRoofEdgeType ?? 'sharp'
  );
  const [parapetHeight, setParapetHeight] = useState<number | undefined>(
    extendedLoad.parapetHeight ?? windCalculatorSettings?.parapetHeight
  );
  const [edgeRadius, setEdgeRadius] = useState<number | undefined>(
    extendedLoad.edgeRadius ?? windCalculatorSettings?.edgeRadius
  );
  const [bevelAngle, setBevelAngle] = useState<number | undefined>(
    extendedLoad.bevelAngle ?? windCalculatorSettings?.bevelAngle
  );
  const [roofPitch, setRoofPitch] = useState<number | undefined>(
    extendedLoad.roofPitch ?? windCalculatorSettings?.roofPitch
  );
  const [hippedMainPitch, setHippedMainPitch] = useState<number | undefined>(
    extendedLoad.hippedMainPitch ?? windCalculatorSettings?.hippedMainPitch
  );
  const [hippedHipPitch, setHippedHipPitch] = useState<number | undefined>(
    extendedLoad.hippedHipPitch ?? windCalculatorSettings?.hippedHipPitch
  );
  
  // State for wind calculation parameters - initialize from shared settings with fallbacks
  const [distanceToSea, setDistanceToSea] = useState<'more_than_25km' | 'less_than_25km'>(
    extendedLoad.distanceToSea ?? windCalculatorSettings?.distanceToSea ?? 'more_than_25km'
  );
  const [terrainCategory, setTerrainCategory] = useState<'0' | '1' | '2' | '3' | '4'>(
    extendedLoad.terrainCategory ?? windCalculatorSettings?.terrainCategory ?? '2'
  );
  const [formFactor, setFormFactor] = useState<'main_structure' | 'small_elements'>(
    extendedLoad.formFactor ?? windCalculatorSettings?.formFactor ?? 'main_structure'
  );
  const [windDirection, setWindDirection] = useState<number>(
    extendedLoad.windDirection ?? windCalculatorSettings?.windDirection ?? 0
  );
  
  // State for second set of wind load inputs
  const [ccDistance2, setCcDistance2] = useState<number | undefined>(extendedLoad.ccDistance2);
  const [areaLoad2, setAreaLoad2] = useState<number | undefined>(extendedLoad.areaLoad2);
  const [ccDistanceSuction2, setCcDistanceSuction2] = useState<number | undefined>(extendedLoad.ccDistanceSuction2);
  const [areaLoadSuction2, setAreaLoadSuction2] = useState<number | undefined>(extendedLoad.areaLoadSuction2);
  
  // Helper function to update both the load and shared wind calculator settings
  const updateWindCalculatorSetting = <K extends string>(
    key: K,
    value: any
  ) => {
    // Update the load
    onChange({
      ...load,
      [key]: value,
    } as ExtendedDistributedLoad);
    
    // Update the shared settings if available
    if (onWindCalculatorSettingsChange) {
      onWindCalculatorSettingsChange({ [key]: value });
    }
  };

  // Sync local state with shared wind calculator settings when they change
  React.useEffect(() => {
    if (windCalculatorSettings) {
      // Always use shared settings when load values are undefined (applies to new loads and loads without explicit values)
      if (extendedLoad.houseHeight === undefined) {
        setHouseHeight(windCalculatorSettings.houseHeight);
      }
      if (extendedLoad.houseWidth === undefined) {
        setHouseWidth(windCalculatorSettings.houseWidth);
      }
      if (extendedLoad.houseDepth === undefined) {
        setHouseDepth(windCalculatorSettings.houseDepth);
      }
      if (extendedLoad.houseRotation === undefined) {
        setCurrentHouseRotation(windCalculatorSettings.houseRotation ?? 0);
      }
      if (extendedLoad.roofType === undefined) {
        setRoofType(windCalculatorSettings.roofType ?? 'duopitch');
      }
      if (extendedLoad.flatRoofEdgeType === undefined) {
        setFlatRoofEdgeType(windCalculatorSettings.flatRoofEdgeType ?? 'sharp');
      }
      if (extendedLoad.parapetHeight === undefined) {
        setParapetHeight(windCalculatorSettings.parapetHeight);
      }
      if (extendedLoad.edgeRadius === undefined) {
        setEdgeRadius(windCalculatorSettings.edgeRadius);
      }
      if (extendedLoad.bevelAngle === undefined) {
        setBevelAngle(windCalculatorSettings.bevelAngle);
      }
      if (extendedLoad.roofPitch === undefined) {
        setRoofPitch(windCalculatorSettings.roofPitch);
      }
      if (extendedLoad.hippedMainPitch === undefined) {
        setHippedMainPitch(windCalculatorSettings.hippedMainPitch);
      }
      if (extendedLoad.hippedHipPitch === undefined) {
        setHippedHipPitch(windCalculatorSettings.hippedHipPitch);
      }
      if (extendedLoad.distanceToSea === undefined) {
        setDistanceToSea(windCalculatorSettings.distanceToSea ?? 'more_than_25km');
      }
      if (extendedLoad.terrainCategory === undefined) {
        setTerrainCategory(windCalculatorSettings.terrainCategory ?? '2');
      }
      if (extendedLoad.formFactor === undefined) {
        setFormFactor(windCalculatorSettings.formFactor ?? 'main_structure');
      }
      if (extendedLoad.windDirection === undefined) {
        setWindDirection(windCalculatorSettings.windDirection ?? 0);
      }
    }
  }, [windCalculatorSettings, load.id]); // Re-sync when wind calculator settings change or when switching to a different load
  
  // Wind calculations hook for automatic calculation
  const windCalculations = useWindCalculations({
    houseHeight,
    houseWidth,
    houseDepth,
    roofType,
    roofPitch,
    hippedMainPitch,
    hippedHipPitch,
    flatRoofEdgeType,
    parapetHeight,
    edgeRadius,
    bevelAngle,
    distanceToSea,
    terrainCategory,
    formFactor,
    windDirection,
    autoCalculate: load.type === LoadType.Wind && Boolean(houseHeight && houseWidth && houseDepth), // Only auto-calculate for wind loads when dimensions are set
  });

  // Function to calculate and set magnitudes
  const calculateMagnitudes = (newCcDistance?: number, newAreaLoad?: number) => {
    const cc = newCcDistance ?? ccDistance;
    const area = newAreaLoad ?? areaLoad;
    
    if (cc !== undefined && cc !== 0 && area !== undefined && area !== 0) {
      const calculatedMagnitude = cc * area;
      onChange({
        ...load,
        magnitude1: calculatedMagnitude,
        magnitude2: calculatedMagnitude,
        // Store the calculation inputs for persistence
        ccDistance: cc,
        areaLoad: area,
      } as ExtendedDistributedLoad);
    }
  };

  // Function to calculate and set suction magnitudes for wind loads
  const calculateSuctionMagnitudes = (newCcDistanceSuction?: number, newAreaLoadSuction?: number) => {
    const cc = newCcDistanceSuction ?? ccDistanceSuction;
    const area = newAreaLoadSuction ?? areaLoadSuction;
    
    if (cc !== undefined && cc !== 0 && area !== undefined && area !== 0) {
      const calculatedMagnitude = cc * area;
      onChange({
        ...load,
        // Store suction magnitudes in custom properties for wind loads
        magnitude1Suction: calculatedMagnitude,
        magnitude2Suction: calculatedMagnitude,
        // Store the calculation inputs for persistence
        ccDistanceSuction: cc,
        areaLoadSuction: area,
      } as ExtendedDistributedLoad);
    }
  };

  // Function to calculate and set magnitudes for second set
  const calculateMagnitudes2 = (newCcDistance2?: number, newAreaLoad2?: number) => {
    const cc = newCcDistance2 ?? ccDistance2;
    const area = newAreaLoad2 ?? areaLoad2;
    
    if (cc !== undefined && cc !== 0 && area !== undefined && area !== 0) {
      const calculatedMagnitude = cc * area;
      onChange({
        ...load,
        magnitude1_2: calculatedMagnitude,
        magnitude2_2: calculatedMagnitude,
        // Store the calculation inputs for persistence
        ccDistance2: cc,
        areaLoad2: area,
      } as ExtendedDistributedLoad);
    }
  };

  // Function to calculate and set suction magnitudes for second set
  const calculateSuctionMagnitudes2 = (newCcDistanceSuction2?: number, newAreaLoadSuction2?: number) => {
    const cc = newCcDistanceSuction2 ?? ccDistanceSuction2;
    const area = newAreaLoadSuction2 ?? areaLoadSuction2;
    
    if (cc !== undefined && cc !== 0 && area !== undefined && area !== 0) {
      const calculatedMagnitude = cc * area;
      onChange({
        ...load,
        // Store suction magnitudes in custom properties for wind loads
        magnitude1Suction2: calculatedMagnitude,
        magnitude2Suction2: calculatedMagnitude,
        // Store the calculation inputs for persistence
        ccDistanceSuction2: cc,
        areaLoadSuction2: area,
      } as ExtendedDistributedLoad);
    }
  };

  // Get disabled constraint types based on member orientation
  const disabledConstraintTypes = load.onMember?.id 
    ? getDisabledConstraintTypes(load.onMember.id, entitySet)
    : [];  // Get current X and Y coordinates for display when switching between constraint types
  const getStartCoordinates = () => {
    if (!load.onMember?.id) {
      return { x: 0, y: 0 };
    }
    
    const startConstraint = load.onMember.constraintStart;
    
    // Get the current X constraint value or fall back to resolved position
    const xConstraintValue = startConstraint.type === ConstraintType.X ? startConstraint.value : null;
    const yConstraintValue = startConstraint.type === ConstraintType.Y ? startConstraint.value : null;
    
    // For modify mode: use resolved position from entitySet
    // For add mode: calculate resolved position using resolver function
    let resolvedStart = { x: 0, y: 0 };
    
    if (entitySet.distributedLoads[load.id]?.resolved?.point1) {
      // Modify mode - load exists in entitySet
      resolvedStart = entitySet.distributedLoads[load.id].resolved.point1;
    } else {
      // Add mode - load doesn't exist in entitySet yet, calculate position
      const resolved = resolveDistributedLoadPosition(load, entitySet.nodes, entitySet.members);
      resolvedStart = resolved.resolved.point1;
    }
    
    return {
      x: xConstraintValue ?? resolvedStart.x,
      y: yConstraintValue ?? resolvedStart.y
    };
  };

  const getEndCoordinates = () => {
    if (!load.onMember?.id) {
      return { x: 0, y: 0 };
    }
    
    const endConstraint = load.onMember.constraintEnd;
    
    // Get the current X constraint value or fall back to resolved position
    const xConstraintValue = endConstraint.type === ConstraintType.X ? endConstraint.value : null;
    const yConstraintValue = endConstraint.type === ConstraintType.Y ? endConstraint.value : null;
    
    // For modify mode: use resolved position from entitySet
    // For add mode: calculate resolved position using resolver function
    let resolvedEnd = { x: 0, y: 0 };
    
    if (entitySet.distributedLoads[load.id]?.resolved?.point2) {
      // Modify mode - load exists in entitySet
      resolvedEnd = entitySet.distributedLoads[load.id].resolved.point2;
    } else {
      // Add mode - load doesn't exist in entitySet yet, calculate position
      const resolved = resolveDistributedLoadPosition(load, entitySet.nodes, entitySet.members);
      resolvedEnd = resolved.resolved.point2;
    }
    
    return {
      x: xConstraintValue ?? resolvedEnd.x,
      y: yConstraintValue ?? resolvedEnd.y
    };
  };  const startCoordinates = getStartCoordinates();
  const endCoordinates = getEndCoordinates();

  // Check for duplicate distributed load at same location
  const checkForDuplicate = (): boolean => {
    if (!load.magnitude1 || !load.magnitude2 || !load.type) return false;
    
    const currentPosition = resolveDistributedLoadPosition(
      load,
      entitySet.nodes,
      entitySet.members
    ).resolved;
    
    return Object.values(entitySet.distributedLoads).some((existingLoad) => {
      if (existingLoad.id === load.id) return false; // Don't check against self
      if (existingLoad.type === load.type && 
          existingLoad.magnitude1 === load.magnitude1 && 
          existingLoad.magnitude2 === load.magnitude2) {
        const existingPosition = resolveDistributedLoadPosition(
          existingLoad,
          entitySet.nodes,
          entitySet.members
        ).resolved;
        return (
          existingPosition.point1.x === currentPosition.point1.x &&
          existingPosition.point1.y === currentPosition.point1.y &&
          existingPosition.point2.x === currentPosition.point2.x &&
          existingPosition.point2.y === currentPosition.point2.y
        );
      }
      return false;
    });
  };

  const hasDuplicate = checkForDuplicate();  // Validation: both magnitudes cannot be zero at the same time
  // Also check for mixed positive/negative magnitudes and duplicates
  const mag1 = load.magnitude1 ?? 0;
  const mag2 = load.magnitude2 ?? 0;
  const bothZero = mag1 === 0 && mag2 === 0;
  const mixedSigns = mag1 !== 0 && mag2 !== 0 && Math.sign(mag1) !== Math.sign(mag2);
  const isSubmitDisabled = bothZero || mixedSigns || hasDuplicate;
  
  // Show error messages only for explicitly set zero values, not undefined/empty
  const showBothZeroError = load.magnitude1 === 0 && load.magnitude2 === 0;
  const showMixedSignsError = load.magnitude1 !== undefined && load.magnitude1 !== 0 && 
                              load.magnitude2 !== undefined && load.magnitude2 !== 0 && 
                              Math.sign(load.magnitude1) !== Math.sign(load.magnitude2);
  
  return (
    <Card 
      className="absolute z-30" 
      style={{ 
        width: load.type === LoadType.Wind ? '1200px' : '340px',
        ...(load.type === LoadType.Wind ? {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)'
        } : {})
      }}
    >
      <CardHeader>
        <span className="font-bold">Linjelast</span>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {/* Left section - main inputs */}
          <div className="flex-shrink-0" style={{ width: load.type === LoadType.Wind ? '454px' : '340px' }}>
            <div className="flex gap-3 mb-2 items-center">
              <div className="w-32 text-left flex-shrink-0">Type:</div>
              <div className="w-38 flex-shrink-0">
                <Select
                  className="w-full border rounded text-left"
                  value={load.type}
                  onChange={(ltype) => {
                    if (!ltype) return;
                    let angle: DistributedLoad["angle"] = {
                      relativeTo: "x",
                      value: 90,
                    };
                    if (ltype === LoadType.Wind) {
                      angle = { relativeTo: "member", value: 90 };
                    }
                    
                    // When changing to wind type, use shared wind calculation settings
                    const updatedLoad: ExtendedDistributedLoad = {
                      ...load,
                      angle,
                      type: ltype as LoadType,
                    };
                    
                    // If switching to wind type, populate with shared wind calculator settings
                    if (ltype === LoadType.Wind) {
                      if (windCalculatorSettings) {
                        updatedLoad.houseHeight = windCalculatorSettings.houseHeight;
                        updatedLoad.houseWidth = windCalculatorSettings.houseWidth;
                        updatedLoad.houseDepth = windCalculatorSettings.houseDepth;
                        updatedLoad.houseRotation = windCalculatorSettings.houseRotation;
                        updatedLoad.roofType = windCalculatorSettings.roofType;
                        updatedLoad.flatRoofEdgeType = windCalculatorSettings.flatRoofEdgeType;
                        updatedLoad.parapetHeight = windCalculatorSettings.parapetHeight;
                        updatedLoad.edgeRadius = windCalculatorSettings.edgeRadius;
                        updatedLoad.bevelAngle = windCalculatorSettings.bevelAngle;
                        updatedLoad.roofPitch = windCalculatorSettings.roofPitch;
                        updatedLoad.hippedMainPitch = windCalculatorSettings.hippedMainPitch;
                        updatedLoad.hippedHipPitch = windCalculatorSettings.hippedHipPitch;
                        updatedLoad.distanceToSea = windCalculatorSettings.distanceToSea;
                        updatedLoad.terrainCategory = windCalculatorSettings.terrainCategory;
                        updatedLoad.formFactor = windCalculatorSettings.formFactor;
                        updatedLoad.windDirection = windCalculatorSettings.windDirection;
                        
                        // Also update local state immediately to reflect the shared settings
                        setHouseHeight(windCalculatorSettings.houseHeight);
                        setHouseWidth(windCalculatorSettings.houseWidth);
                        setHouseDepth(windCalculatorSettings.houseDepth);
                        setCurrentHouseRotation(windCalculatorSettings.houseRotation ?? 0);
                        setRoofType(windCalculatorSettings.roofType ?? 'duopitch');
                        setFlatRoofEdgeType(windCalculatorSettings.flatRoofEdgeType ?? 'sharp');
                        setParapetHeight(windCalculatorSettings.parapetHeight);
                        setEdgeRadius(windCalculatorSettings.edgeRadius);
                        setBevelAngle(windCalculatorSettings.bevelAngle);
                        setRoofPitch(windCalculatorSettings.roofPitch);
                        setHippedMainPitch(windCalculatorSettings.hippedMainPitch);
                        setHippedHipPitch(windCalculatorSettings.hippedHipPitch);
                        setDistanceToSea(windCalculatorSettings.distanceToSea ?? 'more_than_25km');
                        setTerrainCategory(windCalculatorSettings.terrainCategory ?? '2');
                        setFormFactor(windCalculatorSettings.formFactor ?? 'main_structure');
                        setWindDirection(windCalculatorSettings.windDirection ?? 0);
                      }
                      
                      // Keep the load-specific properties (Zone 1 and 2 inputs)
                      updatedLoad.ccDistance = ccDistance;
                      updatedLoad.areaLoad = areaLoad;
                      updatedLoad.ccDistanceSuction = ccDistanceSuction;
                      updatedLoad.areaLoadSuction = areaLoadSuction;
                      updatedLoad.ccDistance2 = ccDistance2;
                      updatedLoad.areaLoad2 = areaLoad2;
                      updatedLoad.ccDistanceSuction2 = ccDistanceSuction2;
                      updatedLoad.areaLoadSuction2 = areaLoadSuction2;
                      updatedLoad.magnitude1Suction = extendedLoad.magnitude1Suction;
                      updatedLoad.magnitude2Suction = extendedLoad.magnitude2Suction;
                      updatedLoad.magnitude1Suction2 = extendedLoad.magnitude1Suction2;
                      updatedLoad.magnitude2Suction2 = extendedLoad.magnitude2Suction2;
                      updatedLoad.magnitude1_2 = extendedLoad.magnitude1_2;
                      updatedLoad.magnitude2_2 = extendedLoad.magnitude2_2;
                    }
                    
                    onChange(updatedLoad);
                  }}
                  options={LoadTypeOptions}
                />
              </div>
            </div>        {/* Show angle input only for Standard load type, but maintain spacing for all types */}
            {load.type === LoadType.Standard ? (
              <div className="flex gap-3 mb-2 items-center">
                <div className="w-32 text-left flex-shrink-0">Vinkel:</div>
                <div className="w-38 flex-shrink-0">
                  <NumberInput
                    value={load.angle?.value}
                    onChange={(value) =>
                      value !== undefined &&
                      onChange({
                        ...load,
                        angle: {
                          relativeTo: load.angle?.relativeTo ?? "x",
                          value,
                        },
                      })
                    }
                    unit="deg"
                    onEnter={onEnter}
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-3 mb-2 items-center">
                <div className="w-32 text-left flex-shrink-0"></div>
                <div className="flex-1 min-w-0"></div>          </div>            )}

            {/* Wind load specific inputs with pressure/suction columns */}
            {load.type === LoadType.Wind ? (
              <>
                {/* Zone 1 label and Header row */}
                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0 font-bold">Zone 1</div>
                  <div className="w-38 flex-shrink-0 text-center font-semibold">Tryk</div>
                  <div className="w-38 flex-shrink-0 text-center font-semibold">Sug</div>
                </div>
                
                {/* C/C afstand row */}
                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0">C/C afstand:</div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={ccDistance}
                      onChange={(value) => {
                        setCcDistance(value);
                        calculateMagnitudes(value, areaLoad);
                      }}
                      unit="m"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>              <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={ccDistanceSuction}
                      onChange={(value) => {
                        setCcDistanceSuction(value);
                        calculateSuctionMagnitudes(value, areaLoadSuction);
                      }}
                      unit="m"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>
                </div>

                {/* Fladelast row */}
                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0">Fladelast:</div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={areaLoad}
                      onChange={(value) => {
                        setAreaLoad(value);
                        calculateMagnitudes(ccDistance, value);
                      }}
                      unit="kN/m²"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>              <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={areaLoadSuction}
                      onChange={(value) => {
                        setAreaLoadSuction(value);
                        calculateSuctionMagnitudes(ccDistanceSuction, value);
                      }}
                      unit="kN/m²"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>
                </div>

                {/* Linjelast (start) row */}
                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0">Linjelast (start):</div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={load.magnitude1}
                      onChange={(magnitude1) => {
                        setCcDistance(undefined);
                        setAreaLoad(undefined);
                        const newMag1 = magnitude1;
                        let newMag2 = load.magnitude2;
                        if (newMag1 !== undefined && newMag1 !== 0 && (newMag2 === 0 || newMag2 === undefined)) {
                          newMag2 = newMag1;
                        }
                        const updatedLoad: ExtendedDistributedLoad = { ...load, magnitude1: newMag1, magnitude2: newMag2 };
                        delete updatedLoad.ccDistance;
                        delete updatedLoad.areaLoad;
                        onChange(updatedLoad);
                      }}
                      unit="kN/m"
                      onEnter={onEnter}                    />
                  </div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={extendedLoad.magnitude1Suction}
                      onChange={(magnitude1Suction) => {
                        // Clear c/c distance and area load when manually changing magnitude
                        setCcDistanceSuction(undefined);
                        setAreaLoadSuction(undefined);
                        
                        const newMag1Suction = magnitude1Suction;
                        let newMag2Suction = extendedLoad.magnitude2Suction;
                        
                        // Auto-fill magnitude2Suction when magnitude1Suction is first entered
                        if (newMag1Suction !== undefined && newMag1Suction !== 0 && (newMag2Suction === 0 || newMag2Suction === undefined)) {
                          newMag2Suction = newMag1Suction;
                        }
                        
                        // Remove stored calculation values when manually editing
                        const updatedLoad: ExtendedDistributedLoad = { 
                          ...load, 
                          magnitude1Suction: newMag1Suction, 
                          magnitude2Suction: newMag2Suction 
                        };
                        delete updatedLoad.ccDistanceSuction;
                        delete updatedLoad.areaLoadSuction;
                        
                        onChange(updatedLoad);
                      }}
                      unit="kN/m"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>
                </div>

                {/* Linjelast (slut) row */}
                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0">Linjelast (slut):</div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={load.magnitude2}
                      onChange={(magnitude2) => {
                        setCcDistance(undefined);
                        setAreaLoad(undefined);
                        const newMag2 = magnitude2;
                        const mag1 = load.magnitude1;
                        if (mag1 !== undefined && mag1 !== 0 && newMag2 !== undefined && newMag2 !== 0 && Math.sign(mag1) !== Math.sign(newMag2)) {
                          return;
                        }
                        const updatedLoad: ExtendedDistributedLoad = { ...load, magnitude2: newMag2 };
                        delete updatedLoad.ccDistance;
                        delete updatedLoad.areaLoad;
                        onChange(updatedLoad);
                      }}
                      unit="kN/m"
                      onEnter={onEnter}
                    />
                  </div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={extendedLoad.magnitude2Suction}
                      onChange={(magnitude2Suction) => {
                        // Clear c/c distance and area load when manually changing magnitude
                        setCcDistanceSuction(undefined);
                        setAreaLoadSuction(undefined);
                        
                        const newMag2Suction = magnitude2Suction;
                        const mag1Suction = extendedLoad.magnitude1Suction;
                        
                        // If magnitude1Suction is non-zero and user tries to enter a value with opposite sign, prevent the change
                        if (mag1Suction !== undefined && mag1Suction !== 0 && newMag2Suction !== undefined && newMag2Suction !== 0 && Math.sign(mag1Suction) !== Math.sign(newMag2Suction)) {
                          return;
                        }
                        
                        // Remove stored calculation values when manually editing
                        const updatedLoad: ExtendedDistributedLoad = { ...load, magnitude2Suction: newMag2Suction };
                        delete updatedLoad.ccDistanceSuction;
                        delete updatedLoad.areaLoadSuction;
                        
                        onChange(updatedLoad);
                      }}
                      unit="kN/m"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Standard inputs for non-wind loads */}
                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0">C/C afstand:</div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={ccDistance}
                      onChange={(value) => {
                        setCcDistance(value);
                        calculateMagnitudes(value, areaLoad);
                      }}
                      unit="m"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0">Fladelast:</div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={areaLoad}
                      onChange={(value) => {
                        setAreaLoad(value);
                        calculateMagnitudes(ccDistance, value);
                      }}
                      unit="kN/m²"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0">Linjelast (start):</div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={load.magnitude1}
                      onChange={(magnitude1) => {
                        setCcDistance(undefined);
                        setAreaLoad(undefined);
                        const newMag1 = magnitude1;
                        let newMag2 = load.magnitude2;
                        if (newMag1 !== undefined && newMag1 !== 0 && (newMag2 === 0 || newMag2 === undefined)) {
                          newMag2 = newMag1;
                        }
                        const updatedLoad: ExtendedDistributedLoad = { ...load, magnitude1: newMag1, magnitude2: newMag2 };
                        delete updatedLoad.ccDistance;
                        delete updatedLoad.areaLoad;
                        onChange(updatedLoad);
                      }}
                      unit="kN/m"
                      onEnter={onEnter}
                    />
                  </div>
                </div>

                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0">Linjelast (slut):</div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={load.magnitude2}
                      onChange={(magnitude2) => {
                        setCcDistance(undefined);
                        setAreaLoad(undefined);
                        const newMag2 = magnitude2;
                        const mag1 = load.magnitude1;
                        if (mag1 !== undefined && mag1 !== 0 && newMag2 !== undefined && newMag2 !== 0 && Math.sign(mag1) !== Math.sign(newMag2)) {
                          return;
                        }
                        const updatedLoad: ExtendedDistributedLoad = { ...load, magnitude2: newMag2 };
                        delete updatedLoad.ccDistance;
                        delete updatedLoad.areaLoad;
                        onChange(updatedLoad);
                      }}
                      unit="kN/m"
                      onEnter={onEnter}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Validation error messages */}
            {showBothZeroError && (
              <div className="text-red-500 text-sm mb-2">
                Begge størrelser kan ikke være nul på samme tid
              </div>
            )}
            {showMixedSignsError && (
              <div className="text-red-500 text-sm mb-2">
                Størrelser kan ikke have forskellige fortegn
              </div>
            )}
            {hasDuplicate && (
              <div className="text-red-500 text-sm mb-2">
                En linjelast af denne type og størrelse findes allerede på denne position
              </div>
            )}        <div className="flex gap-3 mb-2 items-center">
              <div className="w-32 text-left flex-shrink-0">Start:</div>
              <div className={load.type === LoadType.Wind ? "w-79 flex-shrink-0" : "w-38 flex-shrink-0"}>
                <ConstraintSelect
                  constraint={load.onMember.constraintStart}
                  setConstraint={(constraintStart) =>
                    onChange({
                      ...load,
                      onMember: { ...load.onMember, constraintStart },
                    })
                  }
                  disabledConstraintTypes={disabledConstraintTypes}
                  currentX={startCoordinates.x}
                  currentY={startCoordinates.y}
                />
              </div>
            </div>
            <div className="flex gap-3 items-center">
              <div className="w-32 text-left flex-shrink-0">Slut:</div>
              <div className={load.type === LoadType.Wind ? "w-79 flex-shrink-0" : "w-38 flex-shrink-0"}>
                <ConstraintSelect
                  constraint={load.onMember.constraintEnd}
                  setConstraint={(constraintEnd) =>
                    onChange({
                      ...load,
                      onMember: { ...load.onMember, constraintEnd },
                    })
                  }
                  disabledConstraintTypes={disabledConstraintTypes}
                  currentX={endCoordinates.x}
                  currentY={endCoordinates.y}
                />
              </div>
            </div>

            {/* Second set of wind load inputs - only for Wind type */}
            {load.type === LoadType.Wind && (
              <>
                {/* Grey separator between zones */}
                <div className="mt-4 mb-4 border-t border-gray-300"></div>
                
                {/* Zone 2 label and Header row */}
                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0 font-bold">Zone 2</div>
                  <div className="w-38 flex-shrink-0 text-center font-semibold">Tryk</div>
                  <div className="w-38 flex-shrink-0 text-center font-semibold">Sug</div>
                </div>
                
                {/* C/C afstand row */}
                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0">C/C afstand:</div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={ccDistance2}
                      onChange={(value) => {
                        setCcDistance2(value);
                        calculateMagnitudes2(value, areaLoad2);
                      }}
                      unit="m"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={ccDistanceSuction2}
                      onChange={(value) => {
                        setCcDistanceSuction2(value);
                        calculateSuctionMagnitudes2(value, areaLoadSuction2);
                      }}
                      unit="m"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>
                </div>

                {/* Fladelast row */}
                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0">Fladelast:</div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={areaLoad2}
                      onChange={(value) => {
                        setAreaLoad2(value);
                        calculateMagnitudes2(ccDistance2, value);
                      }}
                      unit="kN/m²"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={areaLoadSuction2}
                      onChange={(value) => {
                        setAreaLoadSuction2(value);
                        calculateSuctionMagnitudes2(ccDistanceSuction2, value);
                      }}
                      unit="kN/m²"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>
                </div>

                {/* Linjelast (start) row */}
                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0">Linjelast (start):</div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={extendedLoad.magnitude1_2}
                      onChange={(magnitude1_2) => {
                        setCcDistance2(undefined);
                        setAreaLoad2(undefined);
                        const newMag1_2 = magnitude1_2;
                        let newMag2_2 = extendedLoad.magnitude2_2;
                        if (newMag1_2 !== undefined && newMag1_2 !== 0 && (newMag2_2 === 0 || newMag2_2 === undefined)) {
                          newMag2_2 = newMag1_2;
                        }
                        const updatedLoad: ExtendedDistributedLoad = { ...load, magnitude1_2: newMag1_2, magnitude2_2: newMag2_2 };
                        delete updatedLoad.ccDistance2;
                        delete updatedLoad.areaLoad2;
                        onChange(updatedLoad);
                      }}
                      unit="kN/m"
                      onEnter={onEnter}
                    />
                  </div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={extendedLoad.magnitude1Suction2}
                      onChange={(magnitude1Suction2) => {
                        setCcDistanceSuction2(undefined);
                        setAreaLoadSuction2(undefined);
                        
                        const newMag1Suction2 = magnitude1Suction2;
                        let newMag2Suction2 = extendedLoad.magnitude2Suction2;
                        
                        if (newMag1Suction2 !== undefined && newMag1Suction2 !== 0 && (newMag2Suction2 === 0 || newMag2Suction2 === undefined)) {
                          newMag2Suction2 = newMag1Suction2;
                        }
                        
                        const updatedLoad: ExtendedDistributedLoad = { 
                          ...load, 
                          magnitude1Suction2: newMag1Suction2, 
                          magnitude2Suction2: newMag2Suction2 
                        };
                        delete updatedLoad.ccDistanceSuction2;
                        delete updatedLoad.areaLoadSuction2;
                        
                        onChange(updatedLoad);
                      }}
                      unit="kN/m"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>
                </div>

                {/* Linjelast (slut) row */}
                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0">Linjelast (slut):</div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={extendedLoad.magnitude2_2}
                      onChange={(magnitude2_2) => {
                        setCcDistance2(undefined);
                        setAreaLoad2(undefined);
                        const newMag2_2 = magnitude2_2;
                        const mag1_2 = extendedLoad.magnitude1_2;
                        if (mag1_2 !== undefined && mag1_2 !== 0 && newMag2_2 !== undefined && newMag2_2 !== 0 && Math.sign(mag1_2) !== Math.sign(newMag2_2)) {
                          return;
                        }
                        const updatedLoad: ExtendedDistributedLoad = { ...load, magnitude2_2: newMag2_2 };
                        delete updatedLoad.ccDistance2;
                        delete updatedLoad.areaLoad2;
                        onChange(updatedLoad);
                      }}
                      unit="kN/m"
                      onEnter={onEnter}
                    />
                  </div>
                  <div className="w-38 flex-shrink-0">
                    <NumberInput
                      value={extendedLoad.magnitude2Suction2}
                      onChange={(magnitude2Suction2) => {
                        setCcDistanceSuction2(undefined);
                        setAreaLoadSuction2(undefined);
                        
                        const newMag2Suction2 = magnitude2Suction2;
                        const mag1Suction2 = extendedLoad.magnitude1Suction2;
                        
                        if (mag1Suction2 !== undefined && mag1Suction2 !== 0 && newMag2Suction2 !== undefined && newMag2Suction2 !== 0 && Math.sign(mag1Suction2) !== Math.sign(newMag2Suction2)) {
                          return;
                        }
                        
                        const updatedLoad: ExtendedDistributedLoad = { ...load, magnitude2Suction2: newMag2Suction2 };
                        delete updatedLoad.ccDistanceSuction2;
                        delete updatedLoad.areaLoadSuction2;
                        
                        onChange(updatedLoad);
                      }}
                      unit="kN/m"
                      placeholder="valgfrit"
                      onEnter={onEnter}
                    />
                  </div>
                </div>

                {/* Slut coordinate only */}
                <div className="flex gap-3 items-center">
                  <div className="w-32 text-left flex-shrink-0">Slut:</div>
                  <div className="w-79 flex-shrink-0">
                    <ConstraintSelect
                      constraint={load.onMember.constraintEnd}
                      setConstraint={(constraintEnd) =>
                        onChange({
                          ...load,
                          onMember: { ...load.onMember, constraintEnd },
                        })
                      }
                      disabledConstraintTypes={disabledConstraintTypes}
                      currentX={endCoordinates.x}
                      currentY={endCoordinates.y}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Vertical separator and right section for wind loads */}
          {load.type === LoadType.Wind && (
            <>
              {/* Vertical gray separator */}
              <div className="w-px bg-gray-300 mx-2"></div>
              
              {/* Right section with 3D model inputs and house model */}
              <div className="flex-1 min-w-0">
                <div className="mb-4">
                  <h3 className="font-semibold mb-3 text-center">Vindlastberegner</h3>
                  
                  {/* Horizontal layout: inputs on left, compass view on right */}
                  <div className="flex gap-4">
                    {/* Left side: Wind load inputs */}
                    <div className="flex-1 space-y-3">
                    {/* Roof type dropdown */}
                    <div className="flex gap-3 items-center">
                      <div className="w-24 text-left flex-shrink-0">Tagtype:</div>
                      <div className="flex-1">
                        <Select
                          className="w-full border rounded text-left"
                          value={roofType}
                          onChange={(value) => {
                            if (!value) return;
                            const newRoofType = value as 'flat' | 'monopitch' | 'duopitch' | 'hipped';
                            setRoofType(newRoofType);
                            updateWindCalculatorSetting('roofType', newRoofType);
                          }}
                          options={RoofTypeOptions}
                        />
                      </div>
                    </div>
                    
                    {/* Roof pitch dropdown - only show when monopitch is selected */}
                    {roofType === 'monopitch' && (
                      <div className="flex gap-3 items-center">
                        <div className="w-24 text-left flex-shrink-0">Hældning:</div>
                        <div className="flex-1">
                          <NumberInput
                            value={roofPitch}
                            onChange={(value) => {
                              setRoofPitch(value);
                              updateWindCalculatorSetting('roofPitch', value);
                            }}
                            unit="°"
                            placeholder="taghældning"
                            onEnter={onEnter}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Roof pitch dropdown - only show when duopitch is selected */}
                    {roofType === 'duopitch' && (
                      <div className="flex gap-3 items-center">
                        <div className="w-24 text-left flex-shrink-0">Hældning:</div>
                        <div className="flex-1">
                          <NumberInput
                            value={roofPitch}
                            onChange={(value) => {
                              setRoofPitch(value);
                              updateWindCalculatorSetting('roofPitch', value);
                            }}
                            unit="°"
                            placeholder="taghældning"
                            onEnter={onEnter}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Roof pitch dropdowns - only show when hipped roof is selected */}
                    {roofType === 'hipped' && (
                      <>
                        <div className="flex gap-3 items-center">
                          <div className="w-24 text-left flex-shrink-0">Hældning 1:</div>
                          <div className="flex-1">
                            <NumberInput
                              value={hippedMainPitch}
                              onChange={(value) => {
                                setHippedMainPitch(value);
                                updateWindCalculatorSetting('hippedMainPitch', value);
                              }}
                              unit="°"
                              placeholder="hældning langs facaderne"
                              onEnter={onEnter}
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 items-center">
                          <div className="w-24 text-left flex-shrink-0">Hældning 2:</div>
                          <div className="flex-1">
                            <NumberInput
                              value={hippedHipPitch}
                              onChange={(value) => {
                                setHippedHipPitch(value);
                                updateWindCalculatorSetting('hippedHipPitch', value);
                              }}
                              unit="°"
                              placeholder="hældning på valmene"
                              onEnter={onEnter}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    
                    {/* Flat roof edge type dropdown - only show when flat roof is selected */}
                    {roofType === 'flat' && (
                      <div className="flex gap-3 items-center">
                        <div className="w-24 text-left flex-shrink-0">Tagkant:</div>
                        <div className="flex-1">
                          <Select
                            className="w-full border rounded text-left"
                            value={flatRoofEdgeType}
                            onChange={(value) => {
                              if (!value) return;
                              const newEdgeType = value as 'sharp' | 'parapet' | 'rounded' | 'beveled';
                              setFlatRoofEdgeType(newEdgeType);
                              updateWindCalculatorSetting('flatRoofEdgeType', newEdgeType);
                            }}
                            options={FlatRoofEdgeTypeOptions}
                          />
                        </div>
                      </div>
                    )}

                    {/* Conditional input based on flat roof edge type */}
                    {roofType === 'flat' && flatRoofEdgeType === 'parapet' && (
                      <div className="flex gap-3 items-center">
                        <div className="w-24 text-left flex-shrink-0">Brystning:</div>
                        <div className="flex-1">
                          <NumberInput
                            value={parapetHeight}
                            onChange={(value) => {
                              setParapetHeight(value);
                              updateWindCalculatorSetting('parapetHeight', value);
                            }}
                            unit="m"
                            placeholder="brystningshøjde"
                            onEnter={onEnter}
                          />
                        </div>
                      </div>
                    )}

                    {roofType === 'flat' && flatRoofEdgeType === 'rounded' && (
                      <div className="flex gap-3 items-center">
                        <div className="w-24 text-left flex-shrink-0">Radius:</div>
                        <div className="flex-1">
                          <NumberInput
                            value={edgeRadius}
                            onChange={(value) => {
                              setEdgeRadius(value);
                              updateWindCalculatorSetting('edgeRadius', value);
                            }}
                            unit="m"
                            placeholder="tagkant radius"
                            onEnter={onEnter}
                          />
                        </div>
                      </div>
                    )}

                    {roofType === 'flat' && flatRoofEdgeType === 'beveled' && (
                      <div className="flex gap-3 items-center">
                        <div className="w-24 text-left flex-shrink-0">Hældning:</div>
                        <div className="flex-1">
                          <NumberInput
                            value={bevelAngle}
                            onChange={(value) => {
                              setBevelAngle(value);
                              updateWindCalculatorSetting('bevelAngle', value);
                            }}
                            unit="°"
                            placeholder="tagkant hældning"
                            onEnter={onEnter}
                          />
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-3 items-center">
                      <div className="w-24 text-left flex-shrink-0">Højde:</div>
                      <div className="flex-1">
                        <NumberInput
                          value={houseHeight}
                          onChange={(value) => {
                            setHouseHeight(value);
                            updateWindCalculatorSetting('houseHeight', value);
                          }}
                          unit="m"
                          placeholder="højde"
                          onEnter={onEnter}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 items-center">
                      <div className="w-24 text-left flex-shrink-0">Bredde:</div>
                      <div className="flex-1">
                        <NumberInput
                          value={houseWidth}
                          onChange={(value) => {
                            setHouseWidth(value);
                            updateWindCalculatorSetting('houseWidth', value);
                          }}
                          unit="m"
                          placeholder="bredde"
                          onEnter={onEnter}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 items-center">
                      <div className="w-24 text-left flex-shrink-0">Dybde:</div>
                      <div className="flex-1">
                        <NumberInput
                          value={houseDepth}
                          onChange={(value) => {
                            setHouseDepth(value);
                            updateWindCalculatorSetting('houseDepth', value);
                          }}
                          unit="m"
                          placeholder="dybde"
                          onEnter={onEnter}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 items-center">
                      <div className="w-24 text-left flex-shrink-0">Afstand vesterhavet:</div>
                      <div className="flex-1">
                        <Select
                          className="w-full border rounded text-left"
                          value={distanceToSea}
                          onChange={(value) => {
                            if (!value) return;
                            const newDistanceToSea = value as 'more_than_25km' | 'less_than_25km';
                            setDistanceToSea(newDistanceToSea);
                            updateWindCalculatorSetting('distanceToSea', newDistanceToSea);
                          }}
                          options={DistanceToSeaOptions}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 items-center">
                      <div className="w-24 text-left flex-shrink-0">Terrænkat.:</div>
                      <div className="flex-1">
                        <Select
                          className="w-full border rounded text-left"
                          value={terrainCategory}
                          onChange={(value) => {
                            if (!value) return;
                            const newTerrainCategory = value as '0' | '1' | '2' | '3' | '4';
                            setTerrainCategory(newTerrainCategory);
                            updateWindCalculatorSetting('terrainCategory', newTerrainCategory);
                          }}
                          options={TerrainCategoryOptions}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 items-center">
                      <div className="w-24 text-left flex-shrink-0">Formfaktorer:</div>
                      <div className="flex-1">
                        <Select
                          className="w-full border rounded text-left"
                          value={formFactor}
                          onChange={(value) => {
                            if (!value) return;
                            const newFormFactor = value as 'main_structure' | 'small_elements';
                            setFormFactor(newFormFactor);
                            updateWindCalculatorSetting('formFactor', newFormFactor);
                          }}
                          options={FormFactorOptions}
                        />
                      </div>
                    </div>
                    </div>
                    
                    {/* Right side: Compass view */}
                    <div className="flex-1 min-w-0">
                      <div className="h-80 w-full">
                        <HouseCompassView
                          width={houseWidth ?? 10}
                          depth={houseDepth ?? 6}
                          height={houseHeight ?? 8}
                          roofType={roofType}
                          flatRoofEdgeType={flatRoofEdgeType}
                          parapetHeight={parapetHeight}
                          edgeRadius={edgeRadius}
                          bevelAngle={bevelAngle}
                          roofPitch={roofPitch}
                          hippedMainPitch={hippedMainPitch}
                          hippedHipPitch={hippedHipPitch}
                          rotation={currentHouseRotation}
                          onRotationChange={(rotation) => {
                            setCurrentHouseRotation(rotation);
                            updateWindCalculatorSetting('houseRotation', rotation);
                          }}
                        />
                      </div>
                      
                      {/* House rotation angle display */}
                      <div className="mt-2 text-center">
                        <div className="inline-block bg-blue-50 px-3 py-1 rounded border text-sm font-medium text-gray-700">
                          Hus vinkel: {Math.round(currentHouseRotation)}°
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 3D House Model */}
                <div className="h-48 w-full border rounded bg-gray-50">
                  <HouseOutline
                    width={houseWidth ?? 10}
                    height={houseHeight ?? 8}
                    depth={houseDepth ?? 6}
                    roofType={roofType}
                    flatRoofEdgeType={flatRoofEdgeType}
                    parapetHeight={parapetHeight}
                    edgeRadius={edgeRadius}
                    bevelAngle={bevelAngle}
                    roofPitch={roofPitch}
                    hippedMainPitch={hippedMainPitch}
                    hippedHipPitch={hippedHipPitch}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>      <CardFooter>
        <CardActionButtons
          submitDisabled={isSubmitDisabled}
          onSubmit={() => onSubmit(load as DistributedLoad)}
          onClose={onClose}
          onDelete={onDelete}
        />
      </CardFooter>
    </Card>
  );
};

export default ModifyDistributedLoadCard;
