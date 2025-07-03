import { getDependants, getDependencies } from "./dependencies";
import { aboveOrBelowLine } from "./geometry";
import getEntityType from "./get-entity-type";
import { EntitySet } from "./reduce-history";
import { Entity } from "./types";

/**
 * Determines if a node is side-mounted on a member.
 * A node is considered side-mounted when:
 * 1. It depends on exactly one member
 * 2. If it has dependent members, all dependent members are on the same side of the line
 */
export const isSideMountedNode = (nodeId: string, entitySet: EntitySet): boolean => {
  const dependsOnMemberIds = getDependencies(nodeId, entitySet).filter(
    (id) => getEntityType(id) === Entity.Member
  );
  const dependantMemberIds = getDependants(nodeId, entitySet).filter(
    (id) => getEntityType(id) === Entity.Member
  );

  // Must depend on exactly one member
  if (dependsOnMemberIds.length !== 1) {
    return false;
  }

  // If there are no dependent members, it's still a side-mounted node
  // (e.g., when first created by clicking on a member)
  if (dependantMemberIds.length === 0) {
    return true;
  }
  
  const dependsOnLine = entitySet.members[dependsOnMemberIds[0]].resolved;

  // There can be multiple members connecting to the same node
  const dependantMembers = dependantMemberIds.map(
    (id) => entitySet.members[id]
  );

  const contextPoints = dependantMembers.map((member) =>
    member.node1.id === nodeId
      ? member.resolved.point2
      : member.resolved.point1
  );

  // For each context point, find out which side of the member they are on
  const directions = contextPoints.map((point) =>
    aboveOrBelowLine(dependsOnLine, point)
  );

  // All dependent members must be on the same side of the line
  return directions.every((dir) => dir === directions[0]);
};
