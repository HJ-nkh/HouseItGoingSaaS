import { InputEventPayload } from "../lib/events";
import { ResolvedMember } from "../lib/types";
import { useMemo } from "react";

type LineProps = {
  member: ResolvedMember;
  strokeWidth: number;
  onClick?: (payload: InputEventPayload) => void;
  isSelected: boolean;
  isHovered: boolean;
  isVeAnalysis: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isSectionForceAnalysis: boolean;
  globalLocal: "global" | "local"; // new prop
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  memberSimulations: any; // changed prop: now a single simulation object for this member
  scaleVe: number; // new prop
  selectedLC: string | null; // new prop
};

const RenderedMember: React.FC<LineProps> = ({
  member,
  strokeWidth,
  onClick,
  isSelected,
  isHovered,
  isVeAnalysis,
  onMouseEnter,
  onMouseLeave,
  isSectionForceAnalysis,
  globalLocal,
  memberSimulations,
  scaleVe,
  selectedLC,
}) => {
  let stroke = "stroke-black";

  if (isHovered) {
    stroke = "stroke-sky-400";
  }
  if (isSelected) {
    stroke = "stroke-sky-600";
  }

  // Create a memoized copy of the line instead of mutating member.resolved
  const modifiedLine = useMemo(() => {
    const original = {
      point1: { ...member.resolved.point1 },
      point2: { ...member.resolved.point2 },
    };
    // always reset when not in Ve-analysis
    if (!isVeAnalysis) {
      return original;
    }
    if (selectedLC && globalLocal === "local" && memberSimulations) {
      return {
        point1: {
          x: memberSimulations.nodes[0].x - scaleVe * memberSimulations.nodes[0].V_x[selectedLC],
          y: memberSimulations.nodes[0].y - scaleVe * memberSimulations.nodes[0].V_y[selectedLC],
        },
        point2: {
          x: memberSimulations.nodes[memberSimulations.nodes.length - 1].x - scaleVe * memberSimulations.nodes[memberSimulations.nodes.length - 1].V_x[selectedLC],
          y: memberSimulations.nodes[memberSimulations.nodes.length - 1].y - scaleVe * memberSimulations.nodes[memberSimulations.nodes.length - 1].V_y[selectedLC],
        },
      };
    }
    return original;
  }, [
    isVeAnalysis,
    globalLocal,
    scaleVe,
    selectedLC,
    member.resolved,
    memberSimulations,
  ]);

  // Use modifiedLine for render calculations
  const offsetLine = useMemo(() => {
    if (memberSimulations?.nodes?.length > 1) { // Added null/undefined checks
      const startNode = memberSimulations.nodes[0];
      const endNode = memberSimulations.nodes[memberSimulations.nodes.length - 1];
      const dx = endNode.x - startNode.x;
      const dy = endNode.y - startNode.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const offset = 2 * strokeWidth;
      let offsetX, offsetY;
      if (dx === 0) {
        offsetX = offset;
        offsetY = 0;
      } else {
        offsetX = (-dy / length) * offset;
        offsetY = (dx / length) * offset;
      }
      return {
        point1: { x: startNode.x + offsetX, y: startNode.y + offsetY },
        point2: { x: endNode.x + offsetX, y: endNode.y + offsetY },
      };
    }
    return {
      point1: { x: modifiedLine.point1.x, y: modifiedLine.point1.y },
      point2: { x: modifiedLine.point2.x, y: modifiedLine.point2.y },
    };
  }, [memberSimulations, strokeWidth]);

  return (
    <g className="cursor-pointer">
      {/* CLICKABLE AREA */}
      <line
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.({ id: member.id, ...e });
        }}
        x1={modifiedLine.point1.x}
        y1={modifiedLine.point1.y}
        x2={modifiedLine.point2.x}
        y2={modifiedLine.point2.y}
        strokeWidth={strokeWidth * 3.5}
        stroke="transparent"
      />
      {/* LINE ITSELF */}
      <line
        x1={modifiedLine.point1.x}
        y1={modifiedLine.point1.y}
        x2={modifiedLine.point2.x}
        y2={modifiedLine.point2.y}
        strokeWidth={strokeWidth}
        className={stroke}
        pointerEvents="none"
        stroke-dasharray={isVeAnalysis ? "0.1, 0.1" : ""}
      />
      {/* OFFSET LINE */}
      {isSectionForceAnalysis && (
        <line
          x1={offsetLine.point1.x}
          y1={offsetLine.point1.y}
          x2={offsetLine.point2.x}
          y2={offsetLine.point2.y}
          strokeWidth={strokeWidth * 0.6}
          className={stroke}
          pointerEvents="none"
          stroke-dasharray={isSectionForceAnalysis ? "0.05, 0.05" : ""}
        />
      )}
    </g>
  );
};

export default RenderedMember;
