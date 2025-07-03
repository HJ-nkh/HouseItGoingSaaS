import { SupportTypeProps } from ".";

const Floor: React.FC<SupportTypeProps> = ({
  strokeWidth,
  className,
  supportId,
}) => {
  // Partial line in the right side
  const elements = [
    <line
      key={`floor-${supportId}`}
      x1="50"
      y1="12.5"
      x2="45"
      y2="20"
      className={className}
      strokeLinecap="round"
      strokeWidth={strokeWidth}
      pointerEvents="none"
    />,
  ];

  for (const x of [8, 16, 24, 32, 40, 48]) {
    elements.push(
      <line
        key={x}
        x1={x}
        y1="5"
        x2={x - 10}
        y2="20"
        className={className}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        pointerEvents="none"
      />
    );
  }

  return elements;
};

export default Floor;
