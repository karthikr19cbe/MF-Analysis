/**
 * Calculate the Herfindahl-Hirschman Index.
 * @param weights - Array of fractional weights (should sum to ~1.0)
 */
export function calculateHHI(weights: number[]): number {
  if (weights.length === 0) return 0;
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0) return 0;
  const normalized = weights.map(w => w / total);
  return normalized.reduce((s, w) => s + w * w, 0);
}

/**
 * Interpret the HHI value.
 */
export function interpretHHI(hhi: number): string {
  if (hhi >= 0.25) return 'Highly Concentrated';
  if (hhi >= 0.15) return 'Moderate';
  return 'Diversified';
}
