import { ActionType, DrawingState, Entity } from "../types";
import { InputEventType, InputEventHandler } from "./types";
import handleCanvasWheel from "./canvas-wheel";
import handleCanvasMouseMove from "./canvas-mouse-move";
import handleCanvasMouseDown from "./canvas-mouse-down";
import handleCanvasMouseUp from "./canvas-mouse-up";
import handleCanvasClick from "./canvas-click";
import handleNodeClick from "./node-click";
import handleMemberClick from "./member-click";
import handlePointLoadClick from "./point-load-click";
import handleMomentLoadClick from "./moment-load-click";
import handleHotkey from "./hotkey";
import handleDistributedLoadClick from "./distributed-load-click";
import handleSupportClick from "./support-click";

export * from "./types";

export const handleInputEvent: InputEventHandler = (
  state,
  svgRef,
  entitySet,
  e
): Partial<DrawingState> | null => {
  switch (e.type) {
    case InputEventType.CanvasWheel: {
      return handleCanvasWheel(state, svgRef, entitySet, e);
    }
    case InputEventType.CanvasMouseMove: {
      return handleCanvasMouseMove(state, svgRef, entitySet, e);
    }
    case InputEventType.CanvasMouseDown: {
      return handleCanvasMouseDown(state, svgRef, entitySet, e);
    }
    case InputEventType.CanvasMouseUp: {
      return handleCanvasMouseUp(state, svgRef, entitySet, e);
    }
    case InputEventType.CanvasClick: {
      return handleCanvasClick(state, svgRef, entitySet, e);
    }
    case InputEventType.NodeClick: {
      return handleNodeClick(state, svgRef, entitySet, e);
    }
    case InputEventType.MemberClick: {
      return handleMemberClick(state, svgRef, entitySet, e);
    }
    case InputEventType.PointLoadClick: {
      return handlePointLoadClick(state, svgRef, entitySet, e);
    }
    case InputEventType.DistributedLoadClick: {
      return handleDistributedLoadClick(state, svgRef, entitySet, e);
    }
    case InputEventType.MomentLoadClick: {
      return handleMomentLoadClick(state, svgRef, entitySet, e);
    }
    case InputEventType.SupportClick: {
      return handleSupportClick(state, svgRef, entitySet, e);
    }
    case InputEventType.HotKey: {
      return handleHotkey(state, svgRef, entitySet, e);
    }
    // Special events for key combinations
    case InputEventType.CtrlZ: {
      // Undo
      return {
        history: [
          ...state.history,
          { type: ActionType.Undo, entity: Entity.Null },
        ],
      };
    }
    case InputEventType.CtrlY:
    case InputEventType.CtrlShiftZ: {
      // Redo by popping Undo action from history
      if (state.history[state.history.length - 1].type === ActionType.Undo) {
        const history = state.history.slice(0, -1);

        return { history };
      }
    }
  }

  return null;
};
