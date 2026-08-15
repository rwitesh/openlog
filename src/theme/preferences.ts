import type { AccentChoice, PaperMood } from "./colors";
import type { FontChoice, TextSize } from "./typography";
import type { MotionLevel } from "./motion";
import type { ThemeMode } from "./types";

export type TimelineStyle = "rail" | "minimal" | "clean";
export type TimelineDensity = "comfortable" | "compact";
export type AtmosphereIntensity = "soft" | "muted" | "off";
export type EditorTextSize = "regular" | "large";

export interface AppearancePreferences {
  palette: PaperMood;
  accent: AccentChoice;
  mode: ThemeMode;
  atmosphere: AtmosphereIntensity;
  fontChoice: FontChoice;
  textSize: TextSize;
}

export interface EntryPreferences {
  timelineStyle: TimelineStyle;
  timelineDensity: TimelineDensity;
  showTimestamp: boolean;
  showLocation: boolean;
}

export interface WritingPreferences {
  editorTextSize: EditorTextSize;
  autoLocation: boolean;
}

export interface AccessibilityPreferences {
  motionLevel: MotionLevel;
}

export interface SecurityPreferences {
  /** Require biometric / device-credential unlock when the app opens. */
  biometricLock: boolean;
}

export interface UserPreferences {
  appearance: AppearancePreferences;
  entry: EntryPreferences;
  writing: WritingPreferences;
  accessibility: AccessibilityPreferences;
  security: SecurityPreferences;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  appearance: {
    palette: "warm",
    accent: "default",
    mode: "system",
    atmosphere: "soft",
    fontChoice: "sans",
    textSize: "regular",
  },
  entry: {
    timelineStyle: "rail",
    timelineDensity: "comfortable",
    showTimestamp: true,
    showLocation: true,
  },
  writing: {
    editorTextSize: "regular",
    autoLocation: true,
  },
  accessibility: {
    motionLevel: "subtle",
  },
  security: {
    biometricLock: false,
  },
};

export type MoodId = "quiet" | "fresh" | "evening" | "earth" | "bold" | "custom";

export interface MoodPreset {
  id: Exclude<MoodId, "custom">;
  name: string;
  tagline: string;
  description: string;
  palette: PaperMood;
  accent: AccentChoice;
  fontChoice: FontChoice;
  textSize: TextSize;
  atmosphere: AtmosphereIntensity;
  timelineStyle: TimelineStyle;
  timelineDensity: TimelineDensity;
}

export const MOOD_PRESETS: MoodPreset[] = [
  {
    id: "quiet",
    name: "Quiet",
    tagline: "Serene & Meditative",
    description: "Classic Warm Paper with theme default ink and connected rail.",
    palette: "warm",
    accent: "default",
    fontChoice: "sans",
    textSize: "regular",
    atmosphere: "soft",
    timelineStyle: "rail",
    timelineDensity: "comfortable",
  },
  {
    id: "fresh",
    name: "Fresh",
    tagline: "Botanical & Airy",
    description: "Cool Sage tones with minimal dots and light atmosphere.",
    palette: "sage",
    accent: "sage",
    fontChoice: "sans",
    textSize: "regular",
    atmosphere: "soft",
    timelineStyle: "minimal",
    timelineDensity: "comfortable",
  },
  {
    id: "evening",
    name: "Evening",
    tagline: "Subdued & Warm",
    description: "Midnight ink with warm amber accent and literary serif.",
    palette: "midnight",
    accent: "amber",
    fontChoice: "serif",
    textSize: "regular",
    atmosphere: "muted",
    timelineStyle: "rail",
    timelineDensity: "comfortable",
  },
  {
    id: "earth",
    name: "Earth",
    tagline: "Tactile & Grounded",
    description: "Warm terracotta clay with generous serif reading typography.",
    palette: "terracotta",
    accent: "terracotta",
    fontChoice: "serif",
    textSize: "generous",
    atmosphere: "soft",
    timelineStyle: "rail",
    timelineDensity: "comfortable",
  },
  {
    id: "bold",
    name: "Bold",
    tagline: "Crisp & Uncluttered",
    description: "Deep forest tones with clean lines and compact density.",
    palette: "forest",
    accent: "indigo",
    fontChoice: "sans",
    textSize: "generous",
    atmosphere: "muted",
    timelineStyle: "clean",
    timelineDensity: "compact",
  },
];

export function getActiveMoodId(preferences: UserPreferences): MoodId {
  const match = MOOD_PRESETS.find(
    (p) =>
      p.palette === preferences.appearance.palette &&
      p.accent === preferences.appearance.accent &&
      p.fontChoice === preferences.appearance.fontChoice &&
      p.textSize === preferences.appearance.textSize &&
      p.atmosphere === preferences.appearance.atmosphere &&
      p.timelineStyle === preferences.entry.timelineStyle &&
      p.timelineDensity === preferences.entry.timelineDensity
  );
  return match ? match.id : "custom";
}

export function getActiveMoodName(preferences: UserPreferences): string {
  const id = getActiveMoodId(preferences);
  if (id === "custom") return "Custom";
  const preset = MOOD_PRESETS.find((p) => p.id === id);
  return preset?.name ?? "Custom";
}
