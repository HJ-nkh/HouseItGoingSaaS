import { getDependants, getDependencies } from "./dependencies";
import { aboveOrBelowLine, getNormalizedOrthogonalVector } from "./geometry";
import getEntityType from "./get-entity-type";
import { EntitySet } from "./reduce-history";
import { Entity } from "./types";

const processSideMountedNodes = (
  entitySet: EntitySet,
  size: number
): EntitySet => {
  const nodes: EntitySet["nodes"] = {};

  for (const node of Object.values(entitySet.nodes)) {
    let { x, y } = { ...node.resolved };

    const dependsOnMemberIds = getDependencies(node.id, entitySet).filter(
      (id) => getEntityType(id) === Entity.Member
    );
    const dependantMemberIds = getDependants(node.id, entitySet).filter(
      (id) => getEntityType(id) === Entity.Member
    );

    // The following applies if the point should be rendered on the side of a member it depends on
    if (dependsOnMemberIds.length === 1) {
      const dependsOnLine = entitySet.members[dependsOnMemberIds[0]].resolved;

      // There can be multiple members connecting to the same node
      const dependantMembers = dependantMemberIds.map(
        (id) => entitySet.members[id]
      );

      if (dependantMembers.length > 0) {
        const contextPoints = dependantMembers.map((member) =>
          member.node1.id === node.id
            ? member.resolved.point2
            : member.resolved.point1
        );

        // For each context point, find out which side of the member they are on
        const directions = contextPoints.map((point) =>
          aboveOrBelowLine(dependsOnLine, point)
        );

        if (directions.every((dir) => dir === directions[0])) {
          const { x: dx, y: dy } = getNormalizedOrthogonalVector(
            dependsOnLine,
            directions[0]
          );

          x = x - dx * size;
          y = y - dy * size;
        }
      }
    }

    const resolved = { x, y };

    nodes[node.id] = { ...node, resolved };

  }

  return { ...entitySet, nodes };
};

export default processSideMountedNodes;
