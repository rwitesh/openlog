import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import {
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_600SemiBold,
  useFonts,
} from "@expo-google-fonts/source-sans-3";

import { getThemeMode, getUserName } from "@/db/settings";
import { loadEntries } from "@/entries";
import { resolveThemeMode, themeFor } from "@/theme/theme";
import type { ThemeMode } from "@/types/entry";
import { logDevWarning } from "@/lib";

export interface AppBootstrapState {
  ready: boolean;
  themeMode: ThemeMode;
  resolvedMode: "light" | "dark";
  backgroundColor: string;
  userName: string | null;
}

/** Loads fonts, theme, and profile before the first interactive screen. */
export function useAppBootstrap(): AppBootstrapState {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_600SemiBold,
  });

  useEffect(() => {
    let active = true;

    Promise.allSettled([getThemeMode(), getUserName()])
      .then(([themeResult, nameResult]) => {
        if (!active) return;
        setThemeMode(
          themeResult.status === "fulfilled" ? themeResult.value : "system"
        );
        if (themeResult.status === "rejected") {
          logDevWarning("bootstrap:getThemeMode", themeResult.reason);
        }
        setUserName(nameResult.status === "fulfilled" ? nameResult.value : null);
        if (nameResult.status === "rejected") {
          logDevWarning("bootstrap:getUserName", nameResult.reason);
        }
      })
      .finally(() => {
        if (active) setProfileLoaded(true);
      });

    loadEntries().catch((error) => {
      logDevWarning("bootstrap:loadEntries", error);
    });

    return () => {
      active = false;
    };
  }, []);

  const effectiveMode = themeMode ?? "system";
  const resolvedMode = resolveThemeMode(effectiveMode, systemScheme);
  const backgroundColor = themeFor(resolvedMode).colors.background;
  const fontsReady = fontsLoaded || Boolean(fontError);
  const ready = fontsReady && themeMode !== null && profileLoaded;

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
    userName,
  };
}
