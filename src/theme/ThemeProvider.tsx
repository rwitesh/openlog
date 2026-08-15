/**
 * @deprecated Compatibility barrel for the pre-refactor import surface.
 *
 * The system is now split into two providers with strict separation of
 * concerns:
 *
 *   <PreferencesProvider>   raw preference state + DB persistence
 *     <ThemeProvider>       resolved visual tokens + navigation theme
 *
 * Use `AppProviders` (below) to mount both in one expression, or nest
 * them manually for finer control.
 */

import type { ReactNode } from "react";

import { PreferencesProvider } from "./PreferencesContext";
import { ThemeProvider } from "./ThemeContext";
import type { UserPreferences } from "./types";

export {
  PreferencesProvider,
  usePreferences,
  useAppearancePreferences,
  useJournalPreferences,
  useWritingPreferences,
  useAccessibilityPreferences,
} from "./PreferencesContext";

export {
  ThemeProvider,
  useTheme,
  useNavigationTheme,
} from "./ThemeContext";

export { useThemedStyles } from "./useThemedStyles";

interface AppProvidersProps {
  children: ReactNode;
  /** Preferences hydrated from the DB at bootstrap (splash gate). */
  initialPreferences?: UserPreferences;
}

/** Canonical provider composition: preferences own state, theme derives. */
export function AppProviders({
  children,
  initialPreferences,
}: AppProvidersProps) {
  return (
    <PreferencesProvider initialPreferences={initialPreferences}>
      <ThemeProvider>{children}</ThemeProvider>
    </PreferencesProvider>
  );
}
