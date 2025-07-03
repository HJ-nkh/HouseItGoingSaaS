import { SupportTypeProps } from ".";
import Floor from "./floor";

const RenderedFixedSupport: React.FC<SupportTypeProps> = ({
  strokeWidth,
  className,
  supportId,
}) => {
  const elements = [
    <line
      key={`line1-${supportId}`}
      x1="0"
      y1="5"
      x2="50"
      y2="5"
      className={className}
      strokeLinecap="round"
      strokeWidth={strokeWidth}
      pointerEvents="none"
    />,
    <line
      key={`line2-${supportId}`}
      x1="0"
      y1="5"
      x2="0"
      y2="20"
      className={className}
      strokeLinecap="round"
      strokeWidth={strokeWidth}
      pointerEvents="none"
    />,
    <line
      key={`line3-${supportId}`}
      x1="50"
      y1="5"
      x2="50"
      y2="20"
      className={className}
      strokeLinecap="round"
      strokeWidth={strokeWidth}
      pointerEvents="none"
    />,
    <Floor
      strokeWidth={strokeWidth}
      className={className}
      supportId={supportId}
    />,
  ];

  return elements;
};

export default RenderedFixedSupport;
