/** Presentation-only Scene Lab world-X formatting; never mutates authored coordinates. */
export function formatWorldX(value: number): string {
  return String(Math.round(Number.isFinite(value) ? value : 0));
}
