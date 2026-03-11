/**
 * Format a value in Lakhs, converting to Crores for large values.
 */
export function formatLakhs(value: number): string {
  if (value >= 100) {
    return `₹${(value / 100).toFixed(2)} Cr`;
  }
  return `₹${value.toFixed(2)} L`;
}

/**
 * Format a percentage value.
 */
export function formatPct(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Format HHI value with interpretation.
 */
export function formatHHI(value: number, interpretation: string): string {
  return `${value.toFixed(4)} (${interpretation})`;
}

/**
 * Format a number with commas.
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('en-IN');
}

/**
 * Format a date string for display.
 */
export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Get color class based on HHI interpretation.
 */
export function getHHIColor(interpretation: string): string {
  switch (interpretation) {
    case 'Diversified':
      return 'text-emerald-400';
    case 'Moderate':
      return 'text-amber-400';
    case 'Highly Concentrated':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get background color class based on HHI interpretation.
 */
export function getHHIBgColor(interpretation: string): string {
  switch (interpretation) {
    case 'Diversified':
      return 'bg-emerald-900 text-emerald-300';
    case 'Moderate':
      return 'bg-amber-900 text-amber-300';
    case 'Highly Concentrated':
      return 'bg-red-900 text-red-300';
    default:
      return 'bg-gray-800 text-gray-300';
  }
}
