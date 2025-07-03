/**
 * Normalizes decimal separator from comma to dot for consistent parsing
 * @param value Input string that may contain comma or dot as decimal separator
 * @returns String with comma replaced by dot
 */
export function normalizeDecimalSeparator(value: string): string {
  return value.replace(/,/g, '.');
}

/**
 * Rounds a number to 2 decimal places
 * @param value Number to round
 * @returns Number rounded to 2 decimal places
 */
export function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Formats a number for display with exactly 2 decimal places, optionally using comma as decimal separator
 * @param value Number to format
 * @param useComma Whether to use comma as decimal separator (default: true)
 * @returns Formatted string with 2 decimal places
 */
export function formatNumber(value: number, useComma = true): string {
  const rounded = roundToTwoDecimals(value);
  const formatted = rounded.toFixed(2);
  return useComma ? formatted.replace('.', ',') : formatted;
}

/**
 * Snaps coordinates to 2 decimal places
 * @param point Point with x and y coordinates
 * @returns Point with coordinates rounded to 2 decimal places
 */
export function snapToTwoDecimals(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: roundToTwoDecimals(point.x),
    y: roundToTwoDecimals(point.y)
  };
}
