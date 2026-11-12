import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { PostHogErrorBoundary, PostHogProvider } from "posthog-react-native";
import { type ReactNode, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { analytics } from "@/config/analytics";
import { posthog } from "@/config/posthog";
import { AppLockGate } from "@/modules/auth";
import { sweepUnreferencedMedia } from "@/modules/entry";
import { ProfileProvider } from "@/modules/profile";
import type { RootStackParamList } from "@/navigation";
import { Compose } from "@/screens/compose";
import { Day } from "@/screens/day";
import {
  Settings,
  SettingsAbout,
  SettingsAccent,
  SettingsAccessibility,
  SettingsAppearance,
  SettingsPrivacy,
  SettingsProfile,
  SettingsTheme,
  SettingsTimeline,
  SettingsTypography,
} from "@/screens/settings";
import { Tag } from "@/screens/tag";
import { Timeline } from "@/screens/timeline";
import { Welcome } from "@/screens/welcome";
import { AudioProvider } from "@/services/audio";
import { Layout, ThemedText } from "@/shared/components";
import { useAppBootstrap } from "@/shared/hooks";
import { logDevWarning, reportError } from "@/shared/utils";
import { AppProviders, space, useNavigationTheme, useTheme } from "@/theme";

/** Holds the splash screen until local bootstrap (fonts + preferences) finishes. */
function BootstrapGate({
  ready,
  databaseUnavailable,
  backgroundColor,
  children,
}: {
  ready: boolean;
  databaseUnavailable: boolean;
  backgroundColor: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch((error) => logDevWarning("bootstrap:hideSplash", error));
    // The unavailable-database screen promises nothing is touched, so cleanup waits for a working one.
    if (databaseUnavailable) return;
    sweepUnreferencedMedia().catch((error) => reportError("bootstrap:sweepMedia", error));
  }, [ready, databaseUnavailable]);

  if (!ready) return <View style={{ flex: 1, backgroundColor }} />;
  return <>{children}</>;
}

SplashScreen.setOptions({ duration: 400, fade: true });
SplashScreen.preventAutoHideAsync().catch((error) => {
  logDevWarning("startup:preventAutoHideAsync", error);
});

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Stands in for the whole app when the database cannot open; it reads and writes nothing. */
function DatabaseUnavailable() {
  const { theme, mode } = useTheme();

  return (
    <View style={[styles.unavailable, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />
      <ThemedText
        weight="semibold"
        accessibilityRole="header"
        style={[theme.typography.emptyTitle, styles.centered, { color: theme.colors.text }]}
      >
        OpenLog can't open your timeline
      </ThemedText>
      <ThemedText
        style={[theme.typography.emptyBody, styles.centered, { color: theme.colors.textSecondary }]}
      >
        Nothing has been changed or deleted. Close OpenLog completely and open it again. If this
        keeps happening, update OpenLog to the latest version. Please don't uninstall it, as that
        would remove everything stored on this device.
      </ThemedText>
    </View>
  );
}

function AppContent({ showWelcome }: { showWelcome: boolean }) {
  const { theme, mode } = useTheme();
  const navTheme = useNavigationTheme();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const routeNameRef = useRef<string | undefined>(undefined);
  const navigator = (
    <AppNavigator showWelcome={showWelcome} backgroundColor={theme.colors.background} />
  );

  // Official React Navigation screen tracking: onReady fires for the initial
  // route, onStateChange for every navigation after that.
  const trackCurrentScreen = () => {
    const name = navigationRef.current?.getCurrentRoute()?.name;
    if (!name || routeNameRef.current === name) return;
    routeNameRef.current = name;
    analytics.screen(name);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <NavigationContainer
        ref={navigationRef}
        theme={navTheme}
        onReady={trackCurrentScreen}
        onStateChange={trackCurrentScreen}
      >
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        {posthog ? (
          <PostHogProvider client={posthog} autocapture={false}>
            <PostHogErrorBoundary
              fallback={<View style={{ flex: 1, backgroundColor: theme.colors.background }} />}
            >
              {navigator}
            </PostHogErrorBoundary>
          </PostHogProvider>
        ) : (
          navigator
        )}
      </NavigationContainer>
    </View>
  );
}

function AppNavigator({
  showWelcome,
  backgroundColor,
}: {
  showWelcome: boolean;
  backgroundColor: string;
}) {
  return (
    <Stack.Navigator
      initialRouteName={showWelcome ? "Welcome" : "Timeline"}
      screenOptions={{
        contentStyle: { backgroundColor },
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Welcome" component={Welcome} options={{ headerShown: false }} />
      <Stack.Screen name="Timeline" component={Timeline} options={{ headerShown: false }} />
      <Stack.Screen name="Day" component={Day} options={{ headerShown: false }} />
      <Stack.Screen name="Tag" component={Tag} options={{ headerShown: false }} />
      <Stack.Screen name="Compose" component={Compose} options={{ headerShown: false }} />
      <Stack.Screen
        name="Settings"
        component={Settings}
        options={{
          title: "Settings",
          headerBackTitle: "Back",
          headerShadowVisible: false,
        }}
      />
      {/* Settings categories — each pushes with the default back title
          ("Settings" on iOS, arrow on Android). */}
      <Stack.Screen
        name="SettingsProfile"
        component={SettingsProfile}
        options={{ title: "Profile", headerShadowVisible: false }}
      />
      <Stack.Screen
        name="SettingsAppearance"
        component={SettingsAppearance}
        options={{ title: "Appearance", headerShadowVisible: false }}
      />
      <Stack.Screen
        name="SettingsTheme"
        component={SettingsTheme}
        options={{ title: "Theme", headerShadowVisible: false }}
      />
      <Stack.Screen
        name="SettingsAccent"
        component={SettingsAccent}
        options={{ title: "Accent Color", headerShadowVisible: false }}
      />
      <Stack.Screen
        name="SettingsTypography"
        component={SettingsTypography}
        options={{ title: "Typography", headerShadowVisible: false }}
      />
      <Stack.Screen
        name="SettingsTimeline"
        component={SettingsTimeline}
        options={{ title: "Timeline & Editor", headerShadowVisible: false }}
      />
      <Stack.Screen
        name="SettingsAccessibility"
        component={SettingsAccessibility}
        options={{ title: "Accessibility", headerShadowVisible: false }}
      />
      <Stack.Screen
        name="SettingsPrivacy"
        component={SettingsPrivacy}
        options={{ title: "Privacy & Data", headerShadowVisible: false }}
      />
      <Stack.Screen
        name="SettingsAbout"
        component={SettingsAbout}
        options={{ title: "About", headerShadowVisible: false }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  const {
    ready,
    preferences,
    backgroundColor,
    userName,
    onboardingCompleted,
    databaseUnavailable,
  } = useAppBootstrap();
  // Welcome shows only when onboarding was never finished or skipped.
  const showWelcome = !userName && !onboardingCompleted;

  return (
    <SafeAreaProvider>
      <BootstrapGate
        ready={ready}
        databaseUnavailable={databaseUnavailable}
        backgroundColor={backgroundColor}
      >
        <Layout>
          <AppProviders initialPreferences={preferences}>
            {databaseUnavailable ? (
              <DatabaseUnavailable />
            ) : (
              <ProfileProvider initialName={userName}>
                <AudioProvider>
                  <AppLockGate>
                    <AppContent showWelcome={showWelcome} />
                  </AppLockGate>
                </AudioProvider>
              </ProfileProvider>
            )}
          </AppProviders>
        </Layout>
      </BootstrapGate>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  unavailable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xxxl,
    gap: space.md,
  },
  centered: { textAlign: "center" },
});
