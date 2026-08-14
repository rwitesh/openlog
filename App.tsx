import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { NavigationContainer, type Theme as NavTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ThemeProvider } from "@/theme/ThemeProvider";
import { useTheme } from "@/theme/ThemeProvider";
import { useAppBootstrap } from "@/hooks/useAppBootstrap";
import { FONT } from "@/theme/typography";
import type { ThemeColors } from "@/theme/colors";
import type { RootStackParamList } from "@/types/navigation";
import { Timeline } from "@/screens/timeline";
import { Day } from "@/screens/day";
import { Compose } from "@/screens/compose";
import { Settings } from "@/screens/settings";
import { Layout } from "@/layout";
import { logDevWarning } from "@/lib";

SplashScreen.preventAutoHideAsync().catch((error) => {
  logDevWarning("startup:preventAutoHideAsync", error);
});

const Stack = createNativeStackNavigator<RootStackParamList>();

function makeNavTheme(mode: "light" | "dark", colors: ThemeColors): NavTheme {
  return {
    dark: mode === "dark",
    fonts: {
      regular: { fontFamily: FONT.regular, fontWeight: "400" },
      medium: { fontFamily: FONT.medium, fontWeight: "500" },
      bold: { fontFamily: FONT.semibold, fontWeight: "600" },
      heavy: { fontFamily: FONT.semibold, fontWeight: "600" },
    },
    colors: {
      primary: colors.text,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.separator,
      notification: colors.destructive,
    },
  };
}

function AppContent() {
  const { theme, resolvedMode } = useTheme();

  return (
    <NavigationContainer theme={makeNavTheme(resolvedMode, theme.colors)}>
       <StatusBar style={resolvedMode === "dark" ? "light" : "dark"} />
       <Stack.Navigator
         screenOptions={{
           contentStyle: { backgroundColor: theme.colors.background },
           animation: "slide_from_right",
         }}
       >
         <Stack.Screen
           name="Timeline"
           component={Timeline}
           options={{ headerShown: false }}
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
       </Stack.Navigator>
      </NavigationContainer>
  );
}

export default function App() {
  const { ready, themeMode, backgroundColor } = useAppBootstrap();

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor }} />;
  }

  return (
    <SafeAreaProvider>
      <Layout>
        <ThemeProvider initialMode={themeMode}>
          <AppContent />
        </ThemeProvider>
      </Layout>
    </SafeAreaProvider>
  );
}
