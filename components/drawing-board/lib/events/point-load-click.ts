import { InputEventHandler } from "./types";
import { DrawingState, Entity, Tool } from "../types";

const handlePointLoadClick: InputEventHandler = (
  state,
  _,
  entitySet,
  e
): Partial<DrawingState> | null => {
  if (!e.payload?.id) {
    return null;
  }

  if (
    state.tool === Tool.Select ||
    state.tool === Tool.PointLoad ||
    state.tool === Tool.DistributedLoad ||
    state.tool === Tool.MomentLoad
  ) {
    const loadId = e.payload.id as string;
    let selectedIds: string[];

    if (e.payload.ctrlKey || e.payload.metaKey) {
      // Toggle selection: remove if already selected, add if not
      const already = state.selectedIds.includes(loadId);
      selectedIds = already
        ? state.selectedIds.filter((id) => id !== loadId)
        : [...state.selectedIds, loadId];
    } else {
      selectedIds = [loadId];
    }

    let modifyingEntity: DrawingState["modifyingEntity"] = null;

    if (selectedIds.length === 1) {
      modifyingEntity = {
        type: Entity.PointLoad,
        pointLoad: entitySet.pointLoads[selectedIds[0]],
      };
    }

    return {
      selectedIds,
      modifyingEntity,
    };
  }

  // TODO: Do something with other tools
  return null;
};

export default handlePointLoadClick;
