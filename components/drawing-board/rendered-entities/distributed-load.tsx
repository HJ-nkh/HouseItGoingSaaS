import classNames from "classnames";
import { InputEventPayload } from "../lib/events";
import { distanceBetween, getLineAngle } from "../lib/geometry";
import { PointLoad, ResolvedDistributedLoad } from "../lib/types";
import RenderedPointLoad from "./point-load";
import { loadTypeColors } from "@/lib/constants/colors";
import { LoadType } from "../lib/types";

type DistributedLoadProps = {
  load: ResolvedDistributedLoad;
  onClick?: (payload: InputEventPayload) => void;
  className?: string;
  gridSize: number;
  isSelected: boolean;
  isHovered: boolean;
  strokeWidth: number;
  size: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
};

const RenderedDistributedLoad: React.FC<DistributedLoadProps> = ({
  load,
  onClick,
  className,
  gridSize,
  isSelected,
  isHovered,
  strokeWidth,
  size,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!load || (!load.magnitude1 && !load.magnitude2)) {
    return null;
  }

  let stroke = "stroke-gray-400";

  if (isHovered) {
    stroke = "stroke-sky-400";
  }

  if (isSelected) {
    stroke = "stroke-sky-600";
  }

  const { point1: originalPoint1, point2: originalPoint2 } = load.resolved;

  // Create copies of point1 and point2 to modify
  const point1 = { ...originalPoint1 };
  const point2 = { ...originalPoint2 };

  if (load.type === LoadType.Snow) {
    // Determine the highest point's y-coordinate to set it above the member
    const highestY = Math.min(point1.y, point2.y);
    // Adjust points to make the load horizontal and positioned based on the highest point
    point1.y = highestY;
    point2.y = highestY;
  }

  // Use modifiedPoint1 and modifiedPoint2 for further calculations and rendering

  const length = distanceBetween(point1, point2);

  const mag1 = load.magnitude1 ?? 0;
  const mag2 = load.magnitude2 ?? mag1;

  // Based on zoom state and length, calculate distance between arrows
  // The distance is a whole fraction of the member length
  const arrowDistance = length / Math.round(length / gridSize);

  // Gradients of change in magnitude, x and y between each arrow along the line
  const magGradient = ((mag2 - mag1) * arrowDistance) / length;
  const xGradient = ((point2.x - point1.x) * arrowDistance) / length;
  const yGradient = ((point2.y - point1.y) * arrowDistance) / length;

  const arrowsInBetween: React.ReactNode[] = [];

  let degrees = load.angle?.value ?? 90;

  if (load.angle?.relativeTo === "member") {
    degrees -= getLineAngle(load.resolved);
  }

  const angle: PointLoad["angle"] = {
    value: degrees,
    relativeTo: "x",
  };

  for (let i = 1; i * arrowDistance < length; i++) {
    const x = point1.x + i * xGradient;
    const y = point1.y + i * yGradient;

    arrowsInBetween.push(
      <RenderedPointLoad
        key={`${load.id}-arrow-${i}`}
        load={{
          id: load.id,
          type: load.type,
          magnitude: mag1 + magGradient * i,
          angle,
          resolved: { x, y },
        }}
        isSelected={isSelected}
        isHovered={isHovered}
        strokeWidth={strokeWidth}
        size={size}
        onClick={(payload) => load.id && onClick?.({ ...payload, id: load.id })}
      />
    );
  }

  const radians = (degrees * Math.PI) / 180;

  const x1 = point1.x;
  const y1 = point1.y;

  const x2 = point2.x;
  const y2 = point2.y;
  const x4 = point1.x + Math.abs(mag1) * Math.cos(radians) * size;
  const y4 = point1.y - Math.abs(mag1) * Math.sin(radians) * size;

  const x3 = point2.x + Math.abs(mag2) * Math.cos(radians) * size;
  const y3 = point2.y - Math.abs(mag2) * Math.sin(radians) * size;

  const pointsStr = [
    [x1, y1].join(","),
    [x2, y2].join(","),
    [x3, y3].join(","),
    [x4, y4].join(","),
  ].join(" ");

  const fill = loadTypeColors.fill[load.type];

  return (
    <g className={className}>
      {/* CLICKABLE AREA */}
      <polygon
        points={pointsStr}
        className={classNames(fill, "opacity-30 cursor-pointer")}
        onClick={(e) => {
          e.stopPropagation();
          load.id && onClick?.({ id: load.id, ...e });
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />

      {/* EDGE ARROWS */}
      <RenderedPointLoad
        load={{
          id: load.id,
          type: load.type,
          magnitude: mag1,
          angle,
          resolved: point1,
        }}
        isSelected={isSelected}
        isHovered={isHovered}
        strokeWidth={strokeWidth}
        size={size}
        onClick={(payload) => load.id && onClick?.({ ...payload, id: load.id })}
      />
      <RenderedPointLoad
        load={{
          id: load.id,
          type: load.type,
          magnitude: mag2,
          angle,
          resolved: point2,
        }}
        isSelected={isSelected}
        isHovered={isHovered}
        strokeWidth={strokeWidth}
        size={size}
        onClick={(payload) => load.id && onClick?.({ id: load.id, ...payload })}
      />

      {arrowsInBetween}

      {/* TOP LINE */}
      <line
        x1={x4}
        y1={y4}
        x2={x3}
        y2={y3}
        strokeWidth={strokeWidth}
        className={stroke}
        pointerEvents="none"
      />
    </g>
  );
};

export default RenderedDistributedLoad;
