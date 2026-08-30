import { ClerkProvider, useUser } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { PostHogErrorBoundary, PostHogProvider } from "posthog-react-native";
import { type ReactNode, useEffect, useRef } from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { analytics } from "@/config/analytics";
import { clerkPublishableKey } from "@/config/clerk";
import { posthog } from "@/config/posthog";
import { AppLockGate } from "@/modules/auth";
import { ProfileProvider, useProfile } from "@/modules/profile";
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
import { Timeline } from "@/screens/timeline";
import { Welcome } from "@/screens/welcome";
import { Layout } from "@/shared/components";
import { useAppBootstrap } from "@/shared/hooks";
import { IS_EXPO_GO, logDevWarning } from "@/shared/utils";
import { AppProviders, useNavigationTheme, useTheme } from "@/theme";

/** Holds the splash screen until local bootstrap (fonts + preferences) finishes;
    Clerk connects in the background and Welcome handles its readiness itself. */
function BootstrapGate({
  ready,
  backgroundColor,
  children,
}: {
  ready: boolean;
  backgroundColor: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch((error) => logDevWarning("bootstrap:hideSplash", error));
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor }} />;
  return <>{children}</>;
}

/** Mirrors the Clerk first name into the local profile when none is set yet. */
function ClerkNameSync() {
  const { user, isLoaded } = useUser();
  const { name, setName } = useProfile();
  const clerkName =
    [user?.firstName, user?.lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") || null;

  useEffect(() => {
    if (isLoaded && clerkName && !name?.trim()) setName(clerkName);
  }, [isLoaded, clerkName, name, setName]);

  return null;
}

if (!IS_EXPO_GO) {
  SplashScreen.setOptions({ duration: 400, fade: true });
}
SplashScreen.preventAutoHideAsync().catch((error) => {
  logDevWarning("startup:preventAutoHideAsync", error);
});

const Stack = createNativeStackNavigator<RootStackParamList>();

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
        <ClerkNameSync />
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        {posthog ? (
          <PostHogProvider client={posthog} autocapture={{ captureScreens: false }}>
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
  const { ready, preferences, backgroundColor, userName, onboardingCompleted } = useAppBootstrap();
  // Welcome shows only when onboarding was never finished or skipped.
  const showWelcome = !userName && !onboardingCompleted;

  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
        <BootstrapGate ready={ready} backgroundColor={backgroundColor}>
          <Layout>
            <AppProviders initialPreferences={preferences}>
              <ProfileProvider initialName={userName}>
                <AppLockGate>
                  <AppContent showWelcome={showWelcome} />
                </AppLockGate>
              </ProfileProvider>
            </AppProviders>
          </Layout>
        </BootstrapGate>
      </ClerkProvider>
    </SafeAreaProvider>
  );
}
