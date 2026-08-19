import { Image, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppProviders, useNavigationTheme, useTheme } from "@/theme";
import { ProfileProvider } from "@/modules/profile";
import { AppLockGate } from "@/modules/auth";
import { useAppBootstrap } from "@/shared/hooks";
import type { RootStackParamList } from "@/navigation";
import { Timeline } from "@/screens/timeline";
import { Memory } from "@/screens/memory";
import { Welcome } from "@/screens/welcome";
import { Day } from "@/screens/day";
import { Compose } from "@/screens/compose";
import { Settings, Appearance } from "@/screens/settings";
import { Layout } from "@/shared/components";
import { logDevWarning } from "@/shared/utils";

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
      {bgConfig?.imageUri ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Image
            source={{ uri: bgConfig.imageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: theme.colors.background,
                opacity: 0.35,
              },
            ]}
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
          <Stack.Screen
            name="Welcome"
            component={Welcome}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Timeline"
            component={Timeline}
            options={{ headerShown: false }}
          />
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
          <Stack.Screen
            name="Appearance"
            component={Appearance}
            options={{
              title: "Appearance",
              headerBackTitle: "Settings",
              headerShadowVisible: false,
            }}
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
