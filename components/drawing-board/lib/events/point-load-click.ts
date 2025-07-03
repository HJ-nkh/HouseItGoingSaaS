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
    let selectedIds: string[] = [];

    if (e.payload.ctrlKey || e.payload.metaKey) {
      selectedIds = [...state.selectedIds];
    }

    selectedIds.push(e.payload.id as string);

    let modifyingEntity: DrawingState["modifyingEntity"] = null;

    if (selectedIds.length === 1) {
      modifyingEntity = {
        type: Entity.PointLoad,
        pointLoad: entitySet.pointLoads[e.payload.id],
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
