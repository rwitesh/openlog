import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import {
  setSetting,
  setSettingsBatch,
  ACCENT_KEY,
  ATMOSPHERE_KEY,
  AUTO_LOCATION_KEY,
  EDITOR_TEXT_SIZE_KEY,
  FONT_KEY,
  MOOD_KEY,
  MOTION_LEVEL_KEY,
  SHOW_LOCATION_KEY,
  SHOW_TIMESTAMP_KEY,
  TEXT_SIZE_KEY,
  THEME_KEY,
  TIMELINE_DENSITY_KEY,
  TIMELINE_STYLE_KEY,
} from "@/db/settings";
import {
  DEFAULT_PREFERENCES,
  MOOD_PRESETS,
  getActiveMoodId,
  getActiveMoodName,
  type AccessibilityPreferences,
  type AppearancePreferences,
  type MoodId,
  type MoodPreset,
  type JournalPreferences,
  type UserPreferences,
  type WritingPreferences,
} from "./preferences";
import { resolveTheme, resolveThemeMode, type Theme } from "./theme";

interface ThemeContextValue {
  theme: Theme;
  resolvedMode: "light" | "dark";
  preferences: UserPreferences;
  activeMoodId: MoodId;
  activeMoodName: string;
  setAppearance: (patch: Partial<AppearancePreferences>) => void;
  setJournal: (patch: Partial<JournalPreferences>) => void;
  setWriting: (patch: Partial<WritingPreferences>) => void;
  setAccessibility: (patch: Partial<AccessibilityPreferences>) => void;
  applyMood: (moodId: MoodPreset["id"]) => void;
}

const defaultResolvedTheme = resolveTheme(
  DEFAULT_PREFERENCES.appearance,
  DEFAULT_PREFERENCES.accessibility.motionLevel,
  "light"
);

export const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultResolvedTheme,
  resolvedMode: "light",
  preferences: DEFAULT_PREFERENCES,
  activeMoodId: "quiet",
  activeMoodName: "Quiet",
  setAppearance: () => {},
  setJournal: () => {},
  setWriting: () => {},
  setAccessibility: () => {},
  applyMood: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  initialPreferences?: UserPreferences;
}

export function ThemeProvider({
  children,
  initialPreferences = DEFAULT_PREFERENCES,
}: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);

  const resolvedMode = resolveThemeMode(preferences.appearance.mode, systemScheme);
  const theme = useMemo(
    () =>
      resolveTheme(
        preferences.appearance,
        preferences.accessibility.motionLevel,
        systemScheme
      ),
    [preferences.appearance, preferences.accessibility.motionLevel, systemScheme]
  );

  const setAppearance = useCallback((patch: Partial<AppearancePreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      appearance: { ...prev.appearance, ...patch },
    }));

    if (patch.palette !== undefined) void setSetting(MOOD_KEY, patch.palette);
    if (patch.accent !== undefined) void setSetting(ACCENT_KEY, patch.accent);
    if (patch.mode !== undefined) void setSetting(THEME_KEY, patch.mode);
    if (patch.atmosphere !== undefined) void setSetting(ATMOSPHERE_KEY, patch.atmosphere);
    if (patch.fontChoice !== undefined) void setSetting(FONT_KEY, patch.fontChoice);
    if (patch.textSize !== undefined) void setSetting(TEXT_SIZE_KEY, patch.textSize);
  }, []);

  const setJournal = useCallback((patch: Partial<JournalPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      journal: { ...prev.journal, ...patch },
    }));

    if (patch.timelineStyle !== undefined) void setSetting(TIMELINE_STYLE_KEY, patch.timelineStyle);
    if (patch.timelineDensity !== undefined) void setSetting(TIMELINE_DENSITY_KEY, patch.timelineDensity);
    if (patch.showTimestamp !== undefined) void setSetting(SHOW_TIMESTAMP_KEY, String(patch.showTimestamp));
    if (patch.showLocation !== undefined) void setSetting(SHOW_LOCATION_KEY, String(patch.showLocation));
  }, []);

  const setWriting = useCallback((patch: Partial<WritingPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      writing: { ...prev.writing, ...patch },
    }));

    if (patch.editorTextSize !== undefined) void setSetting(EDITOR_TEXT_SIZE_KEY, patch.editorTextSize);
    if (patch.autoLocation !== undefined) void setSetting(AUTO_LOCATION_KEY, String(patch.autoLocation));
  }, []);

  const setAccessibility = useCallback((patch: Partial<AccessibilityPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      accessibility: { ...prev.accessibility, ...patch },
    }));

    if (patch.motionLevel !== undefined) void setSetting(MOTION_LEVEL_KEY, patch.motionLevel);
  }, []);

  const applyMood = useCallback((moodId: MoodPreset["id"]) => {
    const preset = MOOD_PRESETS.find((p) => p.id === moodId);
    if (!preset) return;

    setPreferences((prev) => ({
      ...prev,
      appearance: {
        ...prev.appearance,
        palette: preset.palette,
        accent: preset.accent,
        fontChoice: preset.fontChoice,
        textSize: preset.textSize,
        atmosphere: preset.atmosphere,
      },
      journal: {
        ...prev.journal,
        timelineStyle: preset.timelineStyle,
        timelineDensity: preset.timelineDensity,
      },
    }));

    void setSettingsBatch({
      [MOOD_KEY]: preset.palette,
      [ACCENT_KEY]: preset.accent,
      [FONT_KEY]: preset.fontChoice,
      [TEXT_SIZE_KEY]: preset.textSize,
      [ATMOSPHERE_KEY]: preset.atmosphere,
      [TIMELINE_STYLE_KEY]: preset.timelineStyle,
      [TIMELINE_DENSITY_KEY]: preset.timelineDensity,
    });
  }, []);

  const activeMoodId = useMemo(() => getActiveMoodId(preferences), [preferences]);
  const activeMoodName = useMemo(() => getActiveMoodName(preferences), [preferences]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedMode,
      preferences,
      activeMoodId,
      activeMoodName,
      setAppearance,
      setJournal,
      setWriting,
      setAccessibility,
      applyMood,
    }),
    [
      theme,
      resolvedMode,
      preferences,
      activeMoodId,
      activeMoodName,
      setAppearance,
      setJournal,
      setWriting,
      setAccessibility,
      applyMood,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const { theme, resolvedMode } = useContext(ThemeContext);
  return { theme, resolvedMode };
}

export function usePreferences() {
  const {
    preferences,
    activeMoodId,
    activeMoodName,
    setAppearance,
    setJournal,
    setWriting,
    setAccessibility,
    applyMood,
  } = useContext(ThemeContext);
  return {
    preferences,
    activeMoodId,
    activeMoodName,
    setAppearance,
    setJournal,
    setWriting,
    setAccessibility,
    applyMood,
  };
}

export function useJournalPreferences() {
  const { preferences, setJournal } = useContext(ThemeContext);
  return { ...preferences.journal, setJournal };
}

export function useWritingPreferences() {
  const { preferences, setWriting } = useContext(ThemeContext);
  return { ...preferences.writing, setWriting };
}

export function useAccessibilityPreferences() {
  const { preferences, setAccessibility } = useContext(ThemeContext);
  return { ...preferences.accessibility, setAccessibility };
}
