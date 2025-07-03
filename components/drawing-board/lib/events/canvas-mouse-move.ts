import { Tool, DrawingState } from "../types";
import { InputEventHandler } from "./types";
import { toSvgCoordinates } from "../svg-coordinates";
import {
  distanceBetween,
  getNormalizedOrthogonalVector,
  projectPointOnLine,
} from "../geometry";
import { EntitySet } from "../reduce-history";

export const handleCursorPositionSnap = (
  cursorPosition: { x: number; y: number },
  state: DrawingState,
  entitySet: EntitySet
): [{ x: number; y: number }, boolean] => {
  if (state.startMemberId && state.isDrawingMember) {
    // Orthogonal projection
    const orthogonalVector = getNormalizedOrthogonalVector(
      entitySet.members[state.startMemberId].resolved,
      1
    );
    const orthogonalLine = {
      point1: state.startPosition,
      point2: {
        x: state.startPosition.x + orthogonalVector.x,
        y: state.startPosition.y + orthogonalVector.y,
      },
    };
    const orthogonalProjection = projectPointOnLine(
      orthogonalLine,
      cursorPosition
    );
    const orthogonalDistance = distanceBetween(
      orthogonalProjection,
      cursorPosition
    );

    if (orthogonalDistance < state.gridSize) {
      return [orthogonalProjection, true];
    }

    // Vertical projection
    const verticalLine = {
      point1: state.startPosition,
      point2: { x: state.startPosition.x, y: state.startPosition.y + 1 },
    };
    const verticalProjection = projectPointOnLine(verticalLine, cursorPosition);
    const verticalDistance = distanceBetween(
      verticalProjection,
      cursorPosition
    );

    if (verticalDistance < state.gridSize) {
      return [verticalProjection, false];
    }

    // Horizontal projection
    const horizontalLine = {
      point1: state.startPosition,
      point2: { x: state.startPosition.x + 1, y: state.startPosition.y },
    };
    const horizontalProjection = projectPointOnLine(
      horizontalLine,
      cursorPosition
    );
    const horizontalDistance = distanceBetween(
      horizontalProjection,
      cursorPosition
    );

    if (horizontalDistance < state.gridSize) {
      return [horizontalProjection, false];
    }
  }

  cursorPosition.x =
    Math.round(cursorPosition.x / state.gridSize) * state.gridSize;
  cursorPosition.y =
    Math.round(cursorPosition.y / state.gridSize) * state.gridSize;

  return [cursorPosition, false];
};

/**
 * Mouse move event adjust the cursor position
 * If panning, adjust the view box
 */
const handleCanvasMouseMove: InputEventHandler = (
  state,
  svgRef,
  entitySet,
  e
): Partial<DrawingState> | null => {
  if (!e.payload || !e.payload?.clientPosition || !svgRef) {
    return null;
  }

  const pos = e.payload.clientPosition;
  let cursorPosition = toSvgCoordinates(pos, svgRef);
  let isSnappingOrthogonally = false;

  // "!state.isPanning" is necessary because snap messes up the smooth panning
  if (e.payload.altKey && !state.isPanning) {
    const [snappedPosition, isOrthogonal] = handleCursorPositionSnap(
      cursorPosition,
      state,
      entitySet
    );
    cursorPosition = snappedPosition;
    isSnappingOrthogonally = isOrthogonal;
  }

  const update: Partial<DrawingState> = {
    cursorPosition,
    isSnappingOrthogonally,
  };

  if (state.tool === Tool.Select && state.isPanning) {
    const newPos = cursorPosition;
    if (!newPos) return null;
    const dx = state.startPosition.x - newPos.x;
    const dy = state.startPosition.y - newPos.y;

    update.viewBox = [
      state.viewBox[0] + dx,
      state.viewBox[1] + dy,
      state.viewBox[2],
      state.viewBox[3],
    ];
  }

  return update;
};

export default handleCanvasMouseMove;
