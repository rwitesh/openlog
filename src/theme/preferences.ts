import type { AccentChoice } from "./colors";
import type { FontName, TextSize } from "./typography";
import { DEFAULT_FONT_FAMILY } from "./typography";
import type { MotionLevel } from "./motion";
import type { ThemeMode } from "./types";

export type TimelineStyle = "rail" | "minimal" | "clean";
export type TimelineDensity = "comfortable" | "compact";
export type EditorTextSize = "regular" | "large";

export interface AppearancePreferences {
  accent: AccentChoice;
  mode: ThemeMode;
  fontFamily: FontName;
  textSize: TextSize;
  backgroundImageUri?: string | null;
}

export interface EntryPreferences {
  timelineStyle: TimelineStyle;
  timelineDensity: TimelineDensity;
  showTimestamp: boolean;
  showLocation: boolean;
}

export interface WritingPreferences {
  editorTextSize: EditorTextSize;
}

export interface AccessibilityPreferences {
  motionLevel: MotionLevel;
}

export interface SecurityPreferences {
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
    accent: "default",
    mode: "system",
    fontFamily: DEFAULT_FONT_FAMILY,
    textSize: "regular",
    backgroundImageUri: null,
  },
  entry: {
    timelineStyle: "rail",
    timelineDensity: "comfortable",
    showTimestamp: true,
    showLocation: true,
  },
  writing: {
    editorTextSize: "regular",
  },
  accessibility: {
    motionLevel: "subtle",
  },
  security: {
    biometricLock: false,
  },
};
