import { Drawing } from "@/types";
import reduceHistory from "./reduce-history";
import { LoadType, DrawingState, Tool } from "./types";

export const defaultDrawingState = (aspectRatio: number): DrawingState => ({
  // Persisted
  history: [],
  nextNodeNumber: 0,
  nextMemberNumber: 0,
  nextPointLoadNumber: 0,
  nextDistributedLoadNumber: 0,
  nextMomentLoadNumber: 0,
  nextSupportNumber: 0,

  // Ephemeral
  tool: Tool.Select,
  cursorPosition: { x: 0, y: 0 },
  startPosition: { x: 0, y: 0 },
  viewBox: [-10 * aspectRatio, -10, 20 * aspectRatio, 20],
  gridSize: 1,
  showGrid: true,
  selectedIds: [],
  hoveringId: null,
  isPanning: false,
  isDrawingMember: false,
  isSnappingOrthogonally: false,
  modifyingEntity: null,
  createNewNode: false,
  startNodeId: null,
  startMemberId: null,
  showEntities: {
    distributedLoadsButton: true,
    pointLoadsButton: true,
    momentLoadsButton: true,
    loadtypeButtons: {
      [LoadType.Standard]: true,
      [LoadType.Snow]: true,
      [LoadType.Wind]: true,
      [LoadType.Dead]: true,
      [LoadType.Live]: true,
    },
    pointLoads: {
      [LoadType.Standard]: true,
      [LoadType.Snow]: true,
      [LoadType.Wind]: true,
      [LoadType.Dead]: true,
      [LoadType.Live]: true,
    },
    distributedLoads: {
      [LoadType.Standard]: true,
      [LoadType.Snow]: true,
      [LoadType.Wind]: true,
      [LoadType.Dead]: true,
      [LoadType.Live]: true,
    },
    momentLoads: {
      [LoadType.Standard]: true,
      [LoadType.Snow]: true,
      [LoadType.Wind]: true,
      [LoadType.Dead]: true,
      [LoadType.Live]: true,
    },
  },
  showSimulation: false,
  hasChanges: true,
});

export const makeDrawingState = (
  drawing: Drawing,
  aspectRatio: number
): DrawingState => {
  const state = defaultDrawingState(aspectRatio);

  state.history = drawing.history;
  state.hasChanges = drawing.hasChanges ?? true;

  const entitySet = reduceHistory(state.history);

  const maxNodeNumber = Math.max(
    ...Object.keys(entitySet.nodes).map((id) =>
      parseInt(id.replace("n-", ""), 10)
    ),
    0
  );
  const maxMemberNumber = Math.max(
    ...Object.keys(entitySet.members).map((id) =>
      parseInt(id.replace("m-", ""), 10)
    ),
    0
  );
  const maxPointLoadNumber = Math.max(
    ...Object.keys(entitySet.pointLoads).map((id) =>
      parseInt(id.replace("pl-", ""), 10)
    ),
    0
  );
  const maxDistributedLoadNumber = Math.max(
    ...Object.keys(entitySet.distributedLoads).map((id) =>
      parseInt(id.replace("dl-", ""), 10)
    ),
    0
  );
  const maxMomentLoadNumber = Math.max(
    ...Object.keys(entitySet.momentLoads).map((id) =>
      parseInt(id.replace("ml-", ""), 10)
    ),
    0
  );
  const maxSupportNumber = Math.max(
    ...Object.keys(entitySet.supports).map((id) =>
      parseInt(id.replace("s-", ""), 10)
    ),
    0
  );

  state.nextNodeNumber = maxNodeNumber + 1;
  state.nextMemberNumber = maxMemberNumber + 1;
  state.nextPointLoadNumber = maxPointLoadNumber + 1;
  state.nextDistributedLoadNumber = maxDistributedLoadNumber + 1;
  state.nextMomentLoadNumber = maxMomentLoadNumber + 1;
  state.nextSupportNumber = maxSupportNumber + 1;

  return state;
};
