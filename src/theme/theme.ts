/**
 * @deprecated Compatibility barrel — import from `@/theme/types` and
 * `@/theme/resolver` directly. Kept so existing call sites compile
 * during migration.
 */

export { radius, resolveTheme, resolveThemeMode, makeNavTheme } from "./resolver";
export type {
  Theme,
  NavTheme,
  ResolvedThemeMode,
  SystemScheme,
} from "./types";
