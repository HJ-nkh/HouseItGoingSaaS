import {
  distanceBetween,
  offsetPointFromLine,
} from "../lib/geometry";
import { toSvgCoordinates } from "../lib/svg-coordinates";
import { useMemo, useState, useEffect } from "react";
import { Point, FEElement, LoadType } from "../lib/types";
import RenderedPointLoad from "./point-load";
import RenderedMomentLoad from "./moment-load";

type ForceLineProps = {
  element: FEElement;
  analysis: "F1" | "F2" | "M";
  limitState: "ULS" | "SLS" | "ALS";
  loadCombination: string;
  scale: number;
  svgRef: SVGSVGElement | null;
  viewBox: [number, number, number, number];
  memberSimulation?: {
    members?: Record<string, unknown>;
    X?: unknown;
    T?: unknown;
    R0_coor?: unknown;
    R0_types?: unknown;
    UR?: Record<string, number[][] | string[]>;
  };
};

const ForceLine: React.FC<ForceLineProps> = ({
  element,
  analysis,
  limitState,
  loadCombination,
  scale,
  svgRef,
  viewBox,
  memberSimulation,
}) => {
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  const { node1, node2 } = element;
  // Calculate all values needed for hooks before any early returns
  const line = { point1: node1, point2: node2 };
  const analysesWithNegativeSign = ["F1", "F2"];
  const sign = analysesWithNegativeSign.includes(analysis) ? -1 : 1;
    // Handle "Maksimale udnyttelser, samlet" for section force analyses
  let node1Value: number, node2Value: number;
  
  if (loadCombination === "Maksimale udnyttelser, samlet" && ["M", "F1", "F2"].includes(analysis)) {    // Find the load combination with the highest UR for this member
    let criticalLoadCombination = "";
      if (memberSimulation?.UR?.[`UR_loadcomb_mat_${limitState}`] && memberSimulation?.UR?.[`LoadCombnames_${limitState}`]) {
      const matrix = memberSimulation.UR[`UR_loadcomb_mat_${limitState}`];
      const loadCombNames = memberSimulation.UR[`LoadCombnames_${limitState}`];
      
      // Type guards
      if (Array.isArray(matrix) && Array.isArray(loadCombNames)) {
        // Find the maximum UR value and its corresponding load combination
        const rowMaxes = (matrix as number[][]).map((row: number[]) => Math.max(...row));
        const maxURValue = Math.max(...rowMaxes);
          // Find which load combination produced this maximum UR
        let found = false;
        (matrix as number[][]).forEach((row: number[]) => {
          if (found) return;
          row.forEach((urValue: number, colIndex: number) => {
            if (urValue === maxURValue) {
              criticalLoadCombination = (loadCombNames as string[])[colIndex];
              found = true;
            }
          });
        });
      }
    }
      // Use the critical load combination if found, otherwise fall back to first available
    const availableLoadCombinations = Object.keys(node1[limitState][analysis]);
    const actualLoadCombination = criticalLoadCombination && availableLoadCombinations.includes(criticalLoadCombination)
      ? criticalLoadCombination 
      : availableLoadCombinations[0];
    
    if (actualLoadCombination) {
      node1Value = node1[limitState][analysis][actualLoadCombination];
      node2Value = node2[limitState][analysis][actualLoadCombination];
    } else {
      // Fallback if no load combinations available
      node1Value = 0;
      node2Value = 0;
    }
  } else {
    // Normal case - use specific load combination
    node1Value = node1[limitState][analysis][loadCombination];
    node2Value = node2[limitState][analysis][loadCombination];
  }
  
  // Makes a simple linear line based on the force values in the two nodes
  const offsetNode1 = offsetPointFromLine(
    node1,
    line,
    node1Value * scale * sign
  );
  const offsetNode2 = offsetPointFromLine(
    node2,
    line,
    node2Value * scale * sign
  );

  // Move ALL hooks before any early returns
  const offsetLine = useMemo(() => ({ point1: offsetNode1, point2: offsetNode2 }), [
    offsetNode1,
    offsetNode2]);
  const hoverValue: number | null = useMemo(() => {
    if (!hoverPoint) {
      return null;
    }

    const v1 = node1Value;
    const v2 = node2Value;

    if (v1 === undefined || v2 === undefined) {
      return null;
    }

    const x =
      distanceBetween(hoverPoint, offsetLine.point1) /
      distanceBetween(offsetLine.point2, offsetLine.point1);

    switch (analysis) {
      case "M":
      case "F1":
      case "F2": {
        return (x * (v2 - v1) + v1)*10**-3; // in [mm];
      }
      default:
        return null;
    }  }, [hoverPoint, analysis, node1Value, node2Value, offsetLine]);

  // Early return AFTER all hooks
  if (node1.x === node2.x && node1.y === node2.y) { // If the two nodes are the same, don't draw a line - needed to skip discontinouty points
    return null;
  }
  const polygonColor = (node1Value >= 0 && node2Value >= 0) ?
                     "red" : "steelblue";

  return (
    <g
      onMouseMove={(e) => {
        const cursorPosition = toSvgCoordinates(e, svgRef);

        // Compute vectors
        const AP = {
          x: cursorPosition.x - offsetLine.point1.x,
          y: cursorPosition.y - offsetLine.point1.y,
        };
        const AB = {
          x: offsetLine.point2.x - offsetLine.point1.x,
          y: offsetLine.point2.y - offsetLine.point1.y,
        };

        // Compute the parameter t of the projection of AP onto AB
        const dotAPAB = AP.x * AB.x + AP.y * AB.y;
        const dotABAB = AB.x * AB.x + AB.y * AB.y;
        let t = dotABAB !== 0 ? dotAPAB / dotABAB : 0;

        // Clamp t between 0 and 1 to stay within the segment
        t = Math.max(0, Math.min(1, t));

        // Calculate the clamped projection point
        const clampedPoint = {
          x: offsetLine.point1.x + t * AB.x,
          y: offsetLine.point1.y + t * AB.y,
        };

        setHoverPoint(clampedPoint);
      }}
      onMouseLeave={() => setHoverPoint(null)}
    >
      {/* Invisible line for easier hover */}
      <line
        x1={offsetNode1.x}
        y1={offsetNode1.y}
        x2={offsetNode2.x}
        y2={offsetNode2.y}
        stroke="transparent"
        strokeWidth={viewBox[3]*0.05} // Adjust as needed
      />
      {/* Visible line */}
      <line
        x1={offsetNode1.x}
        y1={offsetNode1.y}
        x2={offsetNode2.x}
        y2={offsetNode2.y}
        strokeWidth={viewBox[3]*0.0015}
        stroke="steelblue"
        opacity={0.4}
      />
      <polygon
        points={[node1, offsetNode1, offsetNode2, node2]
          .map(({ x, y }) => `${x},${y}`)
          .join(" ")}
        fill={polygonColor}
        opacity={0.4}
        style={{ pointerEvents: 'none' }} // Add this line
      />
      {hoverPoint && (
        <>
          <circle cx={hoverPoint.x} cy={hoverPoint.y} r={viewBox[3]*0.004} fill="indigo" />
          <g>
            <text x={hoverPoint.x + viewBox[3]*0.05} y={hoverPoint.y - viewBox[3]*0.05} fontSize={viewBox[3]*0.03}>
              {(hoverValue?.toFixed(2).replace('.', ',') ?? "0") + (analysis === "M" ? " kNm" : " kN")}
            </text>
          </g>
        </>
      )}
    </g>
  );
};

export default ForceLine;

type VeForceLineProps = {
  element: FEElement;
  loadCombination: string;
  scale: number;
  svgRef: SVGSVGElement | null;
  viewBox: [number, number, number, number];
  globalLocal: "global" | "local";
};

export const VeForceLine: React.FC<VeForceLineProps> = ({
  element,
  loadCombination,
  scale,
  svgRef,
  viewBox,
  globalLocal,
}) => {
  const [hoverPoint, setHoverPoint] = useState<Point | null>(null);

  const { node1, node2 } = element;

  // Calculate all values needed for hooks before any early returns
  // Displacement v1 and v2 are displacements orthogonal to the member
  const [x1, y1] = [node1.V_x[loadCombination], node1.V_y[loadCombination]];
  const [x2, y2] = [node2.V_x[loadCombination], node2.V_y[loadCombination]];
  
  // Properly initialize offsetNode1 and assign calculated values
  const offsetNode1 = {
      x: node1.x + x1 * scale,
      y: node1.y + y1 * scale
  };
  const offsetNode2 = {
      x: node2.x + x2 * scale,
      y: node2.y + y2 * scale
  };

  const offsetLine = { point1: offsetNode1, point2: offsetNode2 };

  // Move ALL hooks before any early returns
  const hoverValue: [number, number, number] | null = useMemo(() => {
    if (!hoverPoint) {
      return null;
    }

    const xx =  
      distanceBetween(hoverPoint, offsetLine.point1) /
      distanceBetween(offsetLine.point2, offsetLine.point1);

    if (globalLocal === "local") {
      const y1 = node1.V_loc[loadCombination];
      const y2 = node2.V_loc[loadCombination];

      const y = (xx * (y2 - y1) + y1)*1000; //in [mm]
      
      return [y, y, y]

    }else{

    const x = -(xx * (x2 - x1) + x1)*1000; //in [mm]
    const y = (xx * (y2 - y1) + y1)*1000; //in [mm]
    const xysqrt = Math.sqrt(x**2 + y**2);
    return [x, y, xysqrt] // få rigtige værdier ind her* (v2 - v1) + v1;
    }  }, [hoverPoint, loadCombination, x1, x2, y1, y2, globalLocal, node1, node2, offsetLine]);

  // Early return AFTER all hooks
  if (node1.x === node2.x && node1.y === node2.y) { // If the two nodes are the same, don't draw a line - needed to skip discontinouty points
    return null;
  }

  return (
    <g
      onMouseMove={(e) => {
        const cursorPosition = toSvgCoordinates(e, svgRef);

        // Compute vectors
        const AP = {
          x: cursorPosition.x - offsetLine.point1.x,
          y: cursorPosition.y - offsetLine.point1.y,
        };
        const AB = {
          x: offsetLine.point2.x - offsetLine.point1.x,
          y: offsetLine.point2.y - offsetLine.point1.y,
        };

        // Compute the parameter t of the projection of AP onto AB
        const dotAPAB = AP.x * AB.x + AP.y * AB.y;
        const dotABAB = AB.x * AB.x + AB.y * AB.y;
        let t = dotABAB !== 0 ? dotAPAB / dotABAB : 0;

        // Clamp t between 0 and 1 to stay within the segment
        t = Math.max(0, Math.min(1, t));

        // Calculate the clamped projection point
        const clampedPoint = {
          x: offsetLine.point1.x + t * AB.x,
          y: offsetLine.point1.y + t * AB.y,
        };

        setHoverPoint(clampedPoint);
      }}
      onMouseLeave={() => setHoverPoint(null)}
    >
      {/* Invisible line for easier hover */}
      <line
        x1={offsetNode1.x}
        y1={offsetNode1.y}
        x2={offsetNode2.x}
        y2={offsetNode2.y}
        stroke="transparent"
        strokeWidth={viewBox[3] * 0.02} // Adjust as needed
      />
      {/* Visible line */}
      <line
        x1={offsetNode1.x}
        y1={offsetNode1.y}
        x2={offsetNode2.x}
        y2={offsetNode2.y}
        strokeWidth={viewBox[3] * 0.002}
        stroke="black"
      />
      {/* <polygon
        points={[node1, offsetNode1, offsetNode2, node2]
          .map(({ x, y }) => `${x},${y}`)
          .join(" ")}
        fill="steelblue"
        opacity={0.5}
      /> */}
      {hoverPoint && (
        <>
          <circle cx={hoverPoint.x} cy={hoverPoint.y} r={viewBox[3]*0.004} fill="indigo" />
          <g>
            {globalLocal === "global" && (
              <>
                <text x={hoverPoint.x + viewBox[3]*0.05} y={hoverPoint.y - viewBox[3]*0.15} fontSize={viewBox[3]*0.03}>
                {"x: " + (hoverValue?.[0]?.toFixed(2).replace('.', ',') ?? "0") + " mm"}
                </text>
                <text x={hoverPoint.x + viewBox[3]*0.05} y={hoverPoint.y - viewBox[3]*0.1} fontSize={viewBox[3]*0.03}>
                  {"y: " + (hoverValue?.[1]?.toFixed(2).replace('.', ',') ?? "0") + " mm"}
                </text>
                <text x={hoverPoint.x + viewBox[3]*0.05} y={hoverPoint.y - viewBox[3]*0.05} fontSize={viewBox[3]*0.03}>
                  {"Res: " + (hoverValue?.[2]?.toFixed(2).replace('.', ',') ?? "0") + " mm"}
                </text>
              </>
            )}
            {globalLocal === "local" && (
              <>
                <text x={hoverPoint.x + viewBox[3]*0.05} y={hoverPoint.y - viewBox[3]*0.05} fontSize={viewBox[3]*0.03}>
                  {"y_local: " + (hoverValue?.[0]?.toFixed(2).replace('.', ',') ?? "0") + " mm"}
                </text>
              </>
            )}
          </g>
        </>
      )}
    </g>
  );
};

// Add Reactions component after VeForceLine component

type ReactionsProps = {
  loadCombination: string;
  limitState: "ULS" | "SLS" | "ALS";
  scale: number;
  viewBox: [number, number, number, number];
  R0: { 
    type: string[]; 
    coor: [number, number][]; 
    forces: Record<string, Record<string, [number, number, number][]>>; 
  };
  resetTrigger?: number;
  selectedReactionIndex?: number | null;
  setSelectedReactionIndex?: (index: number | null) => void;
};

export const Reactions: React.FC<ReactionsProps> = ({
  loadCombination,
  limitState,
  scale,
  viewBox,
  R0,
  resetTrigger,
  selectedReactionIndex: externalSelectedReactionIndex,
  setSelectedReactionIndex: externalSetSelectedReactionIndex,
}) => {
  const [internalSelectedReactionIndex, setInternalSelectedReactionIndex] = useState<number | null>(null);
  
  // Use external state if provided, otherwise use internal state
  const selectedReactionIndex = externalSelectedReactionIndex !== undefined ? externalSelectedReactionIndex : internalSelectedReactionIndex;
  const setSelectedReactionIndex = externalSetSelectedReactionIndex || setInternalSelectedReactionIndex;
  
  const reactionTypes = R0.type || [];
  const reactionCoordinates = R0.coor || [];
  const reactionForces = R0.forces?.[limitState]?.[loadCombination] || [];    // Reset selection when resetTrigger changes
  useEffect(() => {
    if (externalSetSelectedReactionIndex) {
      externalSetSelectedReactionIndex(null);
    } else {
      setInternalSelectedReactionIndex(null);
    }
  }, [resetTrigger, externalSetSelectedReactionIndex]);
  
  return (
    <g>
      {reactionTypes.map((type, index) => {
        const coord = reactionCoordinates[index];
        const forcesTriplet = reactionForces[index];

        if (!coord || forcesTriplet === undefined) return null;
        
        const [x, y] = coord;
        
        // Handle both flat array (single number) and triplet array structures
        let forceX: number, forceY: number, momentR: number;
        
        if (Array.isArray(forcesTriplet)) {
          // If it's an array (triplet), destructure it
          [forceX, forceY, momentR] = forcesTriplet;
        } else {
          // If it's a single number, use it directly based on reaction type
          const singleForce = forcesTriplet as number;
          forceX = type === "x" ? singleForce : 0;
          forceY = type === "y" ? singleForce : 0;
          momentR = type === "r" ? singleForce : 0;
        }        // Extract the correct force component based on reaction type
        let forceValue: number;
        switch (type) {
          case "x":
            forceValue = forceX;
            break;
          case "y":
            forceValue = forceY;
            break;
          case "r":
            forceValue = momentR;
            break;
          default:
            return null;
        }
        
        // Round very small values to zero
        if (Math.abs(forceValue) < 1 || (forceValue < 0 && forceValue > -5)) {
          forceValue = 0;
        }        // Create reaction elements based on type
        const isSelected = selectedReactionIndex === index;
        const handleClick = () => {
          setSelectedReactionIndex(isSelected ? null : index);
        };
        const handleTextClick = (e: React.MouseEvent) => {
          e.stopPropagation();
          e.preventDefault();
          setSelectedReactionIndex(isSelected ? null : index);
        };
        
        switch (type) {          case "x": {
            // Show X-direction reaction force as horizontal arrow
            return (
              <g 
                key={`reaction-x-${index}`}
                style={{ cursor: 'pointer' }}
              >
                <RenderedPointLoad
                  load={{
                    id: `r0-x-${index}`,
                    type: LoadType.Wind,
                    magnitude: 1,
                    angle: { value: 180, relativeTo: "x" },
                    resolved: { x, y },
                  }}
                  onClick={handleClick}
                  strokeWidth={isSelected ? viewBox[3] * 0.006 : viewBox[3] * 0.004}
                  size={viewBox[3] * scale * 100}
                  isSelected={isSelected}
                  isHovered={false}
                  className={isSelected ? "stroke-yellow-400" : "stroke-red-600"}
                />                {/* Value label - above and horizontally centered */}
                <text 
                  x={x - 0.5*(viewBox[3] * scale * 100)} 
                  y={y - viewBox[3] * 0.01} 
                  fontSize={isSelected ? viewBox[3] * 0.03 : viewBox[3] * 0.025}
                  fill={isSelected ? "orange" : "red"}
                  textAnchor="middle"
                  fontWeight={isSelected ? "bold" : "normal"}
                  style={{ pointerEvents: 'all', cursor: 'pointer' }}
                  onClick={handleTextClick}
                >
                  {(forceValue / 1000).toFixed(2).replace('.', ',')} kN
                </text>
              </g>
            );
          }          case "y": {
            // Show Y-direction reaction force as vertical arrow
            return (
              <g 
                key={`reaction-y-${index}`}
                style={{ cursor: 'pointer' }}
              >
                <RenderedPointLoad
                  load={{
                    id: `r0-y-${index}`,
                    type: LoadType.Wind,
                    magnitude: 1,
                    angle: { value: 270, relativeTo: "x" },
                    resolved: { x, y },
                  }}
                  onClick={handleClick}
                  strokeWidth={isSelected ? viewBox[3] * 0.006 : viewBox[3] * 0.004}
                  size={viewBox[3] * scale * 100}
                  isSelected={isSelected}
                  isHovered={false}
                  className={isSelected ? "stroke-yellow-400" : "stroke-red-600"}
                />                {/* Value label - to the left and vertically centered */}
                <text 
                  x={x - viewBox[3] * 0.01} 
                  y={y + 0.5*(viewBox[3] * scale * 100)} 
                  fontSize={isSelected ? viewBox[3] * 0.03 : viewBox[3] * 0.025}
                  fill={isSelected ? "orange" : "red"}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontWeight={isSelected ? "bold" : "normal"}
                  style={{ pointerEvents: 'all', cursor: 'pointer' }}
                  onClick={handleTextClick}
                >
                  {(forceValue / 1000).toFixed(2).replace('.', ',')} kN
                </text>
              </g>
            );
          }          case "r": {
            // Show reaction moment as circular arrow
            return (
              <g 
                key={`reaction-r-${index}`}
                style={{ cursor: 'pointer' }}
              >
                <RenderedMomentLoad
                  load={{
                    id: `r0-r-${index}`,
                    type: LoadType.Wind, // Use Wind type to get red color
                    magnitude: 1,
                    resolved: { x, y },
                  }}
                  onClick={handleClick}
                  size={scale}
                  isSelected={isSelected}
                  isHovered={false}
                />                {/* Value label - below and horizontally centered */}
                <text 
                  x={x} 
                  y={y + viewBox[3] * 0.08} 
                  fontSize={isSelected ? viewBox[3] * 0.03 : viewBox[3] * 0.025}
                  fill={isSelected ? "orange" : "red"}
                  textAnchor="middle"
                  fontWeight={isSelected ? "bold" : "normal"}
                  style={{ pointerEvents: 'all', cursor: 'pointer' }}
                  onClick={handleTextClick}
                >
                  {(forceValue / 1000).toFixed(2).replace('.', ',')} kNm
                </text>
              </g>
            );
          }
          default:
            return null;
        }
      })}
    </g>
  );
};
