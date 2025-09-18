import { LoadType, DrawingState, PointLoad, DistributedLoad, MomentLoad } from "./types";

export type EntitySet = {
  pointLoads: { [id: string]: PointLoad };
  distributedLoads: { [id: string]: DistributedLoad };
  momentLoads: { [id: string]: MomentLoad };
};

export const getLoadType = (loadId: string, entitySet: EntitySet): LoadType | null => {
  if (loadId.startsWith('pl-')) {
    return entitySet.pointLoads[loadId]?.type || null;
  }
  if (loadId.startsWith('dl-')) {
    return entitySet.distributedLoads[loadId]?.type || null;
  }
  if (loadId.startsWith('ml-')) {
    return entitySet.momentLoads[loadId]?.type || null;
  }
  return null;
};

export const canGroupSelectedLoads = (
  selectedIds: string[],
  entitySet: EntitySet
): { canGroup: boolean; loadType: LoadType | null } => {
  if (selectedIds.length < 2) {
    return { canGroup: false, loadType: null };
  }

  // Filter only load entities
  const loadIds = selectedIds.filter(id => 
    id.startsWith('pl-') || id.startsWith('dl-') || id.startsWith('ml-')
  );

  if (loadIds.length < 2) {
    return { canGroup: false, loadType: null };
  }

  // Check if all loads have the same type
  const firstLoadType = getLoadType(loadIds[0], entitySet);
  if (!firstLoadType) {
    return { canGroup: false, loadType: null };
  }

  const allSameType = loadIds.every(id => getLoadType(id, entitySet) === firstLoadType);
  
  return { canGroup: allSameType, loadType: firstLoadType };
};

export const generateGroupId = (nextGroupNumber: number): string => {
  return `group-${nextGroupNumber}`;
};

export const createLoadGroup = (
  selectedLoadIds: string[],
  loadType: LoadType,
  nextGroupNumber: number,
  customName?: string
) => {
  return {
    id: generateGroupId(nextGroupNumber),
    name: customName || `Group ${nextGroupNumber}`,
    type: loadType,
    loadIds: selectedLoadIds,
    visible: true,
  };
};

export const getGroupsContainingLoad = (
  loadId: string,
  groups: DrawingState["loadGroups"]
): DrawingState["loadGroups"] => {
  return groups.filter(group => group.loadIds.includes(loadId));
};

export const isLoadVisibleThroughGroups = (
  loadId: string,
  groups: DrawingState["loadGroups"],
  showEntities: DrawingState["showEntities"]
): boolean => {
  const containingGroups = getGroupsContainingLoad(loadId, groups);
  
  // If the load is not in any group, use default visibility logic
  if (containingGroups.length === 0) {
    return true; // Let the existing visibility logic handle it
  }
  
  // If the load is in groups, it's visible if any of its groups are visible
  return containingGroups.some(group => showEntities.groups[group.id] !== false);
};

export const isLoadVisible = (
  loadId: string,
  loadType: LoadType,
  state: DrawingState
): boolean => {
  // If a group is active, only show loads from that group
  if (state.showEntities.activeGroupId) {
    const activeGroup = state.loadGroups.find(g => g.id === state.showEntities.activeGroupId);
    if (activeGroup) {
      // Only show loads that are in the active group
      return activeGroup.loadIds.includes(loadId);
    }
  }

  // No active group - use traditional visibility logic
  if (loadId.startsWith('pl-')) {
    return state.showEntities.pointLoads[loadType];
  } else if (loadId.startsWith('dl-')) {
    return state.showEntities.distributedLoads[loadType];
  } else if (loadId.startsWith('ml-')) {
    return state.showEntities.momentLoads[loadType];
  }

  return false;
};
