import { WAVEFORM_BAR_COUNT } from "./constants";

/** Deterministic pseudo-waveform heights (0–1) from a seed string. */
export function waveformHeights(seed: string, count = WAVEFORM_BAR_COUNT): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }

  const heights: number[] = [];
  for (let i = 0; i < count; i += 1) {
    hash = (hash * 1103515245 + 12345) | 0;
    heights.push(0.18 + (Math.abs(hash) % 72) / 100);
  }

  return heights;
}

/** Normalize a dB metering value (typically -160…0) to 0–1. */
export function meteringToLevel(metering?: number): number {
  if (metering === undefined || !Number.isFinite(metering)) return 0.15;
  const normalized = (metering + 60) / 60;
  return Math.min(1, Math.max(0.12, normalized));
}

/** Build live waveform levels from metering, padding with a minimum height. */
export function liveWaveformLevels(samples: number[], count = WAVEFORM_BAR_COUNT): number[] {
  if (!samples.length) {
    return Array.from({ length: count }, () => 0.15);
  }

  const levels: number[] = [];
  const step = Math.max(1, samples.length / count);

  for (let i = 0; i < count; i += 1) {
    const index = Math.min(samples.length - 1, Math.floor(i * step));
    levels.push(samples[index]);
  }

  return levels;
}
