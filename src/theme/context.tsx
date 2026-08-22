import type { Theme as NavigationTheme } from "@react-navigation/native";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { type ColorSchemeName, useColorScheme } from "react-native";

import { setSettingsBatch } from "@/services/db/settings";
import { resolveBackgroundSource } from "./backgrounds";
import {
  ACCESSIBILITY_KEYS,
  type AccessibilityPreferences,
  APPEARANCE_KEYS,
  type AppearancePreferences,
  DEFAULT_PREFERENCES,
  ENTRY_KEYS,
  type EntryPreferences,
  getAppearanceResetDbEntries,
  SECURITY_KEYS,
  type SecurityPreferences,
  type ThemeMode,
  toDbEntries,
  type UserPreferences,
  WRITING_KEYS,
  type WritingPreferences,
} from "./preferences";
import {
  BASE_FONT_SIZE,
  createMotion,
  createTypography,
  DEFAULT_FONT_FAMILY,
  FONT,
  type FontName,
  getThemeColors,
  type MotionTokens,
  type RadiusScale,
  radius,
  type SpacingScale,
  space,
  type TextSize,
  type ThemeBackgroundConfig,
  type ThemeColors,
  type TypographyStyles,
} from "./tokens";

export type ResolvedThemeMode = "light" | "dark";
export type SystemScheme = ColorSchemeName;
export type NavTheme = NavigationTheme;

export interface Theme {
  readonly mode: ResolvedThemeMode;
  readonly colors: ThemeColors;
  readonly font: Readonly<{
    regular: string;
    medium: string;
    semibold: string;
  }>;
  readonly fontSize: Readonly<Record<string, number>>;
  readonly fontFamily: FontName;
  readonly textSize: TextSize;
  readonly typography: TypographyStyles;
  readonly spacing: SpacingScale;
  readonly radius: RadiusScale;
  readonly motion: MotionTokens;
  readonly backgroundConfig?: ThemeBackgroundConfig;
}

export interface PreferencesContextValue {
  readonly preferences: UserPreferences;
  setAppearance: (patch: Partial<AppearancePreferences>) => void;
  setEntry: (patch: Partial<EntryPreferences>) => void;
  setWriting: (patch: Partial<WritingPreferences>) => void;
  setAccessibility: (patch: Partial<AccessibilityPreferences>) => void;
  setSecurity: (patch: Partial<SecurityPreferences>) => void;
  resetAppearanceDefaults: () => void;
}

export interface ThemeContextValue {
  readonly theme: Theme;
  readonly mode: ResolvedThemeMode;
  readonly isDark: boolean;
  readonly navTheme: NavTheme;
}

export interface UseThemeResult {
  theme: Theme;
  colors: ThemeColors;
  typography: TypographyStyles;
  spacing: SpacingScale;
  radius: Theme["radius"];
  motion: MotionTokens;
  isDark: boolean;
  mode: ResolvedThemeMode;
  readonly resolvedMode: ResolvedThemeMode;
}

export function resolveThemeMode(mode: ThemeMode, systemScheme: SystemScheme): ResolvedThemeMode {
  if (mode === "system") return systemScheme === "dark" ? "dark" : "light";
  return mode;
}

export function resolveTheme(preferences: UserPreferences, systemScheme: SystemScheme): Theme {
  const { appearance, accessibility } = preferences;
  const mode = resolveThemeMode(appearance.mode, systemScheme);
  const activeFont = appearance.fontFamily || DEFAULT_FONT_FAMILY;

  return {
    mode,
    colors: getThemeColors(mode, appearance.accent),
    font: FONT,
    fontSize: BASE_FONT_SIZE,
    fontFamily: activeFont,
    textSize: appearance.textSize,
    typography: createTypography(appearance.textSize, activeFont),
    spacing: space,
    radius,
    motion: createMotion(accessibility.motionLevel),
    backgroundConfig: appearance.backgroundImageUri
      ? {
          imageUri: appearance.backgroundImageUri,
          imageSource: resolveBackgroundSource(appearance.backgroundImageUri),
          opacity:
            typeof appearance.backgroundImageOpacity === "number"
              ? appearance.backgroundImageOpacity
              : 0.35,
        }
      : undefined,
  };
}

export function makeNavTheme(mode: ResolvedThemeMode, colors: ThemeColors): NavTheme {
  return {
    dark: mode === "dark",
    fonts: {
      regular: { fontFamily: FONT.regular, fontWeight: "400" },
      medium: { fontFamily: FONT.medium, fontWeight: "500" },
      bold: { fontFamily: FONT.semibold, fontWeight: "600" },
      heavy: { fontFamily: FONT.semibold, fontWeight: "600" },
    },
    colors: {
      primary: colors.text,
      background: "transparent",
      card: colors.background,
      text: colors.text,
      border: colors.separator,
      notification: colors.destructive,
    },
  };
}

function persist(entries: Record<string, string>): void {
  if (Object.keys(entries).length > 0) {
    void setSettingsBatch(entries);
  }
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export interface PreferencesProviderProps {
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

  const resetAppearanceDefaults = useCallback(() => {
    setPreferences((prev) => ({
      ...prev,
      appearance: { ...DEFAULT_PREFERENCES.appearance },
      entry: { ...DEFAULT_PREFERENCES.entry },
    }));
    persist(getAppearanceResetDbEntries());
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({
      preferences,
      setAppearance,
      setEntry,
      setWriting,
      setAccessibility,
      setSecurity,
      resetAppearanceDefaults,
    }),
    [
      preferences,
      setAppearance,
      setEntry,
      setWriting,
      setAccessibility,
      setSecurity,
      resetAppearanceDefaults,
    ]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();
  const systemScheme = useColorScheme();

  const theme = useMemo(() => resolveTheme(preferences, systemScheme), [preferences, systemScheme]);

  const value = useMemo<ThemeContextValue>(() => {
    const navTheme = makeNavTheme(theme.mode, theme.colors);
    return {
      theme,
      mode: theme.mode,
      isDark: theme.mode === "dark",
      navTheme,
    };
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export interface AppProvidersProps {
  children: ReactNode;
  initialPreferences?: UserPreferences;
}

export function AppProviders({ children, initialPreferences }: AppProvidersProps) {
  return (
    <PreferencesProvider initialPreferences={initialPreferences}>
      <ThemeProvider>{children}</ThemeProvider>
    </PreferencesProvider>
  );
}

function usePreferencesContext(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences must be used within a PreferencesProvider");
  }
  return context;
}

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
  return useMemo(() => ({ ...preferences.entry, setEntry }), [preferences.entry, setEntry]);
}

export function useWritingPreferences() {
  const { preferences, setWriting } = usePreferencesContext();
  return useMemo(() => ({ ...preferences.writing, setWriting }), [preferences.writing, setWriting]);
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

function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function useTheme(): UseThemeResult {
  const { theme, mode, isDark } = useThemeContext();

  return useMemo(
    () => ({
      theme,
      colors: theme.colors,
      typography: theme.typography,
      spacing: theme.spacing,
      radius: theme.radius,
      motion: theme.motion,
      isDark,
      mode,
      resolvedMode: mode,
    }),
    [theme, mode, isDark]
  );
}

export function useNavigationTheme(): NavTheme {
  return useThemeContext().navTheme;
}
