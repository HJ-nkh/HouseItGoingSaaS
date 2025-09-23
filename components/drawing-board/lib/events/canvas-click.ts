import { InputEventHandler } from "./types";
import {
  Tool,
  Action,
  ActionType,
  Entity,
  Member,
  ConstraintType,
  Assembly,
  DrawingState,
} from "../types";
import { roundToTwoDecimals } from "@/lib/decimal-utils";
import { validateNewMember } from "../validate-zero-length-member";
import { getSmartDefaultConstraint } from "../get-smart-default-constraint";

/**
 * Node tool: Add a node
 * Member tool: Start or finish drawing a member
 */
const handleCanvasClick: InputEventHandler = (
  state,
  svgRef,
  _,
  e
): Partial<DrawingState> | null => {
  if (state.selectedIds.length || state.modifyingEntity) {
    return {
      selectedIds: [],
      modifyingEntity: null,
      pendingLoadTargets: {},
    };
  }

  if (state.tool === Tool.Node) {
    return handleAddNode(state, svgRef, _, e);
  }

  if (state.tool === Tool.Member) {
    if (!state.isDrawingMember) {
      return handleStartDrawing(state, svgRef, _, e);
    }

    return handleAddMember(state, svgRef, _, e);
  }

  return null;
};

const handleAddNode: InputEventHandler = (
  state
): Partial<DrawingState> | null => {
  const nodeId = `n-${state.nextNodeNumber}`;  const action: Action = {
    type: ActionType.Create,
    entity: Entity.Node,
    value: {
      id: nodeId,
      node: {
        id: nodeId,
        constraint1: {
          type: ConstraintType.X,
          value: roundToTwoDecimals(state.cursorPosition.x),
        },
        constraint2: {
          type: ConstraintType.Y,
          value: -roundToTwoDecimals(state.cursorPosition.y),
        },
      },
    },
  };

  const history = [...state.history, action];

  const update = {
    nextNodeNumber: state.nextNodeNumber + 1,
    history,
    selectedId: null,
  };

  return update;
};

const handleStartDrawing: InputEventHandler = (state) => {
  // Start drawing from a blank point
  return {
    startPosition: state.cursorPosition,
    startNodeId: `n-${state.nextNodeNumber}`,
    createNewNode: true,
    isDrawingMember: true,
    selectedId: null,
  };
};

const handleAddMember: InputEventHandler = (state, _svgRef, entitySet, _e) => {
  // Complete drawing on a blank point
  if (state.startNodeId == null) {
    throw new Error("No start node ID defined!");
  }

  const endNodeId = `n-${
    state.createNewNode ? state.nextNodeNumber + 1 : state.nextNodeNumber
  }`;
  const memberId = `m-${state.nextMemberNumber}`;
  let incrementNodeNumber = 1;

  const startNode: Partial<Member["node1"]> = {
    id: state.startNodeId,
    assembly: Assembly.Hinge,
  };
  // Find constraints for start node
  if (state.startMemberId) {
    // Drawing from member to node - this implies createNewNode    
    const smartConstraintType = getSmartDefaultConstraint(state.startMemberId, entitySet);
    const smartConstraintValue = smartConstraintType === ConstraintType.X 
      ? roundToTwoDecimals(state.startPosition.x)
      : roundToTwoDecimals(state.startPosition.y);

    startNode.constraint1 = {
      type: smartConstraintType,
      value: smartConstraintValue,
    };
    startNode.constraint2 = {
      type: ConstraintType.Member,
      value: 0,
      memberId: state.startMemberId,
    };

    incrementNodeNumber += 1;
  }

  if (!state.startMemberId && state.createNewNode) {    // Start node needs to be created first
    startNode.constraint1 = {
      type: ConstraintType.X,
      value: roundToTwoDecimals(state.startPosition.x),
    };
    startNode.constraint2 = {
      type: ConstraintType.Y,
      value: roundToTwoDecimals(state.startPosition.y),
    };

    incrementNodeNumber += 1;
  }
  const endNode: Member["node1"] = {
    id: endNodeId,
    assembly: Assembly.Hinge,
    constraint1: {
      type: ConstraintType.X,
      value: roundToTwoDecimals(state.cursorPosition.x),
    },
    constraint2: {
      type: ConstraintType.Y,
      value: roundToTwoDecimals(state.cursorPosition.y),
    },
  };  // Validate that the member would not have zero length
  const validation = validateNewMember(
    startNode as Member["node1"],
    endNode,
    entitySet
  );  if (!validation.isValid) {
    return null;
  }

  const action = {
    type: ActionType.Create,
    entity: Entity.Member,
    value: {
      id: memberId,
      member: {
        memberprop: {},
        id: memberId,
        node1: startNode as Member["node1"],
        node2: endNode,
      },
    },
  };
  const history = [...state.history, action];

  const update = {
    history,
    nextNodeNumber: state.nextNodeNumber + incrementNodeNumber,
    nextMemberNumber: state.nextMemberNumber + 1,
    createNewNode: false,
    isDrawingMember: false,
    startMemberId: null,
    selectedId: null,
  };

  return update;
};

export default handleCanvasClick;
