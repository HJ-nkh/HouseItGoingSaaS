import { SupportTypeProps } from ".";
import Floor from "./floor";

const RenderedRollerSupport: React.FC<SupportTypeProps> = ({
  strokeWidth,
  className,
  supportId,
}) => {
  return [
    <polygon
      key={`polygoin-${supportId}`}
      points="25,0 50,40 0,40"
      fill="none"
      className={className}
      strokeLinecap="round"
      strokeWidth={strokeWidth}
      pointerEvents="none"
    />,
    <circle
      key={`circle1-${supportId}`}
      cx="10"
      cy="45"
      r="5"
      fill="none"
      className={className}
      strokeWidth={strokeWidth}
      pointerEvents="none"
    />,
    <circle
      key={`circle2-${supportId}`}
      cx="40"
      cy="45"
      r="5"
      fill="none"
      className={className}
      strokeWidth={strokeWidth}
      pointerEvents="none"
    />,
    <line
      key={`line1-${supportId}`}
      x1="0"
      y1="50"
      x2="50"
      y2="50"
      className={className}
      strokeWidth={strokeWidth}
      pointerEvents="none"
    />,
    <svg x="0" y="45" key={`floor-svg-${supportId}`}>
      <Floor
        strokeWidth={strokeWidth}
        className={className}
        supportId={supportId}
      />
    </svg>,
  ];
};

export default RenderedRollerSupport;
