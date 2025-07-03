import { InputEventHandler } from "./types";
import {
  Tool,
  Member,
  Assembly,
  Action,
  ActionType,
  Entity,
  ConstraintType,
  DrawingState,
  SupportType,
  LoadType
} from "../types";
import { roundToTwoDecimals } from "@/lib/decimal-utils";
import { validateNewMember } from "../validate-zero-length-member";
import { resolveSupportPosition } from "../reduce-history/resolve-position";
import { getSmartDefaultConstraint } from "../get-smart-default-constraint";

/**
 * Select tool: Select node
 * Node tool: Select node (TODO: Update node by moving?)
 * Member tool: Start drawing a member from node or add member at node
 * Point load tool: Add point load to node
 */
const handleNodeClick: InputEventHandler = (
  state,
  _,
  entitySet,
  e
): Partial<DrawingState> | null => {
  if (!e.payload?.id) {
    return null;
  }

  if (state.tool === Tool.Select || state.tool === Tool.Node) {
    let selectedIds: string[] = [];

    if (e.payload.ctrlKey || e.payload.metaKey) {
      selectedIds = [...state.selectedIds];
    }

    selectedIds.push(e.payload.id as string);

    let modifyingEntity: DrawingState["modifyingEntity"] = null;

    if (selectedIds.length === 1) {
      modifyingEntity = {
        type: Entity.Node,
        node: entitySet.nodes[e.payload.id],
      };
    }

    return {
      selectedIds,
      modifyingEntity,
    };
  }
  if (state.tool === Tool.Support) {
    const id = `s-${state.nextSupportNumber}`;
    const newSupport = {
      id,
      type: SupportType.Pinned,
      onNode: { id: e.payload?.id as string },
      angle: 0,
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

    const action = {
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

  if (state.tool === Tool.Member) {
    if (!state.isDrawingMember) {
      if (!e.payload?.id) {
        return null;
      }

      // Start drawing from an existing node
      return {
        startPosition: state.cursorPosition,
        startNodeId: e.payload.id as string,
        isDrawingMember: true,
        selectedIds: [],
      };
    }

    return handleAddMember(state, _, entitySet, e);
  }
  // Add point load to node
  if (state.tool === Tool.PointLoad) {
    return {
      modifyingEntity: {
        type: Entity.PointLoad,
        pointLoad: {
          id: "",
          type: LoadType.Dead,
          onNode: { id: e.payload?.id as string },
          magnitude: undefined,
        },
      },
      selectedIds: [],
    };
  }

  // Add moment load to node
  if (state.tool === Tool.MomentLoad) {
    return {
      modifyingEntity: {
        type: Entity.MomentLoad,
        momentLoad: {
          id: "",
          type: LoadType.Dead,
          onNode: { id: e.payload?.id as string },
          magnitude: undefined,
        },
      },
      selectedIds: [],
    };
  }

  return null;
};

// Complete drawing on an existing node
const handleAddMember: InputEventHandler = (
  state,
  _,
  entitySet,
  e
): Partial<DrawingState> | null => {
  if (!state.startNodeId) {
    throw new Error("No start node ID defined!");
  }

  const startNode: Partial<Member["node1"]> = {
    id: state.startNodeId,
    assembly: Assembly.Hinge,
  };
  let incrementNodeNumber = 0;
  // Find constraints for start node
  if (state.startMemberId) {
    // Drawing from member to node - this means create a new node on the member    
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

  if (!state.startMemberId && state.createNewNode) {
    // Start node needs to be created first
    startNode.constraint1 = {
      type: ConstraintType.X,
      value: state.startPosition.x,
    };
    startNode.constraint2 = {
      type: ConstraintType.Y,
      value: state.startPosition.y,
    };

    incrementNodeNumber += 1;
  }
  const memberId = `m-${state.nextMemberNumber}`;
  const endNode = {
    ...entitySet.nodes[e.payload?.id as string],
    assembly: Assembly.Hinge,
  };  // Check if trying to create a member from a node to itself
  if (startNode.id === endNode.id) {
    return null;
  }

  // Validate that the member would not have zero length
  const validation = validateNewMember(
    startNode as Member["node1"],
    endNode,
    entitySet
  );  if (!validation.isValid) {
    return null;
  }

  const action: Action = {
    type: ActionType.Create,
    entity: Entity.Member,
    value: {
      id: memberId,
      member: {
        id: memberId,
        memberprop: {},
        node1: startNode as Member["node1"],
        node2: endNode,
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

export default handleNodeClick;
