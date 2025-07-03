import { SupportTypeProps } from ".";
import Floor from "./floor";

const RenderedPinnedSupport: React.FC<SupportTypeProps> = ({
  strokeWidth,
  className,
  supportId,
}) => {
  const elements = [
    <polygon
      key={`polygon-${supportId}`}
      points="25,0 50,40 0,40"
      fill="none"
      className={className}
      strokeWidth={strokeWidth}
      pointerEvents="none"
    />,
    <svg x="0" y="35" key={`floor-svg-${supportId}`}>
      <Floor
        strokeWidth={strokeWidth}
        className={className}
        supportId={supportId}
      />
    </svg>,
  ];

  return elements;
};

export default RenderedPinnedSupport;
