/**
 * useThemedStyles — memoized, theme-aware StyleSheet factory.
 *
 * Contract:
 *   The factory must be a PURE function of the theme (no props, no state).
 *   The returned StyleSheet instance is cached and re-created ONLY when the
 *   resolved theme object changes identity — i.e., when palette, mode,
 *   accent, font, text size, or motion level actually change.
 *
 * Because the latest factory is kept in a ref, inline arrow functions are
 * safe; the cache still invalidates purely on theme identity.
 *
 *   const styles = useThemedStyles((t) => ({
 *     card: {
 *       backgroundColor: t.colors.surface,
 *       borderRadius: t.radius.md,
 *       padding: t.spacing.lg,
 *     },
 *   }));
 */

import { useMemo, useRef } from "react";

import { useTheme } from "./ThemeContext";
import type { Theme } from "./types";

export type StylesFactory<S> = (theme: Theme) => S;

export function useThemedStyles<S>(factory: StylesFactory<S>): S {
  const { theme } = useTheme();

  const factoryRef = useRef(factory);
  factoryRef.current = factory;

  // Recompute only when the resolved theme changes — never per render.
  return useMemo(
    () => factoryRef.current(theme),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme]
  );
}
