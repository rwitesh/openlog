import type { ThemeColors } from "@/theme/colors";
import type { AtmosphereIntensity } from "@/theme/preferences";

type ResolvedMode = "light" | "dark";

interface GradientProps {
  colors: readonly [string, string, ...string[]];
  locations: readonly [number, number, ...number[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

export function headerGradient(
  mode: ResolvedMode,
  themeColors: ThemeColors | string,
  intensity: AtmosphereIntensity = "soft"
): GradientProps {
  const bg = typeof themeColors === "string" ? themeColors : themeColors.background;
  const surface = typeof themeColors === "string" ? themeColors : themeColors.surface;
  const surfaceMuted = typeof themeColors === "string" ? themeColors : themeColors.surfaceMuted;

  if (intensity === "off") {
    return {
      colors: [bg, bg],
      locations: [0, 1],
    };
  }

  if (intensity === "muted") {
    return mode === "dark"
      ? {
          colors: [surfaceMuted, surface, bg],
          locations: [0, 0.45, 1],
          start: { x: 0.1, y: 0 },
          end: { x: 0.9, y: 1 },
        }
      : {
          colors: [surface, surfaceMuted, bg],
          locations: [0, 0.45, 1],
          start: { x: 0.1, y: 0 },
          end: { x: 0.9, y: 1 },
        };
  }

  return mode === "dark"
    ? {
        colors: [surfaceMuted, surfaceMuted, surface, bg],
        locations: [0, 0.28, 0.62, 1],
        start: { x: 0.1, y: 0 },
        end: { x: 0.9, y: 1 },
      }
    : {
        colors: [surface, surface, surfaceMuted, bg],
        locations: [0, 0.28, 0.62, 1],
        start: { x: 0.1, y: 0 },
        end: { x: 0.9, y: 1 },
      };
}

export function screenGradient(
  mode: ResolvedMode,
  themeColors: ThemeColors | string,
  intensity: AtmosphereIntensity = "soft"
): GradientProps {
  const bg = typeof themeColors === "string" ? themeColors : themeColors.background;
  const surface = typeof themeColors === "string" ? themeColors : themeColors.surface;
  const surfaceMuted = typeof themeColors === "string" ? themeColors : themeColors.surfaceMuted;

  if (intensity === "off") {
    return {
      colors: [bg, bg],
      locations: [0, 1],
    };
  }

  return mode === "dark"
    ? { colors: [surfaceMuted, surface, bg], locations: [0, 0.55, 1] }
    : { colors: [surface, surfaceMuted, bg], locations: [0, 0.55, 1] };
}
