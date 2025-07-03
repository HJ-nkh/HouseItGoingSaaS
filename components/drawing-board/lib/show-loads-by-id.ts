import { LimitState } from "@/types";

export const getShowLoadByIds = (
  selectedLC: string,
  selectedLimitState: LimitState,
  loadCombinationsFactorMat: Record<LimitState, Record<string, number[]>>,
  loadCombinationsFactorMatIds: Record<LimitState, string[]>
): string[] => {
  const factors = loadCombinationsFactorMat[selectedLimitState]?.[selectedLC] || [];
  return loadCombinationsFactorMatIds[selectedLimitState].filter((_, index) => factors[index] !== 0);
};
