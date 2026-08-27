import {
  SourceSans3_400Regular,
  SourceSans3_500Medium,
  SourceSans3_600SemiBold,
  useFonts,
} from "@expo-google-fonts/source-sans-3";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";
import { getAllUserPreferences } from "@/services/db/settings";
import { fontManager } from "@/services/fonts";
import { requestNotificationPermission } from "@/services/notifications";
import { logDevWarning } from "@/shared/utils/devLog";
import { DEFAULT_PREFERENCES, resolveTheme, resolveThemeMode, type UserPreferences } from "@/theme";

export interface AppBootstrapState {
  ready: boolean;
  preferences: UserPreferences;
  resolvedMode: "light" | "dark";
  backgroundColor: string;
  userName: string | null;
  onboardingCompleted: boolean;
}

/** Loads fonts, preferences, and profile before the first interactive screen. */
export function useAppBootstrap(): AppBootstrapState {
  const systemScheme = useColorScheme();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    SourceSans3_400Regular,
    SourceSans3_500Medium,
    SourceSans3_600SemiBold,
  });

  useEffect(() => {
    let active = true;

    getAllUserPreferences()
      .then(async (data) => {
        if (!active) return;
        setUserName(data.userName);
        setOnboardingCompleted(data.onboardingCompleted);
        setPreferences(data.preferences);

        // Gracefully request notification permissions in background on startup
        void requestNotificationPermission();

        const selectedFont = data.preferences.appearance.fontFamily;
        if (selectedFont && selectedFont !== "Source Sans 3") {
          // Bounded load attempt on startup so app boots quickly even if offline or slow
          try {
            await Promise.race([
              fontManager.load(selectedFont),
              new Promise((resolve) => setTimeout(resolve, 2000)),
            ]);
          } catch (error) {
            logDevWarning("bootstrap:fontLoad", error);
          }
        }
      })
      .catch((error) => {
        logDevWarning("bootstrap:getAllUserPreferences", error);
        if (active) {
          setPreferences(DEFAULT_PREFERENCES);
        }
      })
      .finally(() => {
        if (active) setProfileLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  const effectivePreferences = preferences ?? DEFAULT_PREFERENCES;
  const resolvedMode = resolveThemeMode(effectivePreferences.appearance.mode, systemScheme);
  const theme = resolveTheme(effectivePreferences, systemScheme);
  const backgroundColor = theme.colors.background;
  const fontsReady = fontsLoaded || Boolean(fontError);
  const ready = fontsReady && preferences !== null && profileLoaded;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch((error) => {
      logDevWarning("bootstrap:hideSplash", error);
    });
  }, [ready]);

  return {
    ready,
    preferences: effectivePreferences,
    resolvedMode,
    backgroundColor,
    userName,
    onboardingCompleted,
  };
}
