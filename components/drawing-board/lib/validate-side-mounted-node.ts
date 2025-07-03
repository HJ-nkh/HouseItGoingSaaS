import { EntitySet } from "./reduce-history";
import { ConstraintType } from "./types";
import { getSlope, intersectionWithX, intersectionWithY } from "./geometry";

/**
 * Validates that a side-mounted node constraint keeps the node within the bounds of its attached member
 * and respects the orientation constraints (horizontal/vertical member limitations)
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  correctedValue?: number;
}

export const validateSideMountedNodeConstraint = (
  attachedMemberId: string,
  constraintType: ConstraintType.X | ConstraintType.Y,
  constraintValue: number,
  entitySet: EntitySet
): ValidationResult => {
  const member = entitySet.members[attachedMemberId];
  if (!member) {
    return { isValid: false, error: "Attached member not found" };
  }

  const memberLine = member.resolved;
  const slope = getSlope(memberLine);
  const isHorizontal = Math.abs(slope) < 0.01; // Nearly horizontal
  const isVertical = Math.abs(slope) > 100; // Nearly vertical

  // Check orientation constraints
  if (isHorizontal && constraintType === ConstraintType.Y) {
    return { 
      isValid: false, 
      error: "Y-koordinat kan ikke ændres for vandret konstruktionsdel",
      correctedValue: memberLine.point1.y
    };
  }

  if (isVertical && constraintType === ConstraintType.X) {
    return { 
      isValid: false, 
      error: "X-koordinat kan ikke ændres for lodret konstruktionsdel",
      correctedValue: memberLine.point1.x
    };
  }

  // Calculate the intersection point based on the constraint
  let intersectionPoint: { x: number; y: number };
  
  if (constraintType === ConstraintType.X) {
    const y = intersectionWithX(memberLine, constraintValue);
    intersectionPoint = { x: constraintValue, y };
  } else {
    const x = intersectionWithY(memberLine, constraintValue);
    intersectionPoint = { x, y: constraintValue };
  }  // Check if the intersection point is within the member bounds
  // We need an unclamped position calculation for validation
  const lx = memberLine.point2.x - memberLine.point1.x;
  const ly = memberLine.point2.y - memberLine.point1.y;
  const dx = intersectionPoint.x - memberLine.point1.x;
  const dy = intersectionPoint.y - memberLine.point1.y;
  const magLine = lx ** 2 + ly ** 2;
  const magPoint = lx * dx + ly * dy;
  const position = magPoint / magLine; // Unclamped position - can be outside 0-1 range
  
  if (position < 0 || position > 1) {
    // Calculate the corrected value to keep the node within bounds
    const clampedPosition = Math.max(0, Math.min(1, position));
    const correctedPoint = {
      x: memberLine.point1.x + (memberLine.point2.x - memberLine.point1.x) * clampedPosition,
      y: memberLine.point1.y + (memberLine.point2.y - memberLine.point1.y) * clampedPosition
    };
    
    const correctedValue = constraintType === ConstraintType.X ? correctedPoint.x : correctedPoint.y;
    
    return {
      isValid: false,
      error: "Uden for konstruktionsdel",
      correctedValue
    };
  }

  return { isValid: true };
};

/**
 * Determines which constraint types should be disabled for a side-mounted node
 * based on the orientation of the attached member
 */
export const getDisabledConstraintTypes = (
  attachedMemberId: string,
  entitySet: EntitySet
): ConstraintType[] => {
  const member = entitySet.members[attachedMemberId];
  if (!member) {
    return [];
  }

  const memberLine = member.resolved;
  const slope = getSlope(memberLine);
  const isHorizontal = Math.abs(slope) < 0.01; // Nearly horizontal
  const isVertical = Math.abs(slope) > 100; // Nearly vertical

  const disabledTypes: ConstraintType[] = [];
  
  if (isHorizontal) {
    disabledTypes.push(ConstraintType.Y);
  }
  
  if (isVertical) {
    disabledTypes.push(ConstraintType.X);
  }

  return disabledTypes;
};
