import { Image, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { type NativeStackScreenProps } from "@react-navigation/native-stack";

import { ACCENT_OPTIONS } from "@/theme/colors";
import { usePreferences, useTheme } from "@/theme";
import {
  KIZUNA_BACKGROUNDS,
  SettingsGroup,
  SettingsRow,
  SettingsScreenScroll,
  confirmDestructive,
} from "@/modules/settings";
import type { RootStackParamList } from "@/navigation/types";
import { ThemedText } from "@/shared/components/ThemedText";
import { DEFAULT_FONT_FAMILY } from "@/theme/typography";

type Props = NativeStackScreenProps<RootStackParamList, "SettingsAppearance">;

/**
 * Appearance category — a sub-hub; every row pushes a dedicated editor
 * screen that pairs the live timeline preview with one concern.
 */
export function AppearanceSettingsScreen({ navigation }: Props) {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { preferences, resetAppearanceDefaults } = usePreferences();
  const { appearance, entry } = preferences;

  const activeFont = appearance.fontFamily || DEFAULT_FONT_FAMILY;
  const currentAccent =
    ACCENT_OPTIONS.find((a) => a.id === appearance.accent) ?? ACCENT_OPTIONS[0];
  const accentColor = isDark ? currentAccent.colorDark : currentAccent.colorLight;
  const matchedBackground = KIZUNA_BACKGROUNDS.find(
    (p) => p.uri === appearance.backgroundImageUri
  );

  const themeSummary =
    appearance.mode === "light"
      ? "Light · Gallery White"
      : appearance.mode === "dark"
      ? "Dark · Charcoal Black"
      : "System";
  const timelineSummary = `${
    entry.timelineStyle.charAt(0).toUpperCase() + entry.timelineStyle.slice(1)
  } · ${entry.timelineDensity === "comfortable" ? "Comfortable" : "Compact"}`;
  const backgroundSummary = appearance.backgroundImageUri
    ? `${matchedBackground ? matchedBackground.name : "Custom"} · ${Math.round(
        (appearance.backgroundImageOpacity ?? 0.35) * 100
      )}%`
    : "None";

  const handleReset = () =>
    confirmDestructive(
      "Reset Appearance?",
      "This will restore Kizuna's default theme, background, accent, and typography back to their canonical defaults.",
      "Reset to Defaults",
      async () => resetAppearanceDefaults()
    );

  return (
    <SettingsScreenScroll>
      <SettingsGroup>
        <SettingsRow
          icon={isDark ? "moon" : "sun"}
          title="Theme"
          subtitle={themeSummary}
          onPress={() => navigation.navigate("SettingsTheme")}
        />

        <SettingsRow
          icon="droplet"
          title="Accent"
          subtitle={currentAccent.label}
          onPress={() => navigation.navigate("SettingsAccent")}
          badge={
            <View
              style={[
                styles.accentSwatch,
                { backgroundColor: accentColor, borderColor: colors.separator },
              ]}
            />
          }
        />

        <SettingsRow
          icon="type"
          title="Typography"
          subtitle={activeFont}
          onPress={() => navigation.navigate("SettingsTypography")}
          badge={
            <View
              style={[
                styles.glyphWrap,
                { backgroundColor: colors.surface, borderColor: colors.separator },
              ]}
            >
              <ThemedText weight="semibold" style={[styles.glyphText, { color: colors.text }]}>
                Aa
              </ThemedText>
            </View>
          }
        />

        <SettingsRow
          icon="sliders"
          title="Timeline / Editor"
          subtitle={timelineSummary}
          onPress={() => navigation.navigate("SettingsTimeline")}
        />

        <SettingsRow
          icon="image"
          title="Background"
          subtitle={backgroundSummary}
          onPress={() => navigation.navigate("SettingsBackground")}
          badge={
            appearance.backgroundImageUri ? (
              <View style={[styles.thumbnailWrap, { borderColor: colors.separator }]}>
                <Image
                  source={{ uri: appearance.backgroundImageUri }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View
                style={[
                  styles.addIconWrap,
                  { backgroundColor: colors.surface, borderColor: colors.separator },
                ]}
              >
                <Feather name="plus" size={13} color={colors.textSecondary} />
              </View>
            )
          }
        />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow
          icon="rotate-ccw"
          title="Reset Appearance"
          subtitle="Restore default theme & typography"
          onPress={handleReset}
          showChevron={false}
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
  glyphWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  glyphText: {
    fontSize: 12,
    lineHeight: 16,
  },
  thumbnailWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  addIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
