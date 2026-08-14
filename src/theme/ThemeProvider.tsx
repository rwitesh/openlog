import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import { setThemeMode } from "@/db/settings";
import { resolveThemeMode, themeFor, type Theme } from "@/theme/theme";
import type { ThemeMode } from "@/types/entry";

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  /** Effective resolved mode ("light" | "dark"). */
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: themeFor("light"),
  mode: "system",
  resolvedMode: "light",
  setMode: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
  /** Loaded during app bootstrap so the first paint matches the splash screen. */
  initialMode: ThemeMode;
}

export function ThemeProvider({ children, initialMode }: ThemeProviderProps) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  const resolvedMode = resolveThemeMode(mode, systemScheme);
  const theme = useMemo(() => themeFor(resolvedMode), [resolvedMode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    void setThemeMode(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, mode, resolvedMode, setMode }),
    [theme, mode, resolvedMode, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
