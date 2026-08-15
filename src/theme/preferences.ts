import type { AccentChoice, ThemePaletteId } from "./colors";
import type { FontChoice, FontName, TextSize } from "./typography";
import { DEFAULT_FONT_FAMILY } from "./typography";
import type { MotionLevel } from "./motion";
import type { ThemeMode } from "./types";

export type TimelineStyle = "rail" | "minimal" | "clean";
export type TimelineDensity = "comfortable" | "compact";
export type AtmosphereIntensity = "soft" | "muted" | "off";
export type EditorTextSize = "regular" | "large";

export interface AppearancePreferences {
  palette: ThemePaletteId;
  accent: AccentChoice;
  mode: ThemeMode;
  atmosphere: AtmosphereIntensity;
  fontFamily: FontName;
  /** @deprecated Alias for fontFamily */
  fontChoice?: FontChoice;
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
    fontFamily: DEFAULT_FONT_FAMILY,
    fontChoice: DEFAULT_FONT_FAMILY,
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
    autoLocation: false,
  },
  accessibility: {
    motionLevel: "subtle",
  },
  security: {
    biometricLock: false,
  },
};
