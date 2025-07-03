import { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { EntitySet } from "../lib/reduce-history";
import { Node, Constraint, Assembly, ConstraintType, Entity } from "../lib/types";
import XYCoordinatesInput from "./xy-coordinates-input";
import XYConstraintSelect from "./constraint-select/xy-only-select";
import CardActionButtons from "../../card-action-buttons";
import { Select } from "@/components/ui/select";
import { isConstraintPairValid } from "../lib/constraint-validation";
import { isSideMountedNode } from "../lib/is-side-mounted-node";
import { getDependencies } from "../lib/dependencies";
import getEntityType from "../lib/get-entity-type";
import { validateSideMountedNodeConstraint, getDisabledConstraintTypes } from "../lib/validate-side-mounted-node";
import { structuralToScreenCoords, screenToStructuralCoords } from "../lib/coordinate-conversion";
import { validateNodeModification } from "../lib/validate-zero-length-member";

const assemblyOptions = [
  { label: "Hængsel", value: Assembly.Hinge },
  { label: "Momentstiv", value: Assembly.Stiff },
];

// Helper function to get the member that a side-mounted node is attached to
const getAttachedMemberId = (nodeId: string, entitySet: EntitySet): string | null => {
  const dependsOnMemberIds = getDependencies(nodeId, entitySet).filter(
    (id) => getEntityType(id) === Entity.Member
  );
  
  // Side-mounted nodes depend on exactly one member
  return dependsOnMemberIds.length === 1 ? dependsOnMemberIds[0] : null;
};

type ModifyNodeCardProps = {
  entitySet: EntitySet;
  node: Node;
  onSubmit: (assembly: Assembly | undefined) => void;
  onChange: (node: Node) => void;
  onClose: () => void;
  onDelete: () => void;
  initialAssembly?: Assembly;
};

const ModifyNodeCard: React.FC<ModifyNodeCardProps> = ({
  entitySet,
  node,
  onSubmit,
  onChange,
  onClose,
  onDelete,
  initialAssembly,
}) => {  const [constraint1, setConstraint1] = useState<Partial<Constraint>>(
    node?.constraint1 ?? {}
  );
  const [constraint2, setConstraint2] = useState<Partial<Constraint>>(
    node?.constraint2 ?? {}
  );
  const [assembly, setAssembly] = useState(initialAssembly);
  const [validationError, setValidationError] = useState<string | null>(null);
  // Check if this node is side-mounted
  const isSideMounted = isSideMountedNode(node.id, entitySet);
  const attachedMemberId = isSideMounted ? getAttachedMemberId(node.id, entitySet) : null;
    // Calculate disabled constraint types for side-mounted nodes
  const disabledConstraintTypes = attachedMemberId 
    ? getDisabledConstraintTypes(attachedMemberId, entitySet) 
    : [];  // Calculate current X and Y values for display (convert to screen coordinates)
  const getCurrentCoordinates = () => {
    // For both side-mounted and non-side-mounted nodes, get coordinates from local constraints
    const xConstraint = (constraint1 as Constraint)?.type === ConstraintType.X ? constraint1 as Constraint 
                      : (constraint2 as Constraint)?.type === ConstraintType.X ? constraint2 as Constraint 
                      : null;
    const yConstraint = (constraint1 as Constraint)?.type === ConstraintType.Y ? constraint1 as Constraint 
                      : (constraint2 as Constraint)?.type === ConstraintType.Y ? constraint2 as Constraint 
                      : null;
    
    const structuralCoords = {
      x: xConstraint?.value ?? entitySet.nodes[node.id].resolved.x,
      y: yConstraint?.value ?? entitySet.nodes[node.id].resolved.y
    };

    return {
      structural: structuralCoords,
      screen: structuralToScreenCoords(structuralCoords)
    };
  };

  const currentCoordinates = getCurrentCoordinates();
  // Sync local state with incoming node when node changes
  useEffect(() => {
    setValidationError(null); // Clear any validation errors when switching nodes

    if (isSideMounted && attachedMemberId) {
      // For side-mounted nodes, automatically set member constraint and preserve coordinate constraint
      const memberConstraint: Constraint = {
        type: ConstraintType.Member,
        value: 0,
        memberId: attachedMemberId,
      };
      
      // Determine which constraint is the coordinate constraint
      const coordinateConstraint = 
        node.constraint1?.type === ConstraintType.X || node.constraint1?.type === ConstraintType.Y 
          ? node.constraint1 
          : node.constraint2?.type === ConstraintType.X || node.constraint2?.type === ConstraintType.Y
          ? node.constraint2
          : { type: ConstraintType.X, value: 0 }; // Default to X if no coordinate constraint found

      setConstraint1(memberConstraint);
      setConstraint2(coordinateConstraint);      // Validate the current position of the side-mounted node on initial load
      if (coordinateConstraint.type && coordinateConstraint.value !== undefined && 
          (coordinateConstraint.type === ConstraintType.X || coordinateConstraint.type === ConstraintType.Y)) {
        const validation = validateSideMountedNodeConstraint(
          attachedMemberId,
          coordinateConstraint.type,
          coordinateConstraint.value,
          entitySet
        );
        if (!validation.isValid) {
          setValidationError(validation.error || "Ugyldig position");
        }
      }
    } else {
      setConstraint1(node?.constraint1 ?? {});
      setConstraint2(node?.constraint2 ?? {});
    }  }, [node.id, isSideMounted, attachedMemberId, entitySet]);

  const isValid = isSideMounted ? 
    isConstraintPairValid({
      constraint1: constraint1 as Constraint,
      constraint2: constraint2 as Constraint,
    }) && !validationError : 
    !validationError; // For non-side-mounted nodes, valid if no validation error
  
  useEffect(() => {
    if (isSideMounted && isValid) {
      onChange({
        ...node,
        constraint1: constraint1 as Constraint,
        constraint2: constraint2 as Constraint,
      });
    } else if (!isSideMounted) {
      // For non-side-mounted nodes, update with X/Y constraints
      const updatedNode = {
        ...node,
        constraint1: constraint1 as Constraint,
        constraint2: constraint2 as Constraint,
      };
      onChange(updatedNode);
    }
  }, [constraint1, constraint2, isSideMounted, isValid]);

  if (!node) {
    return null;
  }  return (
    <Card className="relative z-20">
      <CardHeader className="mb-2 font-bold">Knude</CardHeader>
        {/* Attention Notice */}
      {node.needsAttention && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-medium text-red-800">Position skal opdateres</span>
          </div>
          <p className="text-sm text-red-700">{node.attentionReason}</p>
          <p className="text-sm text-gray-600 mt-2">
            Rediger koordinat nedenfor for at tildele ny position.
          </p>
        </div>
      )}

      <CardContent><div className="mb-2">
          {isSideMounted ? (            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                Koordinat relativ til forbundet konstruktionsdel
              </div>
              {validationError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {validationError}
                </div>
              )}              <XYConstraintSelect
                constraint={constraint2 as Constraint}                setConstraint={(constraint) => {                  // Validate the new constraint value
                  if (attachedMemberId && (constraint.type === ConstraintType.X || constraint.type === ConstraintType.Y)) {
                    const validation = validateSideMountedNodeConstraint(
                      attachedMemberId,
                      constraint.type,
                      constraint.value,
                      entitySet
                    );
                      if (!validation.isValid) {
                      setValidationError(validation.error || "Ugyldig værdi");
                      // Don't use corrected value - let the user decide
                      // Just set the constraint with the user's input value
                      setConstraint2(constraint);
                      return;
                    } else {
                      setValidationError(null);
                    }
                  }
                  
                  // Clear attention flag when user manually changes coordinates
                  if (node.needsAttention) {
                    onChange({
                      ...node,
                      needsAttention: false,
                      attentionReason: undefined,
                    });
                  }
                  
                  setConstraint2(constraint);                }}onEnter={() => isValid && onSubmit(assembly)}
                disabledConstraintTypes={disabledConstraintTypes}
                currentX={currentCoordinates.structural.x}
                currentY={currentCoordinates.structural.y}
              />
            </div>          ) : (            <XYCoordinatesInput
              x={currentCoordinates.screen.x}
              y={currentCoordinates.screen.y}
              onChange={(coords) => {
                // Convert screen coordinates back to structural coordinates for storage
                const structuralCoords = screenToStructuralCoords(coords);
                
                // Validate that moving this node won't cause zero-length members
                const validation = validateNodeModification(node.id, structuralCoords, entitySet);
                if (!validation.isValid) {
                  setValidationError(validation.error || "Ugyldig position");
                  return; // Don't update coordinates if validation fails
                }
                  setValidationError(null); // Clear any previous errors
                
                // Clear attention flag when user manually changes coordinates
                const updatedNode = {
                  ...node,
                  constraint1: {
                    type: ConstraintType.X,
                    value: structuralCoords.x,
                  },
                  constraint2: {
                    type: ConstraintType.Y,
                    value: structuralCoords.y,
                  },
                  needsAttention: false,
                  attentionReason: undefined,
                };
                
                // Update both constraints to X/Y coordinates
                setConstraint1({
                  type: ConstraintType.X,
                  value: structuralCoords.x,
                });
                setConstraint2({
                  type: ConstraintType.Y,
                  value: structuralCoords.y,                });
                onChange(updatedNode);
              }}
              onEnter={() => onSubmit(assembly)}
            />
          )}
          {validationError && !isSideMounted && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded mt-2">
              {validationError}
            </div>
          )}
        </div>
        {initialAssembly && (
          <div className="mt-2">
            <Select
              className="w-full"
              value={assembly}
              onChange={(v: string | undefined) => setAssembly(v as Assembly)}
              options={assemblyOptions}
            />
          </div>
        )}
      </CardContent>
      <CardFooter>        <CardActionButtons
          submitDisabled={!isValid}
          onSubmit={() => {
            // Clear attention flag when submitting
            if (node.needsAttention) {
              onChange({
                ...node,
                needsAttention: false,
                attentionReason: undefined,
              });
            }
            onSubmit(assembly);
          }}
          onClose={onClose}
          onDelete={onDelete}
          deleteDisabled={node.dependants && node.dependants?.length > 0}
        />
      </CardFooter>
    </Card>
  );
};

export default ModifyNodeCard;
