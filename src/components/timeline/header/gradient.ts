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
  background: string,
  intensity: AtmosphereIntensity = "soft"
): GradientProps {
  if (intensity === "off") {
    return {
      colors: [background, background],
      locations: [0, 1],
    };
  }

  if (intensity === "muted") {
    return mode === "dark"
      ? {
          colors: ["#25231E", "#1A1916", background],
          locations: [0, 0.45, 1],
          start: { x: 0.1, y: 0 },
          end: { x: 0.9, y: 1 },
        }
      : {
          colors: ["#FFFEFC", "#FAF8F4", background],
          locations: [0, 0.45, 1],
          start: { x: 0.1, y: 0 },
          end: { x: 0.9, y: 1 },
        };
  }

  return mode === "dark"
    ? {
        colors: ["#3A3834", "#25231E", "#1A1916", background],
        locations: [0, 0.28, 0.62, 1],
        start: { x: 0.1, y: 0 },
        end: { x: 0.9, y: 1 },
      }
    : {
        colors: ["#FFFFFF", "#FFFEFC", "#FAF8F4", background],
        locations: [0, 0.28, 0.62, 1],
        start: { x: 0.1, y: 0 },
        end: { x: 0.9, y: 1 },
      };
}

export function screenGradient(
  mode: ResolvedMode,
  background: string,
  intensity: AtmosphereIntensity = "soft"
): GradientProps {
  if (intensity === "off") {
    return {
      colors: [background, background],
      locations: [0, 1],
    };
  }

  return mode === "dark"
    ? { colors: ["#1A1916", "#141310", background], locations: [0, 0.55, 1] }
    : { colors: ["#FFFFFF", "#FBFAF6", background], locations: [0, 0.55, 1] };
}
