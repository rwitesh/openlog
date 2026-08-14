/** "1:05" from seconds. */
export function formatDurationSec(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

/** "1:05" from a millisecond value. */
export function formatDurationMs(ms: number): string {
  return formatDurationSec(Math.floor((ms || 0) / 1000));
}

/** Clamp a ratio between 0 and 1. */
export function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
