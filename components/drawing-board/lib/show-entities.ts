import { LoadType, DrawingState } from "./types";

export const hideAllEntities: DrawingState["showEntities"] = {
  distributedLoadsButton: false,
  pointLoadsButton: false,
  momentLoadsButton: false,
  loadtypeButtons: {
    [LoadType.Standard]: false,
    [LoadType.Snow]: false,
    [LoadType.Wind]: false,
    [LoadType.Dead]: false,
    [LoadType.Live]: false,
  },
  pointLoads: {
    [LoadType.Standard]: false,
    [LoadType.Snow]: false,
    [LoadType.Wind]: false,
    [LoadType.Dead]: false,
    [LoadType.Live]: false,
  },
  momentLoads: {
    [LoadType.Standard]: false,
    [LoadType.Snow]: false,
    [LoadType.Wind]: false,
    [LoadType.Dead]: false,
    [LoadType.Live]: false,
  },
  distributedLoads: {
    [LoadType.Standard]: false,
    [LoadType.Snow]: false,
    [LoadType.Wind]: false,
    [LoadType.Dead]: false,
    [LoadType.Live]: false,
  },
  groups: {},
  activeGroupId: null,
};

export const showAllEntities: DrawingState["showEntities"] = {
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
  momentLoads: {
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
  groups: {},
  activeGroupId: null,
};

export const isAnyDistributedLoadShown = (
  showEntities: DrawingState["showEntities"]
): boolean => Object.values(showEntities.distributedLoads).some(Boolean);

export const isAnyPointLoadShown = (
  showEntities: DrawingState["showEntities"]
): boolean => Object.values(showEntities.pointLoads).some(Boolean);

export const isAnyMomentLoadShown = (
  showEntities: DrawingState["showEntities"]
): boolean => Object.values(showEntities.momentLoads).some(Boolean);


export const isAnyEntityShown = (
  showEntities: DrawingState["showEntities"]
): boolean => isAnyDistributedLoadShown(showEntities) || isAnyPointLoadShown(showEntities) || isAnyMomentLoadShown(showEntities);
