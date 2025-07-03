import { JSX } from "react";

type GridProps = {
  gridSize: number;
  viewBox: [number, number, number, number];
};

const Grid: React.FC<GridProps> = ({ gridSize, viewBox }) => {
  const lines: JSX.Element[] = [];

  const [x, y, width, height] = viewBox;

  const startX = Math.floor(x / gridSize) * gridSize;
  const startY = Math.floor(y / gridSize) * gridSize;

  const strokeWidth = height * 0.001;

  for (let i = startX; i <= x + width; i += gridSize) {
    const isAxis = i === 0;
    lines.push(
      <line
        key={`v-${i}`}
        x1={i}
        y1={y}
        x2={i}
        y2={y + height}
        stroke="darkgray"
        strokeWidth={isAxis ? strokeWidth * 1.2 : strokeWidth}
        className={isAxis ? "" : "opacity-40"}
      />
    );
    lines.push(
      <text
        key={`v-${i}-label`}
        x={i - 0.007 * width}
        y={y + 0.01 * height}
        fontSize={height / 100}
        className="select-none"
      >
        {i}
      </text>
    );
  }

  for (let i = -startY; i >= -y - height; i -= gridSize) {
    const isAxis = i === 0;
    lines.push(
      <line
        key={`h-${i}`}
        x1={x}
        y1={-i}
        x2={x + width}
        y2={-i}
        stroke="darkgray"
        strokeWidth={isAxis ? strokeWidth * 1.2 : strokeWidth}
        className={isAxis ? "" : "opacity-40"}
      />
    );
    lines.push(
      <text
        key={`h-${i}-label`}
        x={x + 0.01 * width}
        y={-i + 0.003 * height}
        fontSize={height / 100}
        className="select-none"
      >
        {i}
      </text>
    );
  }

  return <>{lines}</>;
};

export default Grid;
