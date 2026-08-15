/**
 * PreferencesContext — the single owner of raw user preference state.
 *
 * Responsibilities (and nothing else):
 *   - Hold `UserPreferences` and expose granular patchers.
 *   - Apply mood presets atomically (state + persistence).
 *   - Persist patches to the settings DB in a single batched write.
 *
 * It deliberately knows nothing about colors, typography, or the OS
 * color scheme — visual derivation lives in ThemeContext/resolver.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  setSettingsBatch,
  ACCENT_KEY,
  ATMOSPHERE_KEY,
  AUTO_LOCATION_KEY,
  BIOMETRIC_LOCK_KEY,
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
} from "@/services/db";
import {
  DEFAULT_PREFERENCES,
  MOOD_PRESETS,
  getActiveMoodId,
  getActiveMoodName,
  type MoodId,
} from "./preferences";
import type {
  AccessibilityPreferences,
  AppearancePreferences,
  EntryPreferences,
  PreferencesContextValue,
  SecurityPreferences,
  UserPreferences,
  WritingPreferences,
} from "./types";

/* Persistence mapping: preference field → settings DB key */

const APPEARANCE_KEYS: Record<keyof AppearancePreferences, string> = {
  palette: MOOD_KEY,
  accent: ACCENT_KEY,
  mode: THEME_KEY,
  atmosphere: ATMOSPHERE_KEY,
  fontChoice: FONT_KEY,
  textSize: TEXT_SIZE_KEY,
};

const ENTRY_KEYS: Record<keyof EntryPreferences, string> = {
  timelineStyle: TIMELINE_STYLE_KEY,
  timelineDensity: TIMELINE_DENSITY_KEY,
  showTimestamp: SHOW_TIMESTAMP_KEY,
  showLocation: SHOW_LOCATION_KEY,
};

const WRITING_KEYS: Record<keyof WritingPreferences, string> = {
  editorTextSize: EDITOR_TEXT_SIZE_KEY,
  autoLocation: AUTO_LOCATION_KEY,
};

const ACCESSIBILITY_KEYS: Record<keyof AccessibilityPreferences, string> = {
  motionLevel: MOTION_LEVEL_KEY,
};

const SECURITY_KEYS: Record<keyof SecurityPreferences, string> = {
  biometricLock: BIOMETRIC_LOCK_KEY,
};

/** Converts a preference patch into DB key/value entries (single write). */
function toDbEntries<T extends object>(
  patch: Partial<T>,
  keyMap: Record<keyof T, string>
): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const value = patch[key];
    if (value !== undefined) entries[keyMap[key]] = String(value);
  }
  return entries;
}

function persist(entries: Record<string, string>): void {
  if (Object.keys(entries).length > 0) {
    void setSettingsBatch(entries);
  }
}

/* Context */

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

interface PreferencesProviderProps {
  children: ReactNode;
  initialPreferences?: UserPreferences;
}

export function PreferencesProvider({
  children,
  initialPreferences = DEFAULT_PREFERENCES,
}: PreferencesProviderProps) {
  const [preferences, setPreferences] = useState<UserPreferences>(initialPreferences);

  const setAppearance = useCallback((patch: Partial<AppearancePreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      appearance: { ...prev.appearance, ...patch },
    }));
    persist(toDbEntries(patch, APPEARANCE_KEYS));
  }, []);

  const setEntry = useCallback((patch: Partial<EntryPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      entry: { ...prev.entry, ...patch },
    }));
    persist(toDbEntries(patch, ENTRY_KEYS));
  }, []);

  const setWriting = useCallback((patch: Partial<WritingPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      writing: { ...prev.writing, ...patch },
    }));
    persist(toDbEntries(patch, WRITING_KEYS));
  }, []);

  const setAccessibility = useCallback((patch: Partial<AccessibilityPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      accessibility: { ...prev.accessibility, ...patch },
    }));
    persist(toDbEntries(patch, ACCESSIBILITY_KEYS));
  }, []);

  const setSecurity = useCallback((patch: Partial<SecurityPreferences>) => {
    setPreferences((prev) => ({
      ...prev,
      security: { ...prev.security, ...patch },
    }));
    persist(toDbEntries(patch, SECURITY_KEYS));
  }, []);

  const applyMood = useCallback((moodId: Exclude<MoodId, "custom">) => {
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
      entry: {
        ...prev.entry,
        timelineStyle: preset.timelineStyle,
        timelineDensity: preset.timelineDensity,
      },
    }));

    persist({
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

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      activeMoodId,
      activeMoodName,
      setAppearance,
      setEntry,
      setWriting,
      setAccessibility,
      setSecurity,
      applyMood,
    }),
    [
      preferences,
      activeMoodId,
      activeMoodName,
      setAppearance,
      setEntry,
      setWriting,
      setAccessibility,
      setSecurity,
      applyMood,
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

/* Consumer hooks */

function usePreferencesContext(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error(
      "usePreferences* hooks must be used within a <PreferencesProvider>."
    );
  }
  return context;
}

/** Full preference state + patchers + mood selection. */
export function usePreferences(): PreferencesContextValue {
  return usePreferencesContext();
}

export function useAppearancePreferences() {
  const { preferences, setAppearance } = usePreferencesContext();
  return useMemo(
    () => ({ ...preferences.appearance, setAppearance }),
    [preferences.appearance, setAppearance]
  );
}

export function useEntryPreferences() {
  const { preferences, setEntry } = usePreferencesContext();
  return useMemo(
    () => ({ ...preferences.entry, setEntry }),
    [preferences.entry, setEntry]
  );
}

export function useWritingPreferences() {
  const { preferences, setWriting } = usePreferencesContext();
  return useMemo(
    () => ({ ...preferences.writing, setWriting }),
    [preferences.writing, setWriting]
  );
}

export function useAccessibilityPreferences() {
  const { preferences, setAccessibility } = usePreferencesContext();
  return useMemo(
    () => ({ ...preferences.accessibility, setAccessibility }),
    [preferences.accessibility, setAccessibility]
  );
}

export function useSecurityPreferences() {
  const { preferences, setSecurity } = usePreferencesContext();
  return useMemo(
    () => ({ ...preferences.security, setSecurity }),
    [preferences.security, setSecurity]
  );
}
