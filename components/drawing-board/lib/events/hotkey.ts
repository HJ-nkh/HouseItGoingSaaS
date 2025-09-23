import { InputEventHandler } from "./types";
import { ActionType, LoadType, DrawingState, Tool } from "../types";
import getEntityType from "../get-entity-type";
import {
  isAnyEntityShown,
  showAllEntities,
  hideAllEntities,
} from "../show-entities";

const handleHotkey: InputEventHandler = (
  state,
  _,
  __,
  e
): Partial<DrawingState> | null => {  if (e.payload?.key === "Escape") {
    const baseEscapeState = {
      isDrawingMember: false,
      startMemberId: null,
      modifyingEntity: null,
    };

    // If no modal dialogs are open (no drawing in progress and no entity being modified),
    // also switch to the select tool
    if (!state.isDrawingMember && !state.modifyingEntity) {
      return {
        ...baseEscapeState,
        tool: Tool.Select,
      };
    }

    return baseEscapeState;
  }

  if (e.payload?.key === "v") {
    return { tool: Tool.Select, pendingLoadTargets: {} };
  }
  if (e.payload?.key === "n") {
    return { tool: Tool.Node, pendingLoadTargets: {} };
  }

  if (e.payload?.key === "m") {
    return { tool: Tool.MomentLoad, pendingLoadTargets: {} };
  }

  if (e.payload?.key === "k") {
    return { tool: Tool.Member, pendingLoadTargets: {} };
  }

  if (e.payload?.key === "u") {
    return { tool: Tool.Support, pendingLoadTargets: {} };
  }

  if (e.payload?.key === "l") {
    return { tool: Tool.DistributedLoad, pendingLoadTargets: {} };
  }

  if (e.payload?.key === "p") {
    return { tool: Tool.PointLoad, pendingLoadTargets: {} };
  }

  if (e.payload?.key === "g") {
    return { showGrid: !state.showGrid };
  }

  if (e.payload?.key === "q") {
    const hide = isAnyEntityShown(state.showEntities);
    return {
      showEntities: hide ? hideAllEntities : showAllEntities,
    };
  }

  if (e.payload?.key === "e") {
    return {
      showEntities: {
        ...state.showEntities,
        distributedLoads: {
          ...state.showEntities.distributedLoads,
          [LoadType.Snow]:
            !state.showEntities.distributedLoads[LoadType.Snow],
        },
      },
    };
  }

  if (e.payload?.key === "r") {
    return {
      showEntities: {
        ...state.showEntities,
        distributedLoads: {
          ...state.showEntities.distributedLoads,
          [LoadType.Wind]:
            !state.showEntities.distributedLoads[LoadType.Wind],
        },
      },
    };
  }

  if (e.payload?.key === "t") {
    return {
      showEntities: {
        ...state.showEntities,
        distributedLoads: {
          ...state.showEntities.distributedLoads,
          [LoadType.Dead]:
            !state.showEntities.distributedLoads[LoadType.Dead],
        },
      },
    };
  }

  if (e.payload?.key === "y") {
    return {
      showEntities: {
        ...state.showEntities,
        distributedLoads: {
          ...state.showEntities.distributedLoads,
          [LoadType.Live]:
            !state.showEntities.distributedLoads[LoadType.Live],
        },
      },
    };
  }

  if (e.payload?.key === "Delete") {
    if (state.selectedIds.length) {
      const actions = [];
      for (const id of state.selectedIds) {
        const entityType = getEntityType(id);

        actions.push({
          type: ActionType.Delete,
          entity: entityType,
          value: { id },
        });
      }

      return { history: [...state.history, ...actions], selectedIds: [] };
    }
  }

  return null;
};

export default handleHotkey;
