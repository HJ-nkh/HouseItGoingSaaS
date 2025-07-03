import { ConstraintType } from "./types";
import { EntitySet } from "./reduce-history";

/**
 * Determines the smart default constraint type based on member orientation.
 * For horizontal members (dx > dy): X constraint (positioning along the member)
 * For vertical members (dx < dy): Y constraint (positioning along the member)
 */
export const getSmartDefaultConstraint = (
  memberId: string,
  entitySet: EntitySet
): ConstraintType.X | ConstraintType.Y => {
  const member = entitySet.members[memberId];
  if (!member) {
    // Fallback to X if member not found
    return ConstraintType.X;
  }

  const { point1, point2 } = member.resolved;
  const dx = Math.abs(point2.x - point1.x);
  const dy = Math.abs(point2.y - point1.y);

  // If more horizontal than vertical, use X constraint
  // If more vertical than horizontal, use Y constraint
  return dx > dy ? ConstraintType.X : ConstraintType.Y;
};
