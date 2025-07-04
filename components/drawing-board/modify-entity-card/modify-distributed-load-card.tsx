import { DistributedLoad, LoadType, ConstraintType } from "../lib/types";
import {
  Card,
  CardHeader,
  CardFooter,
  CardContent,
} from "@/components/ui/card";
import { EntitySet } from "../lib/reduce-history";
import NumberInput from "@/components/number-input";
import CardActionButtons from "@/components/card-action-buttons";
import { Select } from "@/components/select";
import ConstraintSelect from "./constraint-select/xy-only-select";
import { getDisabledConstraintTypes } from "../lib/validate-side-mounted-node";
import { resolveDistributedLoadPosition } from "../lib/reduce-history/resolve-position";
import { useState } from "react";

// Extended interface for DistributedLoad with additional calculation properties
interface ExtendedDistributedLoad extends DistributedLoad {
  ccDistance?: number;
  areaLoad?: number;
  ccDistanceSuction?: number;
  areaLoadSuction?: number;
  magnitude1Suction?: number;
  magnitude2Suction?: number;
}

const LoadTypeOptions = [
  { label: "Egenlast", value: LoadType.Dead },
  { label: "Nyttelast", value: LoadType.Live },
  { label: "Sne", value: LoadType.Snow },
  { label: "Vind", value: LoadType.Wind },
  { label: "Uden lastkombination", value: LoadType.Standard },
];

type ModifyDistributedLoadCardProps = {
  load: DistributedLoad;
  entitySet: EntitySet;
  onChange: (load: ExtendedDistributedLoad) => void;
  onSubmit: (load: DistributedLoad) => void;
  onClose: () => void;
  onDelete?: () => void;
};

const ModifyDistributedLoadCard: React.FC<ModifyDistributedLoadCardProps> = ({
  load,
  entitySet,
  onChange,
  onSubmit,
  onClose,
  onDelete,
}) => {  const onEnter = () => onSubmit(load as DistributedLoad);
    // State for c/c distance and area load calculations
  // Initialize from load properties if they exist
  const extendedLoad = load as ExtendedDistributedLoad;
  const [ccDistance, setCcDistance] = useState<number | undefined>(extendedLoad.ccDistance);
  const [areaLoad, setAreaLoad] = useState<number | undefined>(extendedLoad.areaLoad);
  
  // State for wind loads (pressure and suction)
  const [ccDistanceSuction, setCcDistanceSuction] = useState<number | undefined>(extendedLoad.ccDistanceSuction);
  const [areaLoadSuction, setAreaLoadSuction] = useState<number | undefined>(extendedLoad.areaLoadSuction);
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
                              Math.sign(load.magnitude1) !== Math.sign(load.magnitude2);  return (
    <Card className="absolute z-30" style={{ width: load.type === LoadType.Wind ? '500px' : '340px' }}>
      <CardHeader>
        <span className="font-bold">Linjelast</span>
      </CardHeader>
      <CardContent>        <div className="flex gap-3 mb-2 items-center">
          <div className="w-32 text-left flex-shrink-0">Type:</div>
          <div className="flex-1 min-w-0">            <Select
              className="w-full border rounded text-left"
              value={load.type}
              onChange={(ltype) => {
                let angle: DistributedLoad["angle"] = {
                  relativeTo: "x",
                  value: 90,
                };
                if (ltype === LoadType.Wind) {
                  angle = { relativeTo: "member", value: 90 };
                }
                onChange({
                  ...load,
                  angle,
                  type: ltype as LoadType,
                });
              }}
              options={LoadTypeOptions}
            />
          </div>
        </div>        {/* Show angle input only for Standard load type, but maintain spacing for all types */}
        {load.type === LoadType.Standard ? (
          <div className="flex gap-3 mb-2 items-center">
            <div className="w-32 text-left flex-shrink-0">Vinkel:</div>
            <div className="flex-1 min-w-0">
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
            <div className="flex-1 min-w-0"></div>          </div>        )}

        {/* Wind load specific inputs with pressure/suction columns */}
        {load.type === LoadType.Wind ? (
          <>
            {/* Header row */}
            <div className="flex gap-3 mb-2 items-center">
              <div className="w-32 text-left flex-shrink-0"></div>
              <div className="flex-1 text-center font-semibold">Tryk</div>
              <div className="flex-1 text-center font-semibold">Sug</div>
            </div>
            
            {/* C/C afstand row */}
            <div className="flex gap-3 mb-2 items-center">
              <div className="w-32 text-left flex-shrink-0">C/C afstand:</div>
              <div className="flex-1">
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
              </div>              <div className="flex-1">
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
              <div className="flex-1">
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
              </div>              <div className="flex-1">
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
              <div className="flex-1">
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
                  onEnter={onEnter}                />
              </div>
              <div className="flex-1">
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
              <div className="flex-1">
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
              <div className="flex-1">
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
              <div className="flex-1 min-w-0">
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
              <div className="flex-1 min-w-0">
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
              <div className="flex-1 min-w-0">
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
              <div className="flex-1 min-w-0">
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
        )}{/* Validation error messages */}
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
          <div className="flex-1 min-w-0">
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
          <div className="flex-1 min-w-0">
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
