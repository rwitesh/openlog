import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_600SemiBold,
} from "@expo-google-fonts/source-sans-3";

import { getThemeMode } from "@/db/settings";
import { resolveThemeMode, themeFor } from "@/theme/theme";
import type { ThemeMode } from "@/types/entry";
import { logDevWarning } from "@/lib";

export interface AppBootstrapState {
  ready: boolean;
  themeMode: ThemeMode;
  resolvedMode: "light" | "dark";
  backgroundColor: string;
}

/**
 * Loads fonts and the persisted theme before the first interactive screen.
 * Keeps the native splash visible until both are ready.
 */
export function useAppBootstrap(): AppBootstrapState {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode | null>(null);
  const [fontsLoaded, fontError] = useFonts({
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_600SemiBold,
  });

  useEffect(() => {
    let active = true;

    getThemeMode()
      .then((mode) => {
        if (active) setThemeMode(mode);
      })
      .catch((error) => {
        logDevWarning("bootstrap:getThemeMode", error);
        if (active) setThemeMode("system");
      });

    return () => {
      active = false;
    };
  }, []);

  const effectiveMode = themeMode ?? "system";
  const resolvedMode = resolveThemeMode(effectiveMode, systemScheme);
  const backgroundColor = themeFor(resolvedMode).colors.background;
  const fontsReady = fontsLoaded || Boolean(fontError);
  const ready = fontsReady && themeMode !== null;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch((error) => {
      logDevWarning("bootstrap:hideSplash", error);
    });
  }, [ready]);

  return {
    ready,
    themeMode: effectiveMode,
    resolvedMode,
    backgroundColor,
  };
}
