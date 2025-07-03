import { DrawingState, Tool } from "../types";
import { InputEventHandler } from "./types";
import { toSvgCoordinates } from "../svg-coordinates";

/**
 * Mouse down starts panning of select tool
 * Right-clicking cancels member drawing
 */
const handleCanvasMouseDown: InputEventHandler = (
  state,
  svgRef,
  _,
  e
): Partial<DrawingState> | null => {
  if (state.tool === Tool.Select) {
    return {
      isPanning: true,
      startPosition: toSvgCoordinates(
        e.payload?.clientPosition as { clientX: number; clientY: number },
        svgRef
      ),
    };
  }

  if (e.payload?.button === 2) {
    // Right click escapes drawing a member
    return { isDrawingMember: false };
  }

  return null;
};

export default handleCanvasMouseDown;
