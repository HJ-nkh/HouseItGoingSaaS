import { DrawingState } from "../types";

const Crosshair: React.FC<{ state: DrawingState; strokeWidth: number }> = ({
  state,
  strokeWidth,
}) => [
  <line
    key="cursor-v"
    x1={state.cursorPosition.x}
    x2={state.cursorPosition.x}
    y1={state.viewBox[1]}
    y2={state.viewBox[1] + state.viewBox[3]}
    stroke="gray"
    strokeDasharray="0.2"
    strokeWidth={strokeWidth}
  />,
  <line
    key="cursor-h"
    x1={state.viewBox[0]}
    x2={state.viewBox[0] + state.viewBox[2]}
    y1={state.cursorPosition.y}
    y2={state.cursorPosition.y}
    stroke="gray"
    strokeDasharray="0.2"
    strokeWidth={strokeWidth}
  />,
];

export default Crosshair;
