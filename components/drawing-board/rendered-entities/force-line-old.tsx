import React, { useMemo } from "react";
import { Line, Point, FENode } from "../lib/types";
import {
  getSlope,
  offsetPointFromLine,
  projectPointOnLine,
} from "../lib/geometry";

function generateControlPoints(
  p1: Point,
  p2: Point,
  m: number
): [Point, Point] {
  if (m === 0) {
    // Horizontal original line
    const cp1 = { x: (p2.x + p1.x) / 2, y: p1.y };
    const cp2 = { x: (p2.x + p1.x) / 2, y: p2.y };
    return [cp1, cp2];
  }

  if (m === Infinity) {
    // Vertical original line
    const cp1 = { x: p1.x, y: (p2.y + p1.y) / 2 };
    const cp2 = { x: p2.x, y: (p2.y + p1.y) / 2 };
    return [cp1, cp2];
  }

  // Calculate the perpendicular slope
  const mPerp = -1 / m;

  // Find the midpoint of p1 and p2
  const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

  const perpLine = {
    point1: midpoint,
    point2: { x: midpoint.x + 1, y: midpoint.y + mPerp },
  };

  const cp1 = projectPointOnLine(perpLine, p1);
  const cp2 = projectPointOnLine(perpLine, p2);

  return [cp1, cp2];
}

const makePath = (points: Point[], line: Line): string => {
  const slope = getSlope(line);
  const commands = ["M" + points[0].x + "," + points[0].y];

  for (let i = 1; i < points.length; i++) {
    const [cp1, cp2] = generateControlPoints(points[i - 1], points[i], slope);

    commands.push(
      "C" +
        cp1.x +
        "," +
        cp1.y +
        " " +
        cp2.x +
        "," +
        cp2.y +
        " " +
        points[i].x +
        "," +
        points[i].y
    );
  }

  return commands.join(" ");
};

type ForceLineProps = {
  line: Line;
  FENodes: FENode[];
  loadCombination: string;
  analysis: "F1" | "F2" | "M";
  limitState: "ULS" | "SLS" | "ALS";
  scale: number;
};

const ForceLine: React.FC<ForceLineProps> = ({
  line,
  FENodes,
  loadCombination,
  limitState,
  analysis,
  scale = 1,
}) => {
  const stroke = analysis === "M" ? "red" : "steelblue";
  const fill = analysis === "M" ? "none" : "steelblue";
  const strokeDasharray = analysis === "M" ? "0.2,0.1" : "none";

  const points = useMemo(
    () =>
      FENodes.map(({ x, y, ...rest }) =>
        offsetPointFromLine(
          { x, y },
          line,
          rest[limitState][analysis][loadCombination] * scale * -1
        )
      ),
    [FENodes, analysis, loadCombination, scale, line]
  );

  const path = makePath(points, line);

  const polygonPoints = [...points, line.point1, line.point2].sort(
    (a, b) => a.x - b.x
  );

  return (
    <g>
      <path
        d={path}
        stroke={stroke}
        strokeDasharray={strokeDasharray}
        strokeWidth={0.04}
        fill="none"
      />
      {/* TODO: Fix polygon area not covering */}
      <polygon
        fill={fill}
        opacity={0.5}
        points={polygonPoints.map((p) => `${p.x},${p.y}`).join(" ")}
      />
    </g>
  );
};

export default ForceLine;
