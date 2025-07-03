import { getNormalizedOrthogonalVector } from "./lib/geometry";
import { Line, Point } from "./lib/types";

type RightAngleProps = {
  point: Point;
  onLine: Line;
  sign: number;
  size: number;
};

const RightAngle: React.FC<RightAngleProps> = ({
  point,
  onLine,
  sign,
  size,
}) => {
  // Not sure why sign needs to be negated?
  const { x: ox, y: oy } = getNormalizedOrthogonalVector(onLine, -sign);

  // Calculate points for the right angle
  const ax = point.x + ox * size;
  const ay = point.y + oy * size;
  const bx = point.x - oy * size;
  const by = point.y + ox * size;
  const cx = point.x + (ox - oy) * size;
  const cy = point.y + (oy + ox) * size;

  const strokeWidth = size * 0.04;

  return [
    <line
      x1={ax}
      y1={ay}
      x2={cx}
      y2={cy}
      className="stroke-gray-400"
      strokeWidth={strokeWidth}
    />,
    <line
      x1={bx}
      y1={by}
      x2={cx}
      y2={cy}
      className="stroke-gray-500"
      strokeWidth={strokeWidth}
    />,
  ];
};

export default RightAngle;
