/**
 * Public surface of the theming & preferences system.
 *
 *   tokens:       colors, typography, motion, spacing (leaf modules)
 *   types:        contracts only
 *   resolver:     pure resolution (resolveTheme, makeNavTheme, …)
 *   Preferences:  raw preference state + persistence
 *   Theme:        resolved visual tokens + navigation theme
 *   styles:       useThemedStyles
 *   primitives:   ThemedView / ThemedText / ThemedButton
 */

export * from "./types";
export { radius, resolveTheme, resolveThemeMode, makeNavTheme } from "./resolver";

export {
  PreferencesProvider,
  usePreferences,
  useAppearancePreferences,
  useEntryPreferences,
  useWritingPreferences,
  useAccessibilityPreferences,
  useSecurityPreferences,
} from "./PreferencesContext";

export {
  ThemeProvider,
  useTheme,
  useNavigationTheme,
} from "./ThemeContext";

export { useThemedStyles } from "./useThemedStyles";

export {
  ThemedView,
  ThemedText,
  ThemedButton,
  type ThemedViewProps,
  type ThemedTextProps,
  type ThemedTextVariant,
  type ThemedTextColor,
  type ThemedButtonProps,
  type ThemedButtonVariant,
  type ThemedButtonSize,
  type ThemedSurface,
} from "./primitives";

export { AppProviders } from "./ThemeProvider";
