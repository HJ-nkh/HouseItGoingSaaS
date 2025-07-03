import { InputEventHandler } from "./types";
import { DrawingState, Tool } from "../types";

/**
 * Mouse up event will stop panning
 */
const handleCanvasMouseUp: InputEventHandler = (
  state
): Partial<DrawingState> | null => {
  if (state.tool === Tool.Select) {
    return { isPanning: false };
  }

  return null;
};

export default handleCanvasMouseUp;
