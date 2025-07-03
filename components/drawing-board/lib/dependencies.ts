import getEntityType from "./get-entity-type";
import { EntitySet } from "./reduce-history";
import { Entity } from "./types";

export const getDependencies = (id: string, entitySet: EntitySet): string[] => {
  const type = getEntityType(id);
  switch (type) {
    case Entity.Node: {
      const node = entitySet.nodes[id];

      const dependencies = [];

      if (node.constraint1.contextNodeId) {
        dependencies.push(node.constraint1.contextNodeId);
      }
      if (node.constraint1.memberId) {
        dependencies.push(node.constraint1.memberId);
      }
      if (node.constraint2.contextNodeId) {
        dependencies.push(node.constraint2.contextNodeId);
      }
      if (node.constraint2.memberId) {
        dependencies.push(node.constraint2.memberId);
      }

      return dependencies;
    }

    case Entity.Member: {
      const member = entitySet.members[id];

      return [member.node1.id, member.node2.id];
    }

    default: {
      return [];
    }
  }
};

export const getDependants = (id: string, entitySet: EntitySet): string[] => {
  const type = getEntityType(id);

  switch (type) {
    case Entity.Node:
      return entitySet.nodes[id]?.dependants ?? [];
    case Entity.Member:
      return entitySet.members[id]?.dependants ?? [];
    default:
      return [];
  }
};
