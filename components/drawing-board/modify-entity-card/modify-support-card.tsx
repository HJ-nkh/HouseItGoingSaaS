import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Support, SupportType } from "../lib/types";
import CardActionButtons from "../../card-action-buttons";
import NumberInput from "../../number-input";
import { useState, useEffect } from "react";
import { Constraint, ConstraintType } from "../lib/types";
import XYConstraintSelect from "./constraint-select/xy-only-select";
import { EntitySet } from "../lib/reduce-history";
import { getDisabledConstraintTypes } from "../lib/validate-side-mounted-node";
import { resolveSupportPosition } from "../lib/reduce-history/resolve-position";

const supportTypeOptions = [
  { label: "Simpel understøttet", value: SupportType.Pinned },
  { label: "Rulleunderstøttet", value: SupportType.Roller },
  { label: "Fast indspændt", value: SupportType.Fixed },
];

type ModifySupportCardProps = {
  support: Support;
  entitySet: EntitySet;
  onChange: (support: Support) => void;
  onSubmit: (support: Support) => void;
  onClose: () => void;
  onDelete: () => void;
};

const ModifySupportCard: React.FC<ModifySupportCardProps> = ({
  support,
  entitySet,
  onSubmit,
  onChange,
  onClose,
  onDelete,
}) => {
  const [constraint, setConstraint] = useState<Partial<Constraint>>(
    support.onMember?.constraint ?? { type: ConstraintType.X, value: 0 }
  );
  const isMember = !!support.onMember;
  
  // Get disabled constraint types based on member orientation
  const disabledConstraintTypes = isMember && support.onMember?.id 
    ? getDisabledConstraintTypes(support.onMember.id, entitySet)
    : [];

  // Get current X and Y coordinates for display when switching between constraint types
  const getCurrentCoordinates = () => {
    if (!isMember || !support.onMember?.id) {
      return { x: 0, y: 0 };
    }
    
    const currentConstraint = constraint as Constraint;
    
    // Get the current X constraint value or fall back to resolved position
    const xConstraintValue = currentConstraint.type === ConstraintType.X ? currentConstraint.value : null;
    const yConstraintValue = currentConstraint.type === ConstraintType.Y ? currentConstraint.value : null;
    
    // For modify mode: use resolved position from entitySet
    // For add mode: calculate resolved position using resolver function
    let resolvedPosition = { x: 0, y: 0 };
    
    if (entitySet.supports[support.id]?.resolved) {
      // Modify mode - support exists in entitySet
      resolvedPosition = entitySet.supports[support.id].resolved;
    } else {
      // Add mode - support doesn't exist in entitySet yet, calculate position
      const resolved = resolveSupportPosition(support, entitySet.nodes, entitySet.members);
      resolvedPosition = resolved.resolved;
    }
    
    return {
      x: xConstraintValue ?? resolvedPosition.x,
      y: yConstraintValue ?? resolvedPosition.y
    };
  };

  const currentCoordinates = getCurrentCoordinates();

  // Check for duplicate support at same location
  const checkForDuplicate = (): boolean => {
    const currentPosition = resolveSupportPosition(
      support,
      entitySet.nodes,
      entitySet.members
    ).resolved;
    
    return Object.values(entitySet.supports).some((existingSupport) => {
      if (existingSupport.id === support.id) return false; // Don't check against self
      const existingPosition = resolveSupportPosition(
        existingSupport,
        entitySet.nodes,
        entitySet.members
      ).resolved;
      return existingPosition.x === currentPosition.x && existingPosition.y === currentPosition.y;
    });
  };

  const hasDuplicate = checkForDuplicate();
  const isSubmitDisabled = hasDuplicate;  useEffect(() => {
    if (isMember && support.onMember) {
      onChange({
        ...support,
        onMember: { id: support.onMember.id, constraint: constraint as Constraint },
      });
    }
  }, [constraint]);
  return (
    <Card className="absolute z-30 min-w-fit max-w-md">
      <CardHeader className="mb-2 font-bold">Understøtning</CardHeader>

      <CardContent>        {isMember && (
          <div className="mb-2">
            <XYConstraintSelect
              constraint={constraint as Constraint}
              setConstraint={setConstraint}
              onEnter={() => onSubmit(support)}
              disabledConstraintTypes={disabledConstraintTypes}
              currentX={currentCoordinates.x}
              currentY={currentCoordinates.y}
            />
          </div>
        )}        <div className="flex gap-3 mb-2 items-center">
          <div className="w-32 text-left flex-shrink-0">Type:</div>
          <div className="flex-1 min-w-0">
            <Select
              className="w-full min-w-fit text-left"
              value={support.type}
              onChange={(type) =>
                onChange({ ...support, type: type as SupportType })
              }
              options={supportTypeOptions}
            />
          </div>
        </div>        {support.type === SupportType.Roller && (
          <div className="flex gap-3 mb-2 items-center">
            <div className="w-32 text-left flex-shrink-0">Vinkel:</div>
            <div className="w-24">
              <NumberInput
                value={support.angle}
                onChange={(angle) =>
                  angle !== undefined && onChange({ ...support, angle })
                }
                unit="deg"
                onEnter={() => onSubmit(support)}
              />
            </div>
          </div>
        )}

        {/* Validation error message */}
        {hasDuplicate && (
          <div className="text-red-500 text-sm mb-2">
            En understøtning findes allerede på denne position
          </div>
        )}
      </CardContent>

      <CardFooter>
        <CardActionButtons
          submitDisabled={isSubmitDisabled}
          onSubmit={() => onSubmit(support)}
          onClose={onClose}
          onDelete={onDelete}
        />
      </CardFooter>
    </Card>
  );
};

export default ModifySupportCard;
