import { DrawingState, Tool } from "../types";
import Crosshair from "./Crosshair";

export const getToolSvgElements = (state: DrawingState): React.ReactNode[] => {
  const strokeWidth = state.viewBox[3] * 0.001;

  switch (state.tool) {
    case Tool.Select:
      return [];
    case Tool.Node:
      return [
        <Crosshair key="crosshair" state={state} strokeWidth={strokeWidth} />,
      ];
    case Tool.Member: {
      const svgElements = [
        <Crosshair key="crosshair" state={state} strokeWidth={strokeWidth} />,
      ];

      if (state.isDrawingMember) {
        svgElements.push(
          <line
            key="current-line"
            x1={state.startPosition.x}
            x2={state.cursorPosition.x}
            y1={state.startPosition.y}
            y2={state.cursorPosition.y}
            stroke="darkgray"
            strokeWidth={strokeWidth * 2}
          />
        );
      }

      return svgElements;
    }
    default: {
      return [];
    }
  }
};
