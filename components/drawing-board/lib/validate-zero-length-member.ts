import { EntitySet } from "./reduce-history";
import { distanceBetween } from "./geometry";
import { Member, Node, ResolvedNode } from "./types";
import { resolveNodePosition } from "./reduce-history/resolve-position";

/**
 * Minimum allowed member length in meters to prevent zero-length members
 */
const MIN_MEMBER_LENGTH = 0.001; // 1mm minimum

/**
 * Validates that a member would not have zero length
 */
export const validateMemberLength = (
  node1Position: { x: number; y: number },
  node2Position: { x: number; y: number }
): { isValid: boolean; error?: string } => {
  const length = distanceBetween(node1Position, node2Position);
  
  if (length < MIN_MEMBER_LENGTH) {
    return {
      isValid: false,
      error: "Konstruktionsdele kan ikke have længde nul. Start- og slutknude skal have forskellige koordinater."
    };
  }
  
  return { isValid: true };
};

/**
 * Validates that creating a member between two nodes would not result in zero length
 */
export const validateNewMember = (
  node1: Member["node1"],
  node2: Member["node2"],
  entitySet: EntitySet
): { isValid: boolean; error?: string } => {
  // Early check: if both nodes have the same ID, it's definitely zero length
  if (node1.id === node2.id) {
    return {
      isValid: false,
      error: "Kan ikke oprette konstruktionsdel fra knude til sig selv"
    };
  }  try {
    // Resolve positions for both nodes
    let resolvedNode1: ResolvedNode;
    let resolvedNode2: ResolvedNode;
    
    if (entitySet.nodes[node1.id]) {
      // Node already exists in the entity set
      resolvedNode1 = entitySet.nodes[node1.id];
    } else {
      // Node doesn't exist yet, resolve its position
      resolvedNode1 = resolveNodePosition(node1 as Node, entitySet.nodes, entitySet.members);
    }
    
    if (entitySet.nodes[node2.id]) {
      // Node already exists in the entity set
      resolvedNode2 = entitySet.nodes[node2.id];
    } else {
      // Node doesn't exist yet, resolve its position
      resolvedNode2 = resolveNodePosition(node2 as Node, entitySet.nodes, entitySet.members);
    }

    const position1 = resolvedNode1.resolved;
    const position2 = resolvedNode2.resolved;
    
    return validateMemberLength(position1, position2);} catch (error) {
    console.error("Error in validateNewMember:", error);
    // If we can't resolve positions, allow the member to be created
    // (other validation will catch constraint issues)
    return { isValid: true };
  }
};

/**
 * Validates that modifying a node's position would not cause any existing members to become zero-length
 */
export const validateNodeModification = (
  nodeId: string,
  newPosition: { x: number; y: number },
  entitySet: EntitySet
): { isValid: boolean; error?: string; affectedMembers?: string[] } => {
  const affectedMembers: string[] = [];
  
  // Find all members that use this node
  for (const [memberId, member] of Object.entries(entitySet.members)) {
    if (member.node1.id === nodeId || member.node2.id === nodeId) {
      // Get the position of the other node
      const otherNodeId = member.node1.id === nodeId ? member.node2.id : member.node1.id;
      const otherNode = entitySet.nodes[otherNodeId];
      
      if (otherNode?.resolved) {
        const validation = validateMemberLength(newPosition, otherNode.resolved);
        if (!validation.isValid) {
          affectedMembers.push(memberId);
        }
      }
    }
  }
  
  if (affectedMembers.length > 0) {
    return {
      isValid: false,
      error: `Denne ændring ville forårsage, at konstruktionsdel(e) får længde nul.`,
      affectedMembers
    };
  }
  
  return { isValid: true };
};
