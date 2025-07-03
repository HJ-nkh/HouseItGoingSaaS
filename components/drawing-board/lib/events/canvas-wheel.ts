import { DrawingState } from "../types";
import { InputEventHandler } from "./types";
import { toSvgCoordinates } from "../svg-coordinates";

/**
 * Canvas wheel event will adjust the zoom on the drawing board
 */
const handleCanvasWheel: InputEventHandler = (
  state,
  svgRef,
  __,
  e
): Partial<DrawingState> | null => {
  if (!e.payload?.clientPosition || !e.payload.deltaY) {
    return null;
  }
  const zoomFactor = e.payload.deltaY < 0 ? 0.90 : 1.15; // reverse direction of scroll
  const cursorPos = toSvgCoordinates(e.payload?.clientPosition, svgRef);

  const [vx, vy, vw, vh] = state.viewBox;
  const newWidth = vw * zoomFactor;
  const newHeight = vh * zoomFactor;

  // Calculate new viewBox origin, so that the point under the cursor stays in the same place
  const newX = cursorPos.x - (cursorPos.x - vx) * (newWidth / vw);
  const newY = cursorPos.y - (cursorPos.y - vy) * (newHeight / vh);

  const update: Partial<DrawingState> = {
    viewBox: [newX, newY, newWidth, newHeight],
  };
  if (newWidth / state.gridSize > 40) {
    update.gridSize = state.gridSize * 2;
  }

  if (newWidth / state.gridSize < 15) {
    update.gridSize = state.gridSize / 2;
  }

  return update;
};

export default handleCanvasWheel;
