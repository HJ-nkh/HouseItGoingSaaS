import { flipYAxisOnSimulation } from "@/components/drawing-board/lib/flip-y-axis";
import {
  FEElement,
  FENode,
  MemberSimulation,
} from "@/components/drawing-board/lib/types";
import { LimitState, Simulation } from "@/lib/types";

// Assumes that elements are ordered
const elementsToNodes = (elements: FEElement[]): FENode[] => {
  const nodes = elements.map(({ node1 }) => node1);
  // Add the last node
  nodes.push(elements[elements.length - 1].node2);

  return nodes;
};

export const toMemberSimulations = (
  simulation: Simulation | undefined
): {
  memberSimulations: MemberSimulation[];
  R0: {
    type: string[];
    coor: [number, number][];
    forces: Record<string, Record<string, [number, number, number][]>>;
  };
  loadCombinationsUR: Record<string, string[]>;
  loadCombinationsFactorMat: Record<string, Record<string, number[]>>;
  loadCombinationsFactorMatIds: Record<string, string[]>;
} | null => {
  const result = flipYAxisOnSimulation(simulation?.result);

  if (!result) {
    return null;
  }

  
  const loadCombinationsUR: Record<string, string[]> = {
    ULS: result?.UR?.[0]?.LoadCombnames_ULS || [],
    SLS: result?.UR?.[0]?.LoadCombnames_SLS || [],
    ALS: result?.UR?.[0]?.LoadCombnames_ALS || [],
  };

  const loadCombinationsFactorMat: Record<string, Record<string, number[]>> = {
    ULS: result?.UR?.[0]?.loadcombMatDict_ULS || [],
    SLS: result?.UR?.[0]?.loadcombMatDict_SLS || [],
    ALS: result?.UR?.[0]?.loadcombMatDict_ALS || [],
  };

  const loadCombinationsFactorMatIds: Record<LimitState, string[]> = {
    ULS: result?.UR?.[0]?.loadIds || [],
    ALS: result?.UR?.[0]?.loadIds || [],
    SLS: result?.UR?.[0]?.loadIds || [],
  };

  const R0: { type: string[]; coor: [number, number][]; forces: Record<string, Record<string, [number, number, number][]>> } = {
    type: result?.FEMModel.R0_types,
    coor: result?.FEMModel.R0_coor.map((c) => [c[0], -c[1]] as [number, number]),
    forces: {},
  };
  for (const ls of ["ULS", "SLS", "ALS"] as const) {
    R0.forces[ls] = {};
    for (const a of ["R0"] as const) {
      for (const lc of loadCombinationsUR[ls]) {
        R0.forces[ls][lc] = result.forces[ls][a][lc];
      }
    }
  }

  const memberSimulations: MemberSimulation[] = Object.values(
    result?.FEMModel.members || {}
  ).map((m, idx) => {
    const elementIndices = m.consistOfelements
      .map((i) => result?.FEMModel.T[i])
      .filter((e): e is [number, number] => Boolean(e));

    const elements = elementIndices
      .map(([i1, i2]) => {
        const xy1 = result?.FEMModel.X[i1];
        const xy2 = result?.FEMModel.X[i2];

        if (!xy1 || !xy2 || !result?.forces) {
          return null;
        }

        const node1: FENode = {
          x: xy1[0],
          y: xy1[1],
          id: i1,
          ULS: { F1: {}, F2: {}, M: {}},
          SLS: { F1: {}, F2: {}, M: {}},
          ALS: { F1: {}, F2: {}, M: {}},
          V_x: {},
          V_y: {},
          V_loc: {},
        };
        const node2: FENode = {
          x: xy2[0],
          y: xy2[1],
          id: i2,
          ULS: { F1: {}, F2: {}, M: {}},
          SLS: { F1: {}, F2: {}, M: {}},
          ALS: { F1: {}, F2: {}, M: {}},
          V_x: {},
          V_y: {},
          V_loc: {},
        };

        for (const ls of ["ULS", "SLS", "ALS"] as const) {
          for (const a of ["F1", "F2"] as const) {
            for (const lc of loadCombinationsUR[ls]) {
              const forcesArray  = result.forces[ls][a][lc];
              node1[ls][a][lc] = forcesArray [i1];
              node2[ls][a][lc] = forcesArray [i2];
            }
          }
        }

        for (const ls of ["ULS", "SLS", "ALS"] as const) {
          for (const a of ["M"] as const) {
            for (const lc of loadCombinationsUR[ls]) {
              const forcesArray  = result.forces[ls][a][lc];
              node1[ls][a][lc] = -forcesArray [i1];
              node2[ls][a][lc] = -forcesArray [i2];
            }
          }
        }

        // Ve
        for (const ls of ["SLS"] as const) {
          for (const lc of loadCombinationsUR[ls]) {
            const DeformationsArray = result?.forces[ls]["Ve"][lc]
            const vxy1 = DeformationsArray[i1] || {};
            const vxy2 = DeformationsArray[i2] || {};

            node1["V_x"][lc] = -vxy1[0] //Flip x back
            node1["V_y"][lc] = vxy1[1]
            node2["V_x"][lc] = -vxy2[0] //Flip x back
            node2["V_y"][lc] = vxy2[1];

            const DeformationsArrayLoc = result?.forces[ls]["Ve_loc"][lc]
            node1["V_loc"][lc] = DeformationsArrayLoc[i1];
            node2["V_loc"][lc] = DeformationsArrayLoc[i2];

          }
        }

        return { node1, node2, E: m.E, I: m.I, A: m.A, L: m.L };
      })
      .filter((e): e is FEElement => Boolean(e));

    const nodes = elementsToNodes(elements);

    return {
      id: m.id,
      nodes,
      elements,
      UR: result?.UR?.[idx],
    };
  });

  return { memberSimulations, R0, loadCombinationsUR, loadCombinationsFactorMat, loadCombinationsFactorMatIds };
};
