/// <reference types="expo/types/metro-require" />
import type { ImageSourcePropType } from "react-native";

export interface BackgroundPreset {
  id: string;
  source: ImageSourcePropType;
}

// Automatically discovers all image files in assets/backgrounds at compile time via Metro's require.context
const bgContext = require.context("../../assets/backgrounds", false, /\.(jpe?g|png|webp)$/);

const sortedKeys: string[] = bgContext
  .keys()
  .sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));

export const BACKGROUND_SOURCES: ImageSourcePropType[] = sortedKeys.map((key) =>
  bgContext<ImageSourcePropType>(key)
);

export const BACKGROUND_PRESETS: BackgroundPreset[] = BACKGROUND_SOURCES.map((source, index) => ({
  id: `preset-${index + 1}`,
  source,
}));

export function resolveBackgroundSource(
  uriOrId: string | null | undefined
): ImageSourcePropType | null {
  if (!uriOrId || uriOrId === "null") return null;

  const direct = BACKGROUND_PRESETS.find((p) => p.id === uriOrId);
  if (direct) return direct.source;

  const legacyMatch = uriOrId.match(/^bg-?(\d+)$/i);
  if (legacyMatch) {
    const idx = parseInt(legacyMatch[1], 10) - 1;
    if (idx >= 0 && idx < BACKGROUND_SOURCES.length) {
      return BACKGROUND_SOURCES[idx];
    }
  }

  return { uri: uriOrId };
}

export function getBackgroundPreset(id: string | null | undefined): BackgroundPreset | undefined {
  if (!id || id === "null") return undefined;
  return BACKGROUND_PRESETS.find((p) => p.id === id);
}
