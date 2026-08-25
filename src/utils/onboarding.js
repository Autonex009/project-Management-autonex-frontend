/** Clamp a quiz passing score to 0–100. Invalid values become 0. */
export function clampPassingScore(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}