import { Line, Point, Node, ConstraintType } from "./types";
import {
  intersectionBetweenLines,
  intersectionWithX,
  intersectionWithY,
} from "./geometry";
import { EntitySet } from "./reduce-history";

export enum ConstraintPair {
  XY = "XY",
  MemberX = "MemberX",
  MemberY = "MemberY",
  MemberAngle = "MemberAngle",
  MemberMember = "MemberMember",
  AngleX = "AngleX",
  AngleY = "AngleY",
  DistanceAngle = "DistanceAngle",
}

export const hasConstraint = (
  node: Pick<Node, "constraint1" | "constraint2">,
  constraintType: ConstraintType
): boolean => {
  return (
    node.constraint1.type === constraintType ||
    node.constraint2.type === constraintType
  );
};

export const getConstraintPair = (
  node: Pick<Node, "constraint1" | "constraint2">
): ConstraintPair | null => {
  const hasX = hasConstraint(node, ConstraintType.X);
  const hasY = hasConstraint(node, ConstraintType.Y);
  const hasMember = hasConstraint(node, ConstraintType.Member);
  const hasAngle = hasConstraint(node, ConstraintType.Angle);
  const hasDistance = hasConstraint(node, ConstraintType.Distance);

  if (hasX) {
    if (hasY) {
      return ConstraintPair.XY;
    }

    if (hasMember) {
      return ConstraintPair.MemberX;
    }

    if (hasAngle) {
      return ConstraintPair.AngleX;
    }

    console.error(
      "Invalid constraint pair: X can only exist with Y, Member or Angle"
    );
  }

  if (hasY) {
    if (hasMember) {
      return ConstraintPair.MemberY;
    }

    if (hasAngle) {
      return ConstraintPair.AngleY;
    }

    console.error(
      "Invalid constraint pair: Y can only exist with X, Member or Angle"
    );
  }

  if (hasDistance) {
    if (hasAngle) {
      return ConstraintPair.DistanceAngle;
    }

    console.error(
      "Invalid constraint pair: Distance can only exist with Angle"
    );
  }

  if (hasMember) {
    if (hasAngle) {
      return ConstraintPair.MemberAngle;
    }

    if (!hasDistance) {
      return ConstraintPair.MemberMember;
    }

    console.error(
      "Invalid constraint pair: Member can only exist with X, Y, Angle or Member"
    );
  }

  return null;
};

type Resolver = (
  node: Node,
  nodes: EntitySet["nodes"],
  members: EntitySet["members"]
) => { x: number; y: number };

const resolveXY: Resolver = (node) => {
  let x = 0;
  let y = 0;
  if (node.constraint1.type === ConstraintType.X) {
    x = node.constraint1.value;
  }

  if (node.constraint1.type === ConstraintType.Y) {
    y = node.constraint1.value;
  }

  if (node.constraint2.type === ConstraintType.X) {
    x = node.constraint2.value;
  }

  if (node.constraint2.type === ConstraintType.Y) {
    y = node.constraint2.value;
  }

  return { x, y };
};

const resolveMemberX: Resolver = (node, _, members) => {
  let line: Line | null = null;
  let x: number | null = null;
  if (node.constraint1.type === ConstraintType.Member) {
    line = members[node.constraint1.memberId ?? ""].resolved;
    x = node.constraint2.value;
  }

  if (node.constraint2.type === ConstraintType.Member) {
    line = members[node.constraint2.memberId ?? ""].resolved;
    x = node.constraint1.value;
  }

  if (!line) {
    throw new Error(
      `Unable to find line with ID ${node.constraint1.memberId} | ${node.constraint2.memberId}`
    );
  }

  if (x == null) {
    throw new Error("No x defined!");
  }

  const y = intersectionWithX(line, x);

  return { id: node.id, x, y };
};

const resolveMemberY: Resolver = (node, _, members) => {
  let line: Line | null = null;
  let y: number | null = null;
  if (node.constraint1.type === ConstraintType.Member) {
    line = members[node.constraint1.memberId ?? ""].resolved;
    y = node.constraint2.value;
  }

  if (node.constraint2.type === ConstraintType.Member) {
    line = members[node.constraint2.memberId ?? ""].resolved;
    y = node.constraint1.value;
  }

  if (!line) {
    throw new Error("Unable to find line");
  }

  if (y == null) {
    throw new Error("No y defined!");
  }

  const x = intersectionWithY(line, y);

  return { id: node.id, y, x };
};

const resolveMemberAngle: Resolver = (node, nodes, members) => {
  let line: Line | null = null;
  let angle: number | null = null;
  let contextPoint: Point | undefined = undefined;
  if (node.constraint1.type === ConstraintType.Member) {
    line = members[node.constraint1.memberId ?? ""].resolved;
    angle = node.constraint2.value;
    contextPoint = nodes[node.constraint2.contextNodeId ?? ""].resolved;
  }

  if (node.constraint2.type === ConstraintType.Member) {
    line = members[node.constraint2.memberId ?? ""].resolved;
    angle = node.constraint1.value as number;
    contextPoint = nodes[node.constraint1.contextNodeId ?? ""].resolved;
  }

  if (!contextPoint) {
    throw new Error("No context point defined for angle!");
  }

  if (!line) {
    throw new Error("Unable to find line");
  }

  if (angle == null) {
    throw new Error("No angle defined!");
  }

  // Define another point by walking along the angle from the context point
  const x1 = contextPoint.x + Math.cos((angle * Math.PI) / 180);
  const y1 = contextPoint.y + Math.sin((angle * Math.PI) / 180);

  const line2: Line = {
    point1: contextPoint,
    point2: { x: x1, y: y1 },
  };

  const intersection = intersectionBetweenLines(line, line2);

  if (!intersection) {
    throw new Error("Lines do not intersect!");
  }

  return intersection;
};

const resolveAngleX: Resolver = (node, nodes) => {
  let angle: number | null = null;
  let x: number | null = null;
  let contextPoint: Point | undefined = undefined;
  if (node.constraint1.type === ConstraintType.X) {
    angle = node.constraint2.value;
    contextPoint = nodes[node.constraint2.contextNodeId ?? ""].resolved;
    x = node.constraint1.value;
  }

  if (node.constraint2.type === ConstraintType.X) {
    angle = node.constraint1.value;
    contextPoint = nodes[node.constraint1.contextNodeId ?? ""].resolved;
    x = node.constraint2.value;
  }

  if (!contextPoint) {
    throw new Error("No context point defined for angle!");
  }

  if (x == null) {
    throw new Error("No x defined!");
  }

  if (angle == null) {
    throw new Error("No angle defined!");
  }

  // Define another point by walking along the angle from the context point
  const x1 = contextPoint.x + Math.cos(angle);
  const y1 = contextPoint.y + Math.sin(angle);

  const line: Line = {
    point1: contextPoint,
    point2: { x: x1, y: y1 },
  };

  const line2: Line = {
    point1: { x, y: 0 },
    point2: { x, y: 1 },
  };

  const intersection = intersectionBetweenLines(line, line2);

  if (!intersection) {
    throw new Error("Lines do no intersect!");
  }

  return intersection;
};

const resolveAngleY: Resolver = (node, nodes) => {
  let angle: number | null = null;
  let y: number | null = null;
  let contextPoint: Point | undefined = undefined;
  if (node.constraint1.type === ConstraintType.Y) {
    angle = node.constraint2.value;
    contextPoint = nodes[node.constraint2.contextNodeId ?? ""].resolved;
    y = node.constraint1.value;
  }

  if (node.constraint2.type === ConstraintType.Y) {
    angle = node.constraint1.value;
    contextPoint = nodes[node.constraint1.contextNodeId ?? ""].resolved;
    y = node.constraint2.value;
  }

  if (!contextPoint) {
    throw new Error("No context point defined for angle!");
  }

  if (y == null) {
    throw new Error("No y defined!");
  }

  if (angle == null) {
    throw new Error("No angle defined!");
  }

  // Define another point by walking along the angle from the context point
  const x1 = contextPoint.x + Math.cos((angle * Math.PI) / 180);
  const y1 = contextPoint.y + Math.sin((angle * Math.PI) / 180);

  const line: Line = {
    point1: contextPoint,
    point2: { x: x1, y: y1 },
  };

  const line2: Line = {
    point1: { x: 0, y },
    point2: { x: 1, y },
  };

  const intersection = intersectionBetweenLines(line, line2);

  if (!intersection) {
    throw new Error("Lines do not intersect!");
  }

  return intersection;
};

// TODO: Support different context points for the two constraints?
// This creates ambiguity, as constraint 1 can intersect zero or two times with constraint 2.
// Currently, the "Angle" context point is used
const resolveDistanceAngle: Resolver = (node, nodes) => {
  let angle: number | null = null;
  let distance: number | null = null;
  let contextPoint: Point | undefined;

  if (node.constraint1.type === ConstraintType.Distance) {
    distance = node.constraint1.value;
    angle = node.constraint2.value;
    contextPoint = nodes[node.constraint2.contextNodeId ?? ""].resolved;
  }

  if (node.constraint2.type === ConstraintType.Distance) {
    distance = node.constraint2.value;
    angle = node.constraint1.value;
    contextPoint = nodes[node.constraint1.contextNodeId ?? ""].resolved;
  }

  if (!contextPoint) {
    throw new Error("No context point defined for angle!");
  }

  if (distance == null) {
    throw new Error("No distance defined!");
  }

  if (angle == null) {
    throw new Error("No angle defined!");
  }

  const x = contextPoint.x + distance * Math.cos((angle * Math.PI) / 180);
  const y = contextPoint.y + distance * Math.sin((angle * Math.PI) / 180);

  return { x, y };
};

const resolveMemberMember: Resolver = (node, _, members) => {
  if (!node.constraint1.memberId || !node.constraint2.memberId) {
    throw new Error("Missing memberId on constraint!");
  }

  const member1 = members[node.constraint1.memberId];
  const member2 = members[node.constraint2.memberId];

  const point = intersectionBetweenLines(member1.resolved, member2.resolved);

  if (!point) {
    throw new Error("Unable to find intersection between members!");
  }

  return point;
};

export const nodeConstraintResolvers: Record<ConstraintPair, Resolver> = {
  [ConstraintPair.XY]: resolveXY,
  [ConstraintPair.MemberX]: resolveMemberX,
  [ConstraintPair.MemberY]: resolveMemberY,
  [ConstraintPair.MemberAngle]: resolveMemberAngle,
  [ConstraintPair.AngleX]: resolveAngleX,
  [ConstraintPair.AngleY]: resolveAngleY,
  [ConstraintPair.DistanceAngle]: resolveDistanceAngle,
  [ConstraintPair.MemberMember]: resolveMemberMember,
};
