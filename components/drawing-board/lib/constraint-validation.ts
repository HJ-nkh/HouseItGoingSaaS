import { getConstraintPair } from "./node-constraint-resolvers";
import { Constraint, ConstraintType, Node } from "./types";

export const isConstraintValid = (constraint: Constraint): boolean => {
  if (
    constraint.type !== ConstraintType.Member &&
    constraint.value === undefined
  ) {
    return false;
  }

  if (constraint.type === ConstraintType.Angle && !constraint.contextNodeId) {
    return false;
  }

  if (
    constraint.type === ConstraintType.Distance &&
    !constraint.contextNodeId
  ) {
    return false;
  }

  return true;
};

export const isConstraintPairValid = (
  node: Pick<Node, "constraint1" | "constraint2">
): boolean => {
  if (
    !isConstraintValid(node.constraint1) ||
    !isConstraintValid(node.constraint2)
  ) {
    return false;
  }

  if (node.constraint1.type === node.constraint2.type) {
    return false;
  }

  return Boolean(getConstraintPair(node));
};
