import getEntityType from "./get-entity-type";
import { EntitySet } from "./reduce-history";
import {
  resolveDistributedLoadPosition,
  resolveMemberPosition,
  resolveMomentLoadPosition,
  resolveNodePosition,
  resolvePointLoadPosition,
  resolveSupportPosition,
} from "./reduce-history/resolve-position";
import { Entity } from "./types";

export const getEntityPosition = (
  id: string,
  entitySet: EntitySet
): { x: number; y: number } => {
  const type = getEntityType(id);

  switch (type) {
    case Entity.Node: {
      const node = entitySet.nodes[id];
      return resolveNodePosition(node, entitySet.nodes, entitySet.members)
        .resolved;
    }    case Entity.Member: {
      const member = entitySet.members[id];
      const { point1, point2 } = resolveMemberPosition(
        member,
        entitySet.nodes
      ).resolved;

      return {
        x: (point2.x + point1.x) / 2,
        y: (point2.y + point1.y) / 2,
      };
    }
    case Entity.PointLoad: {
      const pointLoad = entitySet.pointLoads[id];
      return resolvePointLoadPosition(
        pointLoad,
        entitySet.nodes,
        entitySet.members
      ).resolved;
    }
    case Entity.DistributedLoad: {
      const distributedLoad = entitySet.distributedLoads[id];
      const { point1, point2 } = resolveDistributedLoadPosition(
        distributedLoad,
        entitySet.nodes,
        entitySet.members
      ).resolved;

      return {
        x: (point2.x + point1.x) / 2,
        y: (point2.y + point1.y) / 2,
      };
    }
    case Entity.MomentLoad: {
      const momentLoad = entitySet.momentLoads[id];
      return resolveMomentLoadPosition(
        momentLoad,
        entitySet.nodes,
        entitySet.members
      ).resolved;
    }
    case Entity.Support: {
      const support = entitySet.supports[id];
      return resolveSupportPosition(support, entitySet.nodes, entitySet.members)
        .resolved;
    }
    default: {
      return { x: 0, y: 0 };
    }
  }
};
