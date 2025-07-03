import { InputEventPayload } from "../lib/events/types";
import { ResolvedPointLoad } from "../lib/types";
import classNames from "classnames";
import { loadTypeColors } from "@/constants/colors";

type PointLoadProps = {
  load: ResolvedPointLoad;
  onClick?: (payload: InputEventPayload) => void;
  className?: string;
  isSelected: boolean;
  isHovered: boolean;
  strokeWidth: number;
  size: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

const RenderedPointLoad: React.FC<PointLoadProps> = ({
  load,
  onClick,
  className,
  isSelected,
  isHovered,
  strokeWidth,
  size,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!load.magnitude) {
    return null;
  }

  // Check if load.id contains "pl" and set stroke accordingly
  let stroke = load.id.includes("pl") 
    ? loadTypeColors.stroke[load.type] 
    : "stroke-gray-400"


  if (isHovered) {
    stroke = "stroke-sky-400";
  }

  if (isSelected) {
    stroke = "stroke-sky-600";
  }
  const point = load.resolved;
  const radians = ((load.angle?.value ?? 90) * Math.PI) / 180;
  const mag = load.magnitude ?? 0;
  
  // For negative magnitudes, position the arrow on the opposite side
  const isNegative = mag > 0;
  const actualMag = Math.abs(mag);
  
  // For negative magnitudes, start the arrow from the opposite side of the member
  // and point it away from the member
  let startX, startY, endX, endY;
  
  if (isNegative) {
    // Start from the opposite side and point away
    startX = point.x + actualMag * Math.cos(radians) * size;
    startY = point.y - actualMag * Math.sin(radians) * size;
    endX = point.x;
    endY = point.y;
  } else {
    // Normal behavior: start from the member and point outward
    startX = point.x;
    startY = point.y;
    endX = point.x + actualMag * Math.cos(radians) * size;
    endY = point.y - actualMag * Math.sin(radians) * size;
  }
  
  const x2 = endX;
  const y2 = endY;
  // Calculate arrowhead size as a proportion of arrow length
  const arrowLength = actualMag * size;
  const arrowheadSize = Math.max(arrowLength * 0.15, strokeWidth * 4); // 15% of arrow length, max 30% of size scale
  
  // Calculate the angle from start to end point for arrowhead positioning
  const arrowAngle = Math.atan2(startY - endY, startX - endX);  return (
    <g className={classNames(className, "cursor-pointer")}>      {/* ATTENTION INDICATOR - Red offset arrow for loads needing attention */}
      {load.needsAttention && (
        <g className="animate-pulse" pointerEvents="none">
          {/* Offset arrow shaft */}
          <line
            x1={startX}
            y1={startY}
            x2={x2}
            y2={y2}
            strokeWidth={strokeWidth*5}
            className="stroke-red-500"
          />
          {/* Offset arrowhead */}
          <line
            x1={endX}
            y1={endY}
            x2={endX + arrowheadSize * Math.cos(arrowAngle + 0.7)}
            y2={endY + arrowheadSize * Math.sin(arrowAngle + 0.7)}
            strokeWidth={strokeWidth*5}
            className="stroke-red-500"
          />
          <line
            x1={endX}
            y1={endY}
            x2={endX + arrowheadSize * Math.cos(arrowAngle - 0.7)}
            y2={endY + arrowheadSize * Math.sin(arrowAngle - 0.7)}
            strokeWidth={strokeWidth*5}
            className="stroke-red-500"
          />
        </g>
      )}

      {/* CLICKABLE AREA */}
      <line
        onClick={(e) => {
          e.stopPropagation();
          load?.id && onClick?.({ id: load.id, ...e });
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        x1={startX}
        y1={startY}
        x2={x2}
        y2={y2}
        strokeWidth={strokeWidth * 3.5}
        stroke="transparent"
      />

      {/* ARROW ITSELF */}
      <line
        x1={startX}
        y1={startY}
        x2={x2}
        y2={y2}
        strokeWidth={strokeWidth*1.5}
        className={stroke}
        pointerEvents="none"
      />
      
      {/* ARROWHEAD */}
      <line
        x1={endX}
        y1={endY}
        x2={endX + arrowheadSize * Math.cos(arrowAngle + 0.7)}
        y2={endY + arrowheadSize * Math.sin(arrowAngle + 0.7)}
        strokeWidth={strokeWidth*1.5}
        className={stroke}
        pointerEvents="none"
      />
      <line
        x1={endX}
        y1={endY}
        x2={endX + arrowheadSize * Math.cos(arrowAngle - 0.7)}
        y2={endY + arrowheadSize * Math.sin(arrowAngle - 0.7)}
        strokeWidth={strokeWidth*1.5}
        className={stroke}
        pointerEvents="none"
      />
    </g>
  );
};

export default RenderedPointLoad;
