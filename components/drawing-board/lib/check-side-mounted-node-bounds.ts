import { EntitySet } from "./reduce-history";
import { Node, Action, ActionType, Entity, ResolvedMember, PointLoad, MomentLoad } from "./types";
import { isSideMountedNode } from "./is-side-mounted-node";
import { getDependencies } from "./dependencies";
import { distanceBetween } from "./geometry";

/**
 * When a member changes length/position, this function checks if side-mounted nodes 
 * and member-mounted loads are still within the bounds of the member and flags them as needing attention if not.
 */
export const checkSideMountedNodeBounds = (
  memberId: string,
  _prevMemberResolved: ResolvedMember,
  newMemberResolved: ResolvedMember,
  entitySet: EntitySet
): Action[] => {
  const actions: Action[] = [];
  
  // Check side-mounted nodes
  const memberDependantNodes = Object.values(entitySet.nodes).filter(node => {
    const isSideMounted = isSideMountedNode(node.id, entitySet);
    const dependencies = getDependencies(node.id, entitySet);
    const dependsOnThisMember = dependencies.includes(memberId);
    
    return isSideMounted && dependsOnThisMember;
  });

  for (const node of memberDependantNodes) {
    // Check if the node is outside the bounds of the new member
    const nodePosition = node.resolved;
    const memberStart = newMemberResolved.resolved.point1;
    const memberEnd = newMemberResolved.resolved.point2;
    
    let isOutsideBounds = false;
    
    // Check bounds based on member orientation
    if (Math.abs(memberStart.x - memberEnd.x) > Math.abs(memberStart.y - memberEnd.y)) {
      // Horizontal-ish member - check X bounds
      const minX = Math.min(memberStart.x, memberEnd.x);
      const maxX = Math.max(memberStart.x, memberEnd.x);
      isOutsideBounds = nodePosition.x < minX || nodePosition.x > maxX;
    } else {  
      // Vertical-ish member - check Y bounds
      const minY = Math.min(memberStart.y, memberEnd.y);
      const maxY = Math.max(memberStart.y, memberEnd.y);
      isOutsideBounds = nodePosition.y < minY || nodePosition.y > maxY;
    }
    
    // If the node is outside bounds, flag it as needing attention
    if (isOutsideBounds) {
      const updatedNode: Node = {
        ...node,
        needsAttention: true,
        attentionReason: "Knude er udenfor tilknyttede konstruktionsdel"
      };
      
      actions.push({
        type: ActionType.Update,
        entity: Entity.Node,
        value: {
          id: node.id,
          node: updatedNode,
          prevNode: node,
        },
      });
    }
  }

  // Check point loads on this member
  const memberPointLoads = Object.values(entitySet.pointLoads).filter(load => 
    load.onMember?.id === memberId
  );

  for (const pointLoad of memberPointLoads) {
    const loadPosition = pointLoad.resolved;
    const memberStart = newMemberResolved.resolved.point1;
    const memberEnd = newMemberResolved.resolved.point2;
    
    let isOutsideBounds = false;
    
    // Check bounds based on member orientation
    if (Math.abs(memberStart.x - memberEnd.x) > Math.abs(memberStart.y - memberEnd.y)) {
      // Horizontal-ish member - check X bounds
      const minX = Math.min(memberStart.x, memberEnd.x);
      const maxX = Math.max(memberStart.x, memberEnd.x);
      isOutsideBounds = loadPosition.x < minX || loadPosition.x > maxX;
    } else {  
      // Vertical-ish member - check Y bounds
      const minY = Math.min(memberStart.y, memberEnd.y);
      const maxY = Math.max(memberStart.y, memberEnd.y);
      isOutsideBounds = loadPosition.y < minY || loadPosition.y > maxY;
    }
    
    // If the load is outside bounds, flag it as needing attention
    if (isOutsideBounds) {
      const updatedPointLoad: PointLoad = {
        ...pointLoad,
        needsAttention: true,
        attentionReason: "Last er udenfor tilknyttede konstruktionsdel"
      };
      
      actions.push({
        type: ActionType.Update,
        entity: Entity.PointLoad,
        value: {
          id: pointLoad.id,
          pointLoad: updatedPointLoad,
          prevPointLoad: pointLoad,
        },
      });
    }
  }

  // Check moment loads on this member
  const memberMomentLoads = Object.values(entitySet.momentLoads).filter(load => 
    load.onMember?.id === memberId
  );

  for (const momentLoad of memberMomentLoads) {
    const loadPosition = momentLoad.resolved;
    const memberStart = newMemberResolved.resolved.point1;
    const memberEnd = newMemberResolved.resolved.point2;
    
    let isOutsideBounds = false;
    
    // Check bounds based on member orientation
    if (Math.abs(memberStart.x - memberEnd.x) > Math.abs(memberStart.y - memberEnd.y)) {
      // Horizontal-ish member - check X bounds
      const minX = Math.min(memberStart.x, memberEnd.x);
      const maxX = Math.max(memberStart.x, memberEnd.x);
      isOutsideBounds = loadPosition.x < minX || loadPosition.x > maxX;
    } else {  
      // Vertical-ish member - check Y bounds
      const minY = Math.min(memberStart.y, memberEnd.y);
      const maxY = Math.max(memberStart.y, memberEnd.y);
      isOutsideBounds = loadPosition.y < minY || loadPosition.y > maxY;
    }
    
    // If the load is outside bounds, flag it as needing attention
    if (isOutsideBounds) {
      const updatedMomentLoad: MomentLoad = {
        ...momentLoad,
        needsAttention: true,
        attentionReason: "Last er udenfor tilknyttede konstruktionsdel"
      };
      
      actions.push({
        type: ActionType.Update,
        entity: Entity.MomentLoad,
        value: {
          id: momentLoad.id,
          momentLoad: updatedMomentLoad,
          prevMomentLoad: momentLoad,
        },
      });
    }
  }

  return actions;
};

/**
 * Calculate the length of a member based on its resolved endpoints
 */
export const calculateMemberLength = (member: EntitySet["members"][string]): number => {
  if (!member?.resolved) return 0;
  return distanceBetween(member.resolved.point1, member.resolved.point2);
};
