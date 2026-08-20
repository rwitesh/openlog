/**
 * ThemeContext — the pure visual token layer.
 *
 * Subscribes ONLY to the inputs that affect visuals:
 *   - `appearance` (accent, mode, font, text size, background)
 *   - `accessibility.motionLevel`
 *   - the OS color scheme
 *
 * Functional preferences (entry/writing toggles) changing here will NOT
 * re-render theme consumers — that state lives in PreferencesContext.
 */

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import { makeNavTheme, resolveTheme } from "./resolver";
import { usePreferences } from "./PreferencesContext";
import type {
  MotionTokens,
  NavTheme,
  ResolvedThemeMode,
  SpacingScale,
  Theme,
  ThemeColors,
  TypographyStyles,
} from "./types";

interface ThemeContextValue {
  /** Stable resolved theme — new identity only when a visual input changes. */
  readonly theme: Theme;
  readonly mode: ResolvedThemeMode;
  readonly isDark: boolean;
  readonly navTheme: NavTheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { preferences } = usePreferences();
  const { appearance, accessibility } = preferences;
  const { motionLevel } = accessibility;
  const systemScheme = useColorScheme();

  const theme = useMemo(
    () => resolveTheme(appearance, motionLevel, systemScheme),
    [appearance, motionLevel, systemScheme]
  );

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

/* Consumer hooks */

function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("Theme hooks must be used within a <ThemeProvider>.");
  }
  return context;
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
  /** @deprecated Alias of `mode`. Kept for migration; new code uses `mode`. */
  readonly resolvedMode: ResolvedThemeMode;
}

/** Ergonomic, destructurable access to resolved visual tokens. */
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

/** React Navigation–compliant theme, derived from the resolved tokens. */
export function useNavigationTheme(): NavTheme {
  return useThemeContext().navTheme;
}
