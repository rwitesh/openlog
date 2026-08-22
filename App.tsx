import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Image, StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppLockGate } from "@/modules/auth";
import { ProfileProvider } from "@/modules/profile";
import type { RootStackParamList } from "@/navigation";
import { Compose } from "@/screens/compose";
import { Day } from "@/screens/day";
import { Memory } from "@/screens/memory";
import {
  Settings,
  SettingsAbout,
  SettingsAccent,
  SettingsAccessibility,
  SettingsAppearance,
  SettingsBackground,
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
  const bgConfig = theme.backgroundConfig;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {/* Background Image Layer */}
      {bgConfig?.imageSource ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Image
            source={bgConfig.imageSource}
            style={[StyleSheet.absoluteFill, { opacity: bgConfig.opacity ?? 0.35 }]}
            resizeMode="cover"
          />
        </View>
      ) : null}
      <NavigationContainer theme={navTheme}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <Stack.Navigator
          initialRouteName={showWelcome ? "Welcome" : "Timeline"}
          screenOptions={{
            contentStyle: { backgroundColor: "transparent" },
            animation: "slide_from_right",
          }}
        >
          <Stack.Screen name="Welcome" component={Welcome} options={{ headerShown: false }} />
          <Stack.Screen name="Timeline" component={Timeline} options={{ headerShown: false }} />
          <Stack.Screen
            name="Memory"
            component={Memory}
            options={{
              headerShown: false,
              animation: "slide_from_right",
            }}
          />
          <Stack.Screen
            name="Day"
            component={Day}
            options={{
              headerBackTitle: "Back",
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen
            name="Compose"
            component={Compose}
            options={{
              headerBackTitle: "Back",
              headerShadowVisible: false,
              contentStyle: { flex: 1 },
            }}
          />
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
            name="SettingsBackground"
            component={SettingsBackground}
            options={{ title: "Background", headerShadowVisible: false }}
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
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  const { ready, preferences, backgroundColor, userName } = useAppBootstrap();

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor }} />;
  }

  return (
    <SafeAreaProvider>
      <Layout>
        <AppProviders initialPreferences={preferences}>
          <ProfileProvider initialName={userName}>
            <AppLockGate>
              <AppContent showWelcome={!userName} />
            </AppLockGate>
          </ProfileProvider>
        </AppProviders>
      </Layout>
    </SafeAreaProvider>
  );
}
