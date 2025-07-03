import { InputEventHandler } from "./types";
import {
  Tool,
  Member,
  Assembly,
  ActionType,
  Entity,
  ConstraintType,
  DrawingState,
  Action,
  LoadType,
  SupportType,
} from "../types";
import { roundToTwoDecimals } from "@/lib/decimal-utils";
import { validateNewMember } from "../validate-zero-length-member";
import { resolveSupportPosition } from "../reduce-history/resolve-position";
import { getSmartDefaultConstraint } from "../get-smart-default-constraint";

const handleMemberClick: InputEventHandler = (
  state,
  _,
  entitySet,
  e
): Partial<DrawingState> | null => {  if (!e.payload?.id) {
    return null;
  }
  // payload is guaranteed to have id
  const payload = e.payload;
  const id = payload.id as string;
  const ctrl = payload.ctrlKey ?? false;
  const cmd = payload.metaKey ?? false;

  if (state.tool === Tool.Select) {
    // build new selection: toggle with Ctrl/Cmd, replace otherwise
    let selectedIds: string[];
    if (ctrl || cmd) {
      const already = state.selectedIds.includes(id);
      selectedIds = already
        ? state.selectedIds.filter((i) => i !== id)
        : [...state.selectedIds, id];
    } else {
      selectedIds = [id];
    }

    // show ModifyMemberCard based on first selected member
    const modifyingEntity = selectedIds.length
      ? { type: Entity.Member, member: entitySet.members[selectedIds[0]] }
      : null;

    return { selectedIds, modifyingEntity };
  }
  if (state.tool === Tool.Node) {
    const id = `n-${state.nextNodeNumber}`;
    const smartConstraintType = getSmartDefaultConstraint(e.payload.id as string, entitySet);
    const smartConstraintValue = smartConstraintType === ConstraintType.X 
      ? roundToTwoDecimals(state.cursorPosition.x)
      : roundToTwoDecimals(state.cursorPosition.y);

    const action: Action = {
      type: ActionType.Create,
      entity: Entity.Node,
      value: {
        id,        node: {
          id,
          constraint1: {
            type: ConstraintType.Member,
            value: 0,
            memberId: e.payload.id,
          },
          constraint2: {
            type: smartConstraintType,
            value: smartConstraintValue,
          },
        },
      },
    };

    return {
      history: [...state.history, action],
      nextNodeNumber: state.nextNodeNumber + 1,
    };
  }

  if (state.tool === Tool.Member) {
    if (!state.isDrawingMember) {
      // Start drawing from point on existing member
      return {
        startNodeId: `n-${state.nextNodeNumber}`,
        startMemberId: e.payload.id as string,
        startPosition: state.cursorPosition,
        createNewNode: true,
        isDrawingMember: true,
      };
    }

    return handleAddMember(state, _, entitySet, e);
  }  // Add point load to member
  if (state.tool === Tool.PointLoad) {
    const smartConstraintType = getSmartDefaultConstraint(e.payload.id as string, entitySet);
    const smartConstraintValue = smartConstraintType === ConstraintType.X 
      ? roundToTwoDecimals(state.cursorPosition.x)
      : roundToTwoDecimals(state.cursorPosition.y);

    return {
      modifyingEntity: {
        type: Entity.PointLoad,        pointLoad: {
          id: "",
          type: LoadType.Dead,
          onMember: {
            id: e.payload.id,
            constraint: {
              type: smartConstraintType,
              value: smartConstraintValue,
            },
          },
          magnitude: undefined,
        },
      },
    };
  }
  // Add distributed load to member
  if (state.tool === Tool.DistributedLoad) {
    const member = entitySet.members[e.payload.id];
    const smartConstraintType = getSmartDefaultConstraint(e.payload.id as string, entitySet);

    const constraintStart = {
      type: smartConstraintType,
      value: smartConstraintType === ConstraintType.X 
        ? member.resolved.point1.x 
        : member.resolved.point1.y,
    };

    const constraintEnd = {
      type: smartConstraintType,
      value: smartConstraintType === ConstraintType.X 
        ? member.resolved.point2.x 
        : member.resolved.point2.y,
    };    return {
      modifyingEntity: {
        type: Entity.DistributedLoad,        distributedLoad: {
          id: "",
          type: LoadType.Dead,
          angle: {
            relativeTo: "x",
            value: 90,
          },
          onMember: { id: e.payload.id, constraintStart, constraintEnd },
          magnitude1: undefined,
          magnitude2: undefined,
        },
      },
      selectedIds: [],
    };
  }  if (state.tool === Tool.MomentLoad) {
    const smartConstraintType = getSmartDefaultConstraint(e.payload.id as string, entitySet);
    const smartConstraintValue = smartConstraintType === ConstraintType.X 
      ? roundToTwoDecimals(state.cursorPosition.x)
      : roundToTwoDecimals(state.cursorPosition.y);

    return {
      modifyingEntity: {
        type: Entity.MomentLoad,        momentLoad: {
          id: "",
          type: LoadType.Dead,
          onMember: {
            id: e.payload.id,
            constraint: {
              type: smartConstraintType,
              value: smartConstraintValue,
            },
          },
          magnitude: undefined,
        },
      },
    };
  }  // Add support to member
  if (state.tool === Tool.Support) {
    const id = `s-${state.nextSupportNumber}`;
    const smartConstraintType = getSmartDefaultConstraint(e.payload.id as string, entitySet);
    const smartConstraintValue = smartConstraintType === ConstraintType.X 
      ? roundToTwoDecimals(state.cursorPosition.x)
      : roundToTwoDecimals(state.cursorPosition.y);

    const newSupport = {
      id,
      type: SupportType.Pinned,
      angle: 0,
      onMember: {
        id: e.payload.id,
        constraint: {
          type: smartConstraintType,
          value: smartConstraintValue,
        },
      },
    };

    // Check for duplicate coordinates
    const newPosition = resolveSupportPosition(
      newSupport,
      entitySet.nodes,
      entitySet.members
    ).resolved;
      const existingDuplicate = Object.values(entitySet.supports).find((s) => {
      const pos = resolveSupportPosition(
        s,
        entitySet.nodes,
        entitySet.members
      ).resolved;
      return pos.x === newPosition.x && pos.y === newPosition.y;
    });    if (existingDuplicate) {
      window.alert("A support already exists at this location");
      return null;
    }

    const action: Action = {
      type: ActionType.Create,
      entity: Entity.Support,
      value: {
        id,
        support: newSupport,
      },
    };

    return {
      history: [...state.history, action],
      nextSupportNumber: state.nextSupportNumber + 1,
    };
  }

  return null;
};

// Complete drawing on point on existing member
const handleAddMember: InputEventHandler = (state, _, entitySet, e) => {
  if (!e.payload?.id) {
    return null;
  }

  if (!state.startNodeId) {
    throw new Error("No start node ID defined!");
  }

  const endNodeId = `n-${
    state.createNewNode || state.startMemberId
      ? state.nextNodeNumber + 1
      : state.nextNodeNumber
  }`;

  const newMemberId = `m-${state.nextMemberNumber}`;

  const startNode: Partial<Member["node1"]> = {
    id: state.startNodeId,
    assembly: Assembly.Hinge,
  };

  let incrementNodeNumber = 1;
  // Find constraints for start node
  if (state.startMemberId) {
    // Drawing from member to member - this implies createNewNode    
    const smartConstraintType = getSmartDefaultConstraint(state.startMemberId, entitySet);
    const smartConstraintValue = smartConstraintType === ConstraintType.X 
      ? roundToTwoDecimals(state.startPosition.x)
      : roundToTwoDecimals(state.startPosition.y);

    const constraint1 = {
      type: smartConstraintType,
      value: smartConstraintValue,
    };

    startNode.constraint1 = constraint1;
    startNode.constraint2 = {
      type: ConstraintType.Member,
      value: 0,
      memberId: state.startMemberId,
    };

    incrementNodeNumber += 1;
  }
  if (!state.startMemberId && state.createNewNode) {
    // Create new node - constrain by x and y
    startNode.constraint1 = {
      type: ConstraintType.X,
      value: roundToTwoDecimals(state.startPosition.x),
    };
    startNode.constraint2 = {
      type: ConstraintType.Y,
      value: roundToTwoDecimals(state.startPosition.y),
    };

    incrementNodeNumber += 1;
  }  // Constraint end node by angle and member
  const smartEndConstraintType = getSmartDefaultConstraint(e.payload.id as string, entitySet);
  const smartEndConstraintValue = smartEndConstraintType === ConstraintType.X 
    ? state.cursorPosition.x
    : state.cursorPosition.y;

  const endNode: Member["node1"] = {
    id: endNodeId,
    assembly: Assembly.Hinge,
    constraint1: {
      type: ConstraintType.Member,
      value: 0,
      memberId: e.payload.id as string,
    },
    constraint2: {
      type: smartEndConstraintType,
      value: smartEndConstraintValue,
    },
  };
  // Validate that the member would not have zero length
  const validation = validateNewMember(
    startNode as Member["node1"],
    endNode as Member["node2"],
    entitySet
  );
  if (!validation.isValid) {
    return null; // Don't create the member
  }

  const action = {
    type: ActionType.Create,
    entity: Entity.Member,
    value: {
      id: newMemberId,
      member: {
        id: newMemberId,
        memberprop: {},
        node1: startNode as Member["node1"],
        node2: endNode as Member["node1"],
      },
    },
  };
  const history = [...state.history, action];

  const update = {
    history,
    nextMemberNumber: state.nextMemberNumber + 1,
    nextNodeNumber: state.nextNodeNumber + incrementNodeNumber,
    createNewNode: false,
    isDrawingMember: false,
    startMemberId: null,
  };

  return update;
};

export default handleMemberClick;
