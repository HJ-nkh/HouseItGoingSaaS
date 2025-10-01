import React from 'react';
import { DistributedLoad, LoadType, ConstraintType, WindCalculatorSettings } from "../lib/types";
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
import IntegerInput from "@/components/integer-input";

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
  onChange: (load: ExtendedDistributedLoad) => void;
  onSubmit: (load: DistributedLoad) => void;
  onClose: () => void;
  onDelete?: () => void;
  // Wind calculator integration (optional)
  windCalculatorSettings?: WindCalculatorSettings;
  onWindCalculatorSettingsChange?: (settings: Partial<WindCalculatorSettings>) => void;
  // When assigning the same load to multiple members, hide coordinate inputs
  hideCoordinateInputs?: boolean;
};

const ModifyDistributedLoadCard: React.FC<ModifyDistributedLoadCardProps> = ({
  load,
  entitySet,
  onChange,
  onSubmit,
  onClose,
  onDelete,
  windCalculatorSettings: _windCalculatorSettings,
  onWindCalculatorSettingsChange: _onWindCalculatorSettingsChange,
  hideCoordinateInputs,
}) => {  const onEnter = () => onSubmit(load as DistributedLoad);
    // State for c/c distance and area load calculations
  // Initialize from load properties if they exist
  const extendedLoad = load as ExtendedDistributedLoad;
  const [ccDistance, setCcDistance] = useState<number | undefined>(extendedLoad.ccDistance);
  const [areaLoad, setAreaLoad] = useState<number | undefined>(extendedLoad.areaLoad);
  
  // State for wind loads (pressure and suction)
  const [ccDistanceSuction, setCcDistanceSuction] = useState<number | undefined>(extendedLoad.ccDistanceSuction);
  const [areaLoadSuction, setAreaLoadSuction] = useState<number | undefined>(extendedLoad.areaLoadSuction);
  
  // State for second set of wind load inputs
  const [ccDistance2, setCcDistance2] = useState<number | undefined>(extendedLoad.ccDistance2);
  const [areaLoad2, setAreaLoad2] = useState<number | undefined>(extendedLoad.areaLoad2);
  const [ccDistanceSuction2, setCcDistanceSuction2] = useState<number | undefined>(extendedLoad.ccDistanceSuction2);
  const [areaLoadSuction2, setAreaLoadSuction2] = useState<number | undefined>(extendedLoad.areaLoadSuction2);

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
    >
      <CardHeader>
        <span className="font-bold">Linjelast</span>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          {/* Left section - main inputs */}
          <div className="flex-shrink-0">
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
                    
                    const updatedLoad: ExtendedDistributedLoad = {
                      ...load,
                      angle,
                      type: ltype as LoadType,
                    };
                    
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

            {/* Flip control (Wind only) moved under 'Linjelast (slut)' */}

              <>
                {/* Standard inputs for non-wind loads */}
                <div className="flex gap-3 mb-2 items-center">
                  <div className="w-32 text-left flex-shrink-0">Lastopland:</div>
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

                {/* Flip switch styled like supports; shown only for Wind */}
                {load.type === LoadType.Wind && (
                  <div className="flex gap-3 mb-2 items-center">
                    <div className="w-32 text-left flex-shrink-0">Flip retning:</div>
                    <div className="w-38 flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={Boolean((load as any).windFlip)}
                        onClick={() =>
                          onChange({
                            ...load,
                            windFlip: !((load as any).windFlip),
                          } as ExtendedDistributedLoad)
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          (load as any).windFlip ? "bg-sky-500" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            (load as any).windFlip ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <span className="text-gray-500 text-xs"></span>
                    </div>
                  </div>
                )}
              </>

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
            )}

        {!hideCoordinateInputs && <div className="flex gap-3 mb-2 items-center">
          <div className="w-32 text-left flex-shrink-0">Start:</div>
          <div className="w-38 flex-shrink-0">
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
            </div>}
            {!hideCoordinateInputs && <div className="flex gap-3 items-center">
          <div className="w-32 text-left flex-shrink-0">Slut:</div>
          <div className="w-38 flex-shrink-0">
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
          </div>}
        </div>

        </div>
        {load.type === LoadType.Live && (
          <div className="flex gap-3 mt-2 items-center">
            <div className="w-32 text-left flex-shrink-0">N etager over:</div>
            <div className="w-38 flex-shrink-0">
              <IntegerInput
                value={load.floorsAbove ?? 1}
                onChange={(v) => onChange({ ...load, floorsAbove: v ?? 1 })}
                min={1}
              />
            </div>
          </div>
        )}
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
