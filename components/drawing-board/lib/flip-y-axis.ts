import clone from "clone";
import { EntitySet } from "./reduce-history";
import { Simulation } from "@/lib/types";

export const flipYAxisOnResolvedEntities = (
  entitySet: EntitySet
): EntitySet => {
  const newEntitySet = clone(entitySet);
  for (const nodeId of Object.keys(entitySet.nodes)) {
    newEntitySet.nodes[nodeId].resolved.y = -entitySet.nodes[nodeId].resolved.y;
  }

  for (const memberId of Object.keys(entitySet.members)) {
    newEntitySet.members[memberId].resolved.point1.y =
      -entitySet.members[memberId].resolved.point1.y;
    newEntitySet.members[memberId].resolved.point2.y =
      -entitySet.members[memberId].resolved.point2.y;
  }

  for (const pointLoadId of Object.keys(entitySet.pointLoads)) {
    newEntitySet.pointLoads[pointLoadId].resolved.y =
      -entitySet.pointLoads[pointLoadId].resolved.y;
  }

  for (const distributedLoadId of Object.keys(entitySet.distributedLoads)) {
    newEntitySet.distributedLoads[distributedLoadId].resolved.point1.y =
      -entitySet.distributedLoads[distributedLoadId].resolved.point1.y;
    newEntitySet.distributedLoads[distributedLoadId].resolved.point2.y =
      -entitySet.distributedLoads[distributedLoadId].resolved.point2.y;
  }

  for (const momentLoadId of Object.keys(entitySet.momentLoads)) {
    newEntitySet.momentLoads[momentLoadId].resolved.y =
      -entitySet.momentLoads[momentLoadId].resolved.y;
  }

  for (const supportId of Object.keys(entitySet.supports)) {
    newEntitySet.supports[supportId].resolved.y =
      -entitySet.supports[supportId].resolved.y;
  }

  return newEntitySet;
};

export const flipYAxisOnSimulation = (
  result: Simulation["result"]
): Simulation["result"] => {
  if (!result) {
    return result;
  }

  const newResult = clone(result);

  newResult.FEMModel.X = newResult?.FEMModel?.X?.map(([x, y]) => [x, -y]) ?? [];

  return newResult;
};
