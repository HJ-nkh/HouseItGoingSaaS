import { EntitySet } from "./reduce-history";
import { resolveNodePosition } from "./reduce-history/resolve-position";
import { Line, Point, Node, Member } from "./types";

/**
 * Calculates the y coordinate of the lines intersection with the vertical line at x
 */
export const intersectionWithX = (line: Line, x: number) => {
  return (
    line.point1.y +
    ((line.point2.y - line.point1.y) / (line.point2.x - line.point1.x)) *
      (x - line.point1.x)
  );
};

/**
 * Calculates the y coordinate of the lines intersection with the vertical line at x
 */
export const intersectionWithY = (line: Line, y: number) => {
  return (
    line.point1.x +
    ((y - line.point1.y) / (line.point2.y - line.point1.y)) *
      (line.point2.x - line.point1.x)
  );
};

export const intersectionBetweenLines = (
  line1: Line,
  line2: Line
): { x: number; y: number } | null => {
  const denominator1 = line1.point2.x - line1.point1.x;
  const denominator2 = line2.point2.x - line2.point1.x;

  if (denominator1 === 0 && denominator2 === 0) {
    // Both lines are vertical
    return null;
  }

  if (denominator1 === 0) {
    // Line1 is vertical
    const x = line1.point1.x;
    const m2 = (line2.point2.y - line2.point1.y) / denominator2;
    const b2 = line2.point1.y - m2 * line2.point1.x;
    const y = m2 * x + b2;
    return { x, y };
  }

  if (denominator2 === 0) {
    // Line2 is vertical
    const x = line2.point1.x;
    const m1 = (line1.point2.y - line1.point1.y) / denominator1;
    const b1 = line1.point1.y - m1 * line1.point1.x;
    const y = m1 * x + b1;
    return { x, y };
  }

  // Calculate slopes
  const m1 = (line1.point2.y - line1.point1.y) / denominator1;
  const m2 = (line2.point2.y - line2.point1.y) / denominator2;

  if (m1 === m2) {
    // Lines are parallel
    return null;
  }

  // Calculate y-intercepts
  const b1 = line1.point1.y - m1 * line1.point1.x;
  const b2 = line2.point1.y - m2 * line2.point1.x;

  // Calculate intercept coordinates
  const x = (b2 - b1) / (m1 - m2);
  const y = m1 * x + b1;

  return { x, y };
};

export const distanceBetween = (
  point1: Pick<Point, "x" | "y">,
  point2: Pick<Point, "x" | "y">
) => {
  return Math.sqrt((point2.x - point1.x) ** 2 + (point2.y - point1.y) ** 2);
};

export const calculateMemberLength = (
  { node1, node2 }: Member,
  nodes: EntitySet["nodes"],
  members: EntitySet["members"]
) => {
  if (
    !node1.constraint1 ||
    !node1.constraint2 ||
    !node2.constraint1 ||
    !node2.constraint2
  ) {
    return 0;
  }

  const point1 = resolveNodePosition(node1 as Node, nodes, members).resolved;
  const point2 = resolveNodePosition(node2 as Node, nodes, members).resolved;

  return distanceBetween(point1, point2);
};

/**
 * Determines whether or not a point is "above" or "below" a line
 * @param line The line
 * @param point The point
 * @returns 1 if the point is "above" the line, -1 if it is "below" and 0 if it is on the line
 */
export const aboveOrBelowLine = (line: Line, point: Point): number => {
  const a = line.point2.y - line.point1.y;
  const b = line.point1.x - line.point2.x;
  const c = line.point2.x * line.point1.y - line.point1.x * line.point2.y;

  const result = a * point.x + b * point.y + c;
  return Math.sign(result);
};

/**
 * Get normalized orthogonal vector
 */
export const getNormalizedOrthogonalVector = (
  line: Line,
  direction: number
): { x: number; y: number } => {
  // Vector along the line
  const vx = line.point2.x - line.point1.x;
  const vy = line.point2.y - line.point1.y;

  // Normalized orthogonal vector to the line
  const magnitude = Math.sqrt(vx * vx + vy * vy);
  const ox = -vy / magnitude;
  const oy = vx / magnitude;

  return {
    x: ox * direction,
    y: oy * direction,
  };
};

export const getSlope = (line: Line): number => {
  return (line.point2.y - line.point1.y) / (line.point2.x - line.point1.x);
};

export const getSlopeRadians = (line: Line): number => {
  return Math.atan2(
    line.point2.y - line.point1.y,
    line.point2.x - line.point1.x
  );
};

export const getPointOnLine = (
  line: Line,
  position: number
): { x: number; y: number } => {
  const x = line.point1.x + (line.point2.x - line.point1.x) * position;
  const y = line.point1.y + (line.point2.y - line.point1.y) * position;

  return { x, y };
};

/**
 * Return the angle of point2 of the line compared to point1 in degrees
 */
export const getLineAngle = (line: Line): number => {
  return (
    (Math.atan2(line.point2.y - line.point1.y, line.point2.x - line.point1.x) *
      180) /
    Math.PI
  );
};

/**
 * This function gives the position (from 0 to 1) on the line that is closest to the given point.
 * If the point is not on the line, it will still return a position on the line.
 */
export const getPositionOnLine = (
  line: Line,
  point: { x: number; y: number }
): number => {
  const lx = line.point2.x - line.point1.x;
  const ly = line.point2.y - line.point1.y;

  const dx = point.x - line.point1.x;
  const dy = point.y - line.point1.y;

  const magLine = lx ** 2 + ly ** 2;
  const magPoint = lx * dx + ly * dy;

  return Math.max(0, Math.min(1, magPoint / magLine));
};

export const projectPointOnLine = (
  line: { point1: Pick<Point, "x" | "y">; point2: Pick<Point, "x" | "y"> },
  point: Pick<Point, "x" | "y">
): { x: number; y: number } => {
  const dx = line.point2.x - line.point1.x;
  const dy = line.point2.y - line.point1.y;

  // Vector from line start to the point
  const px = point.x - line.point1.x;
  const py = point.y - line.point1.y;

  // Dot product of the two vectors
  const dot = px * dx + py * dy;

  // Squared magnitude of the line's direction vector
  const magSq = dx * dx + dy * dy;

  // Scaling factor for the direction vector
  const factor = dot / magSq;

  return {
    x: line.point1.x + factor * dx,
    y: line.point1.y + factor * dy,
  };
};

export const offsetPointFromLine = (
  p: Point,
  line: Line,
  distance: number
): Point => {
  const { x: x1, y: y1 } = line.point1;
  const { x: x2, y: y2 } = line.point2;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const magnitude = Math.sqrt(dx * dx + dy * dy);

  // Normalized perpendicular vector (-dy, dx)
  const perpUnitX = -dy / magnitude;
  const perpUnitY = dx / magnitude;

  // Calculate new coordinates
  const newX = p.x + perpUnitX * distance;
  const newY = p.y + perpUnitY * distance;

  return { x: newX, y: newY };
};
