import { EntitySet } from "@/components/drawing-board/lib/reduce-history";
import { Action, MemberProp } from "@/components/drawing-board/lib/types";

export type Drawing = {
  id: string;
  title: string;
  history: Action[];
  projectId: string;
  userId: string;
  createdAt: Date;
  updatedAt?: Date;
  hasChanges?: boolean;
  isTemplate?: boolean;
};

export type Project = {
  id: string;
  userId: string;
  title: string;
  address: string;
  createdAt: Date;
  updatedAt: Date;
  drawings?: Drawing[];
};

export enum SimulationStatus {
  Pending = "pending",
  Running = "running",
  Completed = "completed",
  Failed = "failed",
}

export type LimitState = "ULS" | "SLS" | "ALS";

export type Analysis = "UR" | "Ve" | "F1" | "F2" | "M" | "R0";

export type ForceResult = {
  // Nested by LimitState
  [limit in LimitState]: {
    F1: Record<string, number[]>;
    F2: Record<string, number[]>;
    M: Record<string, number[]>;
    Ve: Record<string, number[][]>;
    R0: Record<string, [number, number, number][]>;
    Ve_loc: Record<string, number[]>;
  };
};

export type MemberUR = {
  LoadCombnames_ALS: string[];
  LoadCombnames_SLS: string[];
  LoadCombnames_ULS: string[];
  UR_CriticalLoadComb: {
    UR_deformation: string;
    UR_Tryk631: string;
    UR_boejningsmoment625: string;
  };
  UR_loadcomb_mat_ALS: number[][];
  UR_loadcomb_mat_SLS: number[][];
  UR_loadcomb_mat_ULS: number[][];
  URnames_ALS: string[];
  URnames_SLS: string[];
  URnames_ULS: string[];
  loadcombMatDict_ULS: Record<string, number[]>;
  loadcombMatDict_SLS: Record<string, number[]>;
  loadcombMatDict_ALS: Record<string, number[]>;
  loadIds: string[];
};

export type SimulatedMember = {
  id: string;
  membername: string;
  membertype: string;
  memberprop: MemberProp;
  L: number;
  b: number;
  h: number;
  E: number;
  A: number;
  I: number;
  rho: number;
  consistOfelements: number[];
};

export type Simulation = {
  id: string;
  userId: string;
  projectId: string;
  drawingId: string;
  status: SimulationStatus;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  result?: {
    FEMModel: {
      members: Record<string, SimulatedMember>;
      X: [number, number][];
      T: [number, number][];
      R0_coor: [number, number][];
      R0_types: string[];
    };
    UR: MemberUR[];
    forces: ForceResult;
  };
  entities?: EntitySet;
  createdAt: Date;
  updatedAt: Date;
};

export type Report = {
  id: string;
  projectId?: number | string;
  drawingId?: number | string;
  simulationId?: number | string;
  title?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  downloadUrl?: string; // transient
};