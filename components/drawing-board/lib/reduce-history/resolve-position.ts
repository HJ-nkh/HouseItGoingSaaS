import { EntitySet } from ".";
import {
  getConstraintPair,
  nodeConstraintResolvers,
} from "../node-constraint-resolvers";
import {
  Node,
  Member,
  ResolvedNode,
  PointLoad,
  ResolvedMember,
  Assembly,
  ResolvedPointLoad,
  ConstraintType,
  ResolvedDistributedLoad,
  DistributedLoad,
  ResolvedMomentLoad,
  MomentLoad,
  Support,
  ResolvedSupport,
} from "../types";

export const resolveNodePosition = (
  node: Node,
  nodes: EntitySet["nodes"],
  members: EntitySet["members"]
): ResolvedNode => {
  const constraintPair = getConstraintPair(node);

  if (!constraintPair) {
    throw new Error("Invalid constraint pair for node");
  }

  const resolver = nodeConstraintResolvers[constraintPair];

  const { x, y } = resolver(node, nodes, members);

  // Preserve existing assembly if the node already exists, otherwise default to Hinge
  const existingNode = nodes[node.id];
  const assembly = existingNode?.assembly ?? Assembly.Hinge;

  return { ...node, resolved: { x, y }, assembly };
};

export const resolveMemberPosition = (
  member: Member,
  nodes: EntitySet["nodes"]
): ResolvedMember => {
  const node1 = nodes[member.node1.id];
  const node2 = nodes[member.node2.id];
  
  if (!node1?.resolved || !node2?.resolved) {
    throw new Error("Unable to find points for line");
  }

  return {
    ...member,
    resolved: { point1: node1.resolved, point2: node2.resolved },
  };
};

export const resolvePointLoadPosition = (
  load: PointLoad,
  nodes: EntitySet["nodes"],
  members: EntitySet["members"]
): ResolvedPointLoad => {
  if (load.onNode) {
    const point = nodes[load.onNode.id].resolved;

    return { ...load, resolved: point };
  }

  if (load.onMember) {
    const node: Node = {
      id: "",
      constraint1: {
        type: ConstraintType.Member,
        value: 0,
        memberId: load.onMember.id,
      },
      constraint2: load.onMember.constraint,
    };

    const constraintPair = getConstraintPair(node);

    if (!constraintPair) {
      throw new Error("Invalid constraint for point load");
    }

    const resolver = nodeConstraintResolvers[constraintPair];

    const { x, y } = resolver(node, nodes, members);

    return { ...load, resolved: { x, y } };
  }

  throw new Error("Point load lacks onNode and onMember");
};

export const resolveDistributedLoadPosition = (
  load: DistributedLoad,
  nodes: EntitySet["nodes"],
  members: EntitySet["members"]
): ResolvedDistributedLoad => {
  const memberConstraint = {
    type: ConstraintType.Member,
    memberId: load.onMember.id,
    value: 0,
  };

  const node1 = {
    id: "",
    constraint1: memberConstraint,
    constraint2: load.onMember.constraintStart,
  };
  const node2 = {
    id: "",
    constraint1: memberConstraint,
    constraint2: load.onMember.constraintEnd,
  };

  const { resolved: point1 } = resolveNodePosition(node1, nodes, members);
  const { resolved: point2 } = resolveNodePosition(node2, nodes, members);

  return { ...load, resolved: { point1, point2 } };
};

export const resolveMomentLoadPosition = (
  load: MomentLoad,
  nodes: EntitySet["nodes"],
  members: EntitySet["members"]
): ResolvedMomentLoad => {
  if (load.onNode) {
    const point = nodes[load.onNode.id].resolved;

    return { ...load, resolved: point };
  }

  if (load.onMember) {
    const node: Node = {
      id: "",
      constraint1: {
        type: ConstraintType.Member,
        value: 0,
        memberId: load.onMember.id,
      },
      constraint2: load.onMember.constraint,
    };

    const constraintPair = getConstraintPair(node);

    if (!constraintPair) {
      throw new Error("Invalid constraint for point load");
    }

    const resolver = nodeConstraintResolvers[constraintPair];

    const resolved = resolver(node, nodes, members);

    return { ...load, resolved };
  }

  throw new Error("Moment load lacks onNode and onMember");
};

export const resolveSupportPosition = (
  support: Support,
  nodes: EntitySet["nodes"],
  members: EntitySet["members"]
): ResolvedSupport => {
  if (support.onNode) {
    const point = nodes[support.onNode.id].resolved;

    return { ...support, resolved: point };
  }

  if (support.onMember) {
    const node: Node = {
      id: "",
      constraint1: {
        type: ConstraintType.Member,
        value: 0,
        memberId: support.onMember.id,
      },
      constraint2: support.onMember.constraint,
    };

    const constraintPair = getConstraintPair(node);

    if (!constraintPair) {
      throw new Error("Invalid constraint for point load");
    }

    const resolver = nodeConstraintResolvers[constraintPair];

    const resolved = resolver(node, nodes, members);

    return { ...support, resolved };
  }

  throw new Error("Support lacks onNode and onMember");
};
