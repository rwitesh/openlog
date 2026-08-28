import { useAuth, useUser } from "@clerk/expo";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import { useProfile } from "@/modules/profile";
import { SettingsGroup, SettingsRow, SettingsScreenScroll } from "@/modules/settings";
import type { RootStackParamList } from "@/navigation/types";
import { AUTH_REQUIRED_FOR_ONBOARDING } from "@/shared/constants";
import { APP_VERSION } from "@/shared/utils";
import { ACCENT_OPTIONS, type ThemeMode, usePreferences, useTheme } from "@/theme";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

const THEME_LABELS: Record<ThemeMode, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

/**
 * Settings hub — deliberately short. One row per category; each pushes its
 * own screen (registered in App.tsx) so categories can grow without
 * lengthening this list. Category screens compose the section editors
 * from `modules/settings`; generic building blocks live in `core/`.
 */
export function SettingsScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const { preferences } = usePreferences();
  const { name } = useProfile();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { colors } = theme;
  const email = user?.primaryEmailAddress?.emailAddress;
  const signedIn = isLoaded && isSignedIn;

  const { appearance, security } = preferences;

  const accent = ACCENT_OPTIONS.find((a) => a.id === appearance.accent) ?? ACCENT_OPTIONS[0];
  const accentColor = isDark ? accent.colorDark : accent.colorLight;

  return (
    <SettingsScreenScroll>
      <SettingsGroup>
        <SettingsRow
          icon="user"
          title="Profile"
          subtitle={
            signedIn
              ? name?.trim() || email || "Account"
              : AUTH_REQUIRED_FOR_ONBOARDING
                ? "Log in or create an account"
                : "Your local profile"
          }
          onPress={() =>
            navigation.navigate(
              signedIn || !AUTH_REQUIRED_FOR_ONBOARDING ? "SettingsProfile" : "Welcome"
            )
          }
        />

        <SettingsRow
          icon="droplet"
          title="Appearance"
          subtitle={`${THEME_LABELS[appearance.mode]} · ${accent.label}`}
          badge={
            <View
              style={[
                styles.accentSwatch,
                { backgroundColor: accentColor, borderColor: colors.separator },
              ]}
            />
          }
          onPress={() => navigation.navigate("SettingsAppearance")}
        />

        <SettingsRow
          icon="eye"
          title="Accessibility"
          subtitle="Text size & animation level"
          onPress={() => navigation.navigate("SettingsAccessibility")}
        />

        <SettingsRow
          icon="lock"
          title="Privacy & Data"
          subtitle={security.biometricLock ? "App lock on" : "App lock off"}
          onPress={() => navigation.navigate("SettingsPrivacy")}
        />

        <SettingsRow
          icon="info"
          title="About"
          subtitle={APP_VERSION ? `Version ${APP_VERSION}` : "App info"}
          onPress={() => navigation.navigate("SettingsAbout")}
        />
      </SettingsGroup>
    </SettingsScreenScroll>
  );
}

const styles = StyleSheet.create({
  accentSwatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
