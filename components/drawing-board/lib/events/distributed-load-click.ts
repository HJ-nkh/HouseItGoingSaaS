import { InputEventHandler } from "./types";
import { DrawingState, Entity, Tool } from "../types";

const handleDistributedLoadClick: InputEventHandler = (
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
    state.tool === Tool.DistributedLoad
  ) {
    const loadId = e.payload.id as string;
    // If in DistributedLoad tool, only allow multi-select of distributed loads
    const baseSelection =
      state.tool === Tool.DistributedLoad
        ? state.selectedIds.filter((id) => id.startsWith("dl-"))
        : state.selectedIds;
    let selectedIds: string[];

    if (e.payload.ctrlKey || e.payload.metaKey) {
      // Toggle selection: remove if already selected, add if not
      const already = baseSelection.includes(loadId);
      selectedIds = already
        ? baseSelection.filter((id) => id !== loadId)
        : [...baseSelection, loadId];
    } else {
      selectedIds = [loadId];
    }

    let modifyingEntity: DrawingState["modifyingEntity"] = null;

    if (selectedIds.length === 1) {
      modifyingEntity = {
        type: Entity.DistributedLoad,
        distributedLoad: entitySet.distributedLoads[selectedIds[0]],
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

export default handleDistributedLoadClick;
