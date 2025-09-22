import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Select } from "@/components/select";
import NumberInput from "@/components/number-input";
import { MomentLoad, LoadType } from "../lib/types";
import { EntitySet } from "../lib/reduce-history";
import CardActionButtons from "@/components/card-action-buttons";
import { useState, useEffect } from "react";
import { Constraint, ConstraintType } from "../lib/types";
import XYConstraintSelect from "./constraint-select/xy-only-select";
import { getDisabledConstraintTypes } from "../lib/validate-side-mounted-node";
import { resolveMomentLoadPosition } from "../lib/reduce-history/resolve-position";

const LoadTypeOptions = [
  { label: "Egenlast", value: LoadType.Dead },
  { label: "Nyttelast", value: LoadType.Live },
  { label: "Sne", value: LoadType.Snow },
  { label: "Vind", value: LoadType.Wind },
  { label: "Uden lastkombination", value: LoadType.Standard },
];

// type ValueSelectProps = {
//   nodeOrMember: string | undefined;
//   load: Partial<MomentLoad>;
//   onChange: (updated: Partial<MomentLoad>) => void;
//   entitySet: EntitySet;
// };

// const ValueSelect: React.FC<ValueSelectProps> = ({
//   nodeOrMember,
//   load,
//   onChange,
//   entitySet,
// }) => {
//   if (nodeOrMember === "node") {
//     return (
//       <Select
//         className="w-20"
//         value={load.onNode?.id}
//         onChange={(nodeId) => nodeId && onChange({ onNode: { id: nodeId } })}
//         options={Object.keys(entitySet.nodes).map((nodeId) => ({
//           label: nodeId,
//           value: nodeId,
//         }))}
//       />
//     );
//   }

//   if (nodeOrMember === "member") {
//     // TODO: Find a way to select a constraint
//     return (
//       <>
//         <Select
//           className="w-20"
//           value={load.onMember?.id}
//           onChange={(memberId) =>
//             memberId &&
//             onChange({
//               onMember: {
//                 id: memberId,
//                 constraint: { type: ConstraintType.X, value: 0 },
//               },
//             })
//           }
//           options={Object.keys(entitySet.members).map((memberId) => ({
//             label: memberId,
//             value: memberId,
//           }))}
//         />
//       </>
//     );
//   }
// };

type ModifyMomentLoadCardProps = {
  load: MomentLoad;
  entitySet: EntitySet;
  onChange: (load: MomentLoad) => void;
  onSubmit: () => void;
  onClose: () => void;
  onDelete?: () => void;
  hideCoordinateInputs?: boolean;
};

const ModifyMomentLoadCard: React.FC<ModifyMomentLoadCardProps> = ({
  load,
  entitySet,
  onChange,
  onSubmit,
  onClose,
  onDelete,
  hideCoordinateInputs,
}) => {
  const isMember = !!load.onMember;
  const [constraint, setConstraint] = useState<Partial<Constraint>>(
    load.onMember?.constraint ?? { type: ConstraintType.X, value: 0 }
  );
  // Get disabled constraint types based on member orientation
  const disabledConstraintTypes = isMember && load.onMember?.id 
    ? getDisabledConstraintTypes(load.onMember.id, entitySet)
    : [];

  // Check for duplicate moment load at same location
  const checkForDuplicate = (): boolean => {
    if (!load.magnitude || !load.type) return false;
    
    const currentPosition = resolveMomentLoadPosition(
      load,
      entitySet.nodes,
      entitySet.members
    ).resolved;
    
    return Object.values(entitySet.momentLoads).some((existingLoad) => {
      if (existingLoad.id === load.id) return false; // Don't check against self
      if (existingLoad.type === load.type && existingLoad.magnitude === load.magnitude) {
        const existingPosition = resolveMomentLoadPosition(
          existingLoad,
          entitySet.nodes,
          entitySet.members
        ).resolved;
        return existingPosition.x === currentPosition.x && existingPosition.y === currentPosition.y;
      }
      return false;
    });
  };

  const hasDuplicate = checkForDuplicate();// Get current X and Y coordinates for display when switching between constraint types
  const getCurrentCoordinates = () => {
    if (!isMember || !load.onMember?.id) {
      return { x: 0, y: 0 };
    }
    
    const currentConstraint = constraint as Constraint;
    
    // Get the current X constraint value or fall back to resolved position
    const xConstraintValue = currentConstraint.type === ConstraintType.X ? currentConstraint.value : null;
    const yConstraintValue = currentConstraint.type === ConstraintType.Y ? currentConstraint.value : null;
    
    // For modify mode: use resolved position from entitySet
    // For add mode: calculate resolved position using resolver function
    let resolvedPosition = { x: 0, y: 0 };
    
    if (entitySet.momentLoads[load.id]?.resolved) {
      // Modify mode - load exists in entitySet
      resolvedPosition = entitySet.momentLoads[load.id].resolved;
    } else {
      // Add mode - load doesn't exist in entitySet yet, calculate position
      const resolved = resolveMomentLoadPosition(load, entitySet.nodes, entitySet.members);
      resolvedPosition = resolved.resolved;
    }
    
    return {
      x: xConstraintValue ?? resolvedPosition.x,
      y: yConstraintValue ?? resolvedPosition.y
    };
  };  const currentCoordinates = getCurrentCoordinates();

  // Validation: magnitude cannot be zero or empty, and no duplicates allowed
  const isSubmitDisabled = (load.magnitude ?? 0) === 0 || hasDuplicate;
  const showZeroError = load.magnitude === 0; // Only show error if explicitly set to 0, not if undefined/empty

  useEffect(() => {    if (isMember && load.onMember) {
      onChange({
        ...load,
        onMember: { id: load.onMember.id, constraint: constraint as Constraint },
      });
    }
  }, [constraint]);

  if (!load) {
    return null;
  }  return (
    <Card className="absolute z-30 min-w-fit max-w-md">
      <CardHeader className="mb-2 font-bold">Moment</CardHeader>

      {/* Attention Notice */}
      {load.needsAttention && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-medium text-red-800">Position skal opdateres</span>
          </div>
          <p className="text-sm text-red-700">{load.attentionReason}</p>
          <p className="text-sm text-gray-600 mt-2">
            Rediger koordinat nedenfor for at tildele ny position.
          </p>
        </div>
      )}

      <CardContent>        {isMember && !hideCoordinateInputs && (
          <div className="mb-2">
            <XYConstraintSelect
              constraint={constraint as Constraint}
              setConstraint={(newConstraint) => {
                // Clear attention flag when user manually changes coordinates
                if (load.needsAttention) {
                  onChange({
                    ...load,
                    needsAttention: false,
                    attentionReason: undefined,
                  });
                }
                setConstraint(newConstraint);
              }}
              onEnter={onSubmit}
              disabledConstraintTypes={disabledConstraintTypes}
              currentX={currentCoordinates.x}
              currentY={currentCoordinates.y}
            />
          </div>
        )}        <div className="flex gap-3 mb-2 items-center">
          <div className="w-32 text-left flex-shrink-0">Lasttype:</div>
          <div className="flex-1 min-w-0">
            <Select
              className="w-full min-w-fit border rounded text-left"
              value={load.type}
              onChange={(type) => {
                onChange({
                  ...load,
                  type: type as LoadType,
                });
              }}
              options={LoadTypeOptions}
            />
          </div>
        </div>        <div className="flex gap-3 mb-2 items-center">
          <div className="w-32 text-left flex-shrink-0">Størrelse:</div>
          <div className="w-24">
            <NumberInput
              value={load.magnitude}
              onChange={(magnitude) =>
                onChange({ ...load, magnitude })
              }
              unit="kN"
              onEnter={onSubmit}
            />
          </div>
        </div>{/* Validation error messages */}
        {showZeroError && (
          <div className="text-red-500 text-sm mb-2">
            Størrelse kan ikke være nul
          </div>
        )}
        
        {hasDuplicate && (
          <div className="text-red-500 text-sm mb-2">
            Et moment af denne type og størrelse findes allerede på denne position
          </div>
        )}</CardContent><CardFooter>
        <CardActionButtons
          submitDisabled={isSubmitDisabled}
          onSubmit={() => {
            // Clear attention flag when submitting
            if (load.needsAttention) {
              onChange({
                ...load,
                needsAttention: false,
                attentionReason: undefined,
              });
            }
            onSubmit();
          }}
          onClose={onClose}
          onDelete={onDelete}
        />
      </CardFooter>
    </Card>
  );
};

export default ModifyMomentLoadCard;
