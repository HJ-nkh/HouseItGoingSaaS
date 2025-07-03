import classNames from "classnames";
import { Assembly, ResolvedNode } from "../lib/types";
import React from "react";
import { InputEventPayload } from "../lib/events";

type RenderedNodeProps = {
  node: ResolvedNode;
  strokeWidth: number;
  size: number;
  onClick?: (payload: InputEventPayload) => void;
  isSelected: boolean;
  isHovered: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

const RenderedNode: React.FC<RenderedNodeProps> = ({
  node,
  strokeWidth,
  size,
  onClick,
  isSelected,
  isHovered,
  onMouseEnter,
  onMouseLeave,
}) => {
  const needsAttention = node.needsAttention;
  
  // Determine colors based on state
  let stroke, fill;
  if (needsAttention) {
    stroke = "stroke-red-500";
    fill = "fill-red-100";
  } else if (isSelected || isHovered) {
    stroke = "stroke-sky-400";
    fill = "fill-sky-400";
  } else {
    stroke = "stroke-black";
    fill = "fill-white";
  }

  const point = node.resolved;
  return (
    <g className="cursor-pointer">
      {/* ATTENTION INDICATOR - Pulsing red circle for nodes needing attention */}
      {needsAttention && (
        <circle
          cx={point.x}
          cy={point.y}
          r={size * 2}
          strokeWidth={strokeWidth * 2}
          className="stroke-red-500 fill-none animate-pulse"
          pointerEvents="none"
        />
      )}

      {/* CLICKABLE AREA */}
      <circle
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        cx={point.x}
        cy={point.y}
        r={size * 3.5}
        strokeWidth={0}
        className="fill-transparent"
        pointerEvents="all"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.({ id: node.id, ...e });
        }}
      />

      {/* POINT ITSELF */}
      {node.assembly === Assembly.Stiff ? (
        <rect
          x={point.x - size}
          y={point.y - size}
          rx={size * 0.2}
          width={size * 2}
          height={size * 2}
          fill={needsAttention ? "red" : "black"}
          pointerEvents="none"
        />
      ) : (
        <circle
          cx={point.x}
          cy={point.y}
          r={size}
          strokeWidth={strokeWidth}
          pointerEvents="none"
          className={classNames(stroke, fill)}
        />
      )}
    </g>
  );
};

export default RenderedNode;
