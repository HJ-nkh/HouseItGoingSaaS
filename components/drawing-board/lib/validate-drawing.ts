import { EntitySet } from "./reduce-history";
import { MaterialType } from "./types";

export const isValidDrawing = (
  entitySet: EntitySet
): { ok?: boolean; error?: string } => {
  // Must have at least two nodes
  if (Object.keys(entitySet.members).length === 0) {
    return { error: "Ingen konstruktionsdele fundet i model" };
  }

  // Every member must have memberprop
  for (const member of Object.values(entitySet.members)) {
    if (!member.memberprop?.type) {
      return { error: "Der skal vælges materiale for alle konstruktionsdele" };
    }

    if (!member.memberprop.steelProfile && !member.memberprop.woodType) {
      return { error: "Der skal vælges materiale for alle konstruktionsdele" };
    }

    if (
      member.memberprop.type === MaterialType.Wood &&
      !(member.memberprop.woodSize?.height && member.memberprop.woodSize.width)
    ) {
      return {
        error: "Der skal vælges dimensioner for alle trækonstruktionsdele",
      };
    }
  }

  // Must have supports
  if (Object.keys(entitySet.supports).length === 0) {
    return { error: "Ingen understøtninger fundet i model" };
  }

  // Must have loads
  if (
    Object.keys(entitySet.pointLoads).length +
      Object.keys(entitySet.distributedLoads).length +
      Object.keys(entitySet.momentLoads).length ===
    0
  ) {
    return { error: "Ingen laster fundet i model" };
  }

  return { ok: true };
};
