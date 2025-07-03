/**
 * Utility functions for positioning cards within the drawing board bounds
 */

// Card dimensions (estimated based on card content)
export const CARD_DIMENSIONS = {
  'modify-node': { width: 350, height: 400 },
  'modify-member': { width: 450, height: 600 },
  'modify-point-load': { width: 300, height: 350 },
  'modify-distributed-load': { width: 400, height: 450 },
  'modify-moment-load': { width: 300, height: 350 },
  'modify-support': { width: 300, height: 300 },
  'add-point-load': { width: 300, height: 350 },
  'add-distributed-load': { width: 400, height: 450 },
  'add-moment-load': { width: 300, height: 350 },
} as const;

export type CardType = keyof typeof CARD_DIMENSIONS;

/**
 * Calculate the position for a card ensuring it stays within the viewport bounds
 * @param preferredX - The preferred X position (usually cursor/entity position)
 * @param preferredY - The preferred Y position (usually cursor/entity position)
 * @param cardType - The type of card to position
 * @param padding - Padding from viewport edges (default: 20px)
 * @returns Adjusted position that keeps the card fully visible
 */
export function calculateCardPosition(
  preferredX: number,
  preferredY: number,
  cardType: CardType,
  padding = 20
): { top: number; left: number } {
  const { width, height } = CARD_DIMENSIONS[cardType];
  
  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  // Calculate boundaries (accounting for padding)
  const maxLeft = viewportWidth - width - padding;
  const maxTop = viewportHeight - height - padding;
  
  // Calculate adjusted position
  let adjustedLeft = Math.max(padding, Math.min(preferredX, maxLeft));
  let adjustedTop = Math.max(padding, Math.min(preferredY, maxTop));
  
  // If card would extend beyond right edge, position to the left of the preferred position
  if (preferredX + width + padding > viewportWidth) {
    adjustedLeft = Math.max(padding, preferredX - width - 20); // 20px offset from cursor
  }
  
  // If card would extend beyond bottom edge, position above the preferred position
  if (preferredY + height + padding > viewportHeight) {
    adjustedTop = Math.max(padding, preferredY - height - 20); // 20px offset from cursor
  }
  
  return {
    top: adjustedTop,
    left: adjustedLeft
  };
}

/**
 * Helper function to get card type from entity type and state
 */
export function getCardTypeFromEntity(
  entityType: string,
  isAdding = false
): CardType {
  switch (entityType) {
    case 'Node':
      return 'modify-node';
    case 'Member':
      return 'modify-member';
    case 'PointLoad':
      return isAdding ? 'add-point-load' : 'modify-point-load';
    case 'DistributedLoad':
      return isAdding ? 'add-distributed-load' : 'modify-distributed-load';
    case 'MomentLoad':
      return isAdding ? 'add-moment-load' : 'modify-moment-load';
    case 'Support':
      return 'modify-support';
    default:
      return 'modify-node'; // fallback
  }
}
