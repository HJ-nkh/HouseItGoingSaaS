import { MemberUR } from "@/lib/types";

export enum Tool {
  Select = "Select",
  Node = "Node",
  Member = "Member",
  PointLoad = "PointLoad",
  DistributedLoad = "DistributedLoad",
  MomentLoad = "MomentLoad",
  Support = "Support",
  WindCalculator = "WindCalculator",
}

export enum Entity {
  Node = "Node",
  Member = "Member",
  PointLoad = "PointLoad",
  DistributedLoad = "DistributedLoad",
  MomentLoad = "MomentLoad",
  Support = "Support",
  // Used for Undo actions
  Null = "Null",
}

export enum ActionType {
  Create = "Create",
  Update = "Update",
  Delete = "Delete",
  Undo = "Undo",
}

export type Action = {
  type: ActionType;
  entity: Entity;
  value?: {
    id: string;
    node?: Node;
    prevNode?: Node;
    member?: Member;
    prevMember?: Member;
    pointLoad?: PointLoad;
    prevPointLoad?: PointLoad;
    distributedLoad?: DistributedLoad;
    prevDistributedLoad?: DistributedLoad;
    momentLoad?: MomentLoad;
    prevMomentLoad?: MomentLoad;
    support?: Support;
    prevSupport?: Support;
  };
};

export type LoadGroup = {
  id: string;
  name: string;
  type: LoadType;
  loadIds: string[];
  visible: boolean;
};

export type DrawingState = {
  history: Action[];
  tool: Tool;
  cursorPosition: { x: number; y: number };
  startPosition: { x: number; y: number };
  viewBox: [number, number, number, number];
  gridSize: number;
  showGrid: boolean;
  hoveringId: string | null;
  nextNodeNumber: number;
  nextMemberNumber: number;
  nextPointLoadNumber: number;
  nextDistributedLoadNumber: number;
  nextMomentLoadNumber: number;
  nextSupportNumber: number;
  isPanning: boolean;
  isDrawingMember: boolean;
  isSnappingOrthogonally: boolean;
  selectedIds: string[];
  modifyingEntity: {
    type: Entity;
    node?: Node;
    member?: Member;
    pointLoad?: PointLoad;
    distributedLoad?: DistributedLoad;
    momentLoad?: MomentLoad;
    support?: Support;
  } | null;
  createNewNode: boolean;
  startNodeId: string | null;
  startMemberId: string | null;
  loadGroups: LoadGroup[];
  nextGroupNumber: number;
  showEntities: {
    distributedLoadsButton: boolean;
    pointLoadsButton: boolean;
    momentLoadsButton: boolean;
    loadtypeButtons: {
      [LoadType.Standard]: boolean;
      [LoadType.Snow]: boolean;
      [LoadType.Wind]: boolean;
      [LoadType.Dead]: boolean;
      [LoadType.Live]: boolean;
    };
    pointLoads: {
      [LoadType.Standard]: boolean;
      [LoadType.Snow]: boolean;
      [LoadType.Wind]: boolean;
      [LoadType.Dead]: boolean;
      [LoadType.Live]: boolean;
    };
    distributedLoads: {
      [LoadType.Standard]: boolean;
      [LoadType.Snow]: boolean;
      [LoadType.Wind]: boolean;
      [LoadType.Dead]: boolean;
      [LoadType.Live]: boolean;
    };
    momentLoads: {
      [LoadType.Standard]: boolean;
      [LoadType.Snow]: boolean;
      [LoadType.Wind]: boolean;
      [LoadType.Dead]: boolean;
      [LoadType.Live]: boolean;
    };
    groups: { [groupId: string]: boolean };
    activeGroupId: string | null;
  };
  showSimulation: boolean;
  hasChanges: boolean;
  // Wind calculator settings - shared across all wind loads
  windCalculatorSettings: WindCalculatorSettings;
  // While adding loads with Ctrl multi-select, collect per-target placement
  // Data keyed by selected node/member id with target-specific constraint data
  pendingLoadTargets: PendingLoadTargets;
};

export type WindCalculatorSettings = {
  houseHeight?: number;
  houseWidth?: number;
  houseDepth?: number;
  houseRotation: number;
  roofType: 'flat' | 'monopitch' | 'duopitch' | 'hipped';
  flatRoofEdgeType: 'sharp' | 'parapet' | 'rounded' | 'beveled';
  parapetHeight?: number;
  edgeRadius?: number;
  bevelAngle?: number;
  roofPitch?: number;
  hippedMainPitch?: number;
  hippedHipPitch?: number;
  distanceToSea: 'more_than_25km' | 'less_than_25km';
  terrainCategory: '0' | '1' | '2' | '3' | '4';
  formFactor: 'main_structure' | 'small_elements';
  windDirection: number;
  // Wind calculator construction elements and load area
  selectedLineId?: number | null;
  lastopland?: number;
  terrainHeight?: number;
  constructionDots?: Array<{
    x: number;
    y: number;
    side: 'top' | 'right' | 'bottom' | 'left';
    progress: number;
    lineId: number;
  }>;
  constructionLines?: Array<{
    x: number;
    y: number;
    side: 'top' | 'right' | 'bottom' | 'left' | 'inside';
    progress: number;
    lineId: number;
    length: number;
    rotation: number;
  }>;
};

export enum ConstraintType {
  X = "X",
  Y = "Y",
  Angle = "Angle",
  Member = "Member",
  Distance = "Distance",
}

export type Constraint = {
  type: ConstraintType;
  value: number;
  // The context node is used for "angle" constraints
  contextNodeId?: string;
  // Used for "member" constraints
  memberId?: string;
};

export type Line = {
  point1: Point;
  point2: Point;
};

export type Point = {
  x: number;
  y: number;
};

export type Node = {
  id: string;
  constraint1: Constraint;
  constraint2: Constraint;
  dependants?: string[];
  needsAttention?: boolean;
  attentionReason?: string;
};

export enum Assembly {
  Hinge = "Hinge",
  Stiff = "Stiff",
}

export enum LoadType {
  Standard = "Standard", // Karakteristisk last
  Wind = "Wind", // Vindlast, 90 degrees relative to member
  Snow = "Snow", // Snelast, globally vertical
  Live = "Live", // Nyttelast, globally vertical
  Dead = "Dead", // Egenlast, globally vertical
}

export enum MaterialType {
  Steel = "Steel",
  Wood = "Wood",
  Masonry = "Masonry",
}

export enum SteelProfile {
  HE100A = "HE100A",
  HE100B = "HE100B",
  HE120B = "HE120B",
  HE140B = "HE140B",
  HE160B = "HE160B",
  HE180B = "HE180B",
  HE200B = "HE200B",
  HE220B = "HE220B",
  HE240B = "HE240B",
  HE260B = "HE260B",
  HE280B = "HE280B",
  IPE80 = "IPE80",
  IPE100 = "IPE100",
  IPE120 = "IPE120",
  IPE140 = "IPE140",
  IPE160 = "IPE160",
  IPE180 = "IPE180",
  IPE200 = "IPE200",
  IPE220 = "IPE220",
  IPE240 = "IPE240",
  IPE270 = "IPE270",
  IPE300 = "IPE300",
  RHS50x25x3 = "RHS 50x25x3",
  RHS50x50x3 = "RHS 50x50x3",
  RHS50x50x5 = "RHS 50x50x5",
  RHS60x60x3 = "RHS 60x60x3",
  RHS60x60x5 = "RHS 60x60x5",
  RHS70x70x3 = "RHS 70x70x3",
  RHS80x80x3 = "RHS 80x80x3",
  RHS90x90x4 = "RHS 90x90x4",
  RHS120x120x5 = "RHS 120x120x5",
  UNP100 = "UNP100",
  INP140 = "INP140",
  INP180 = "INP180",
}

export type WoodSize = {
  width?: number | null;
  height?: number | null;
};

export type MemberProp = {
  name?: string;
  type?: MaterialType;
  steelProfile?: SteelProfile;
  woodType?: string;
  woodSizeString?: string;
  woodSize?: WoodSize;
};

export type Member = {
  id: string;
  memberprop: MemberProp;
  node1: Node & { assembly: Assembly };
  node2: Node & { assembly: Assembly };
  dependants?: string[];
};

export type PointLoad = {
  id: string;
  type: LoadType;
  onNode?: { id: string };
  onMember?: {
    id: string;
    constraint: Constraint;
  };
  angle?: {
    value: number;
    relativeTo: "x";
  };
  magnitude?: number;
  needsAttention?: boolean;
  attentionReason?: string;
};

export type DistributedLoad = {
  id: string;
  type: LoadType;
  angle?: {
    value: number;
    relativeTo: "member" | "x";
  };
  // For Wind loads: flip application side by 180°
  windFlip?: boolean;
  magnitude1?: number;
  magnitude2?: number;
  onMember: {
    id: string;
    constraintStart: Constraint;
    constraintEnd: Constraint;
  };
};

export type MomentLoad = {
  id: string;
  type: LoadType;
  onNode?: { id: string };
  onMember?: {
    id: string;
    constraint: Constraint;
  };
  magnitude?: number;
  needsAttention?: boolean;
  attentionReason?: string;
};

export enum SupportType {
  Fixed = "Fixed",
  Pinned = "Pinned",
  Roller = "Roller",
}

export type Support = {
  id: string;
  type: SupportType;
  onNode?: { id: string };
  onMember?: {
    id: string;
    constraint: Constraint;
  };
  angle: number;
};

export type ResolvedNode = Node & { resolved: Point; assembly: Assembly };
export type ResolvedMember = Member & { resolved: Line };
export type ResolvedPointLoad = PointLoad & { resolved: Point };
export type ResolvedDistributedLoad = DistributedLoad & { resolved: Line };
export type ResolvedMomentLoad = MomentLoad & { resolved: Point };
export type ResolvedSupport = Support & { resolved: Point };

// Pending targets for batch-applying loads while in add mode
export type PendingLoadTargets = {
  [targetId: string]: {
    onNode?: { id: string };
    onMember?: {
      id: string;
      // Point/Moment use 'constraint', Distributed uses 'constraintStart'/'constraintEnd'
      constraint?: Constraint;
      constraintStart?: Constraint;
      constraintEnd?: Constraint;
    };
  };
};

/* SIMULATION TYPES */
// Contains the coordinates and force results for a FEM node
export type FENode = {
  id: number;
  x: number;
  y: number;
  ULS: { F1: Record<string, number>; F2: Record<string, number>; M: Record<string, number>;};
  SLS: { F1: Record<string, number>; F2: Record<string, number>; M: Record<string, number>;};
  ALS: { F1: Record<string, number>; F2: Record<string, number>; M: Record<string, number>;};
  V_x: Record<string, number>
  V_y: Record<string, number>
  V_loc: Record<string, number>
};

export type FEElement = {
  node1: FENode;
  node2: FENode;
  E: number;
  I: number;
  A: number;
  L: number;
};

export type MemberSimulation = {
  id: string;
  nodes: FENode[];
  elements: FEElement[];
  UR?: MemberUR;
};

// TODO: How are reaction forces interpreted?
export type ReactionForce = null;
