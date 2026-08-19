import { useState } from "react";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ACCENT_OPTIONS } from "@/theme/colors";
import { usePreferences, useTheme } from "@/theme";
import { useProfile } from "@/modules/profile";
import {
  AccessibilitySection,
  AccentSection,
  BackgroundSection,
  DataSection,
  ProfileSection,
  PrivacySection,
  KIZUNA_BACKGROUNDS,
  SettingsGroup,
  SettingsRow,
  SettingsSheet,
  ThemeSection,
  TimelineSection,
  TypographySection,
  confirmDestructive,
} from "@/modules/settings";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { ThemedText } from "@/shared/components/ThemedText";

/**
 * Every editor on this screen opens the ONE shared bottom sheet. To add a
 * setting: create a section component, add an id to SettingsSheetId +
 * SHEET_META, render a SettingsRow, and mount the section below. Generic
 * building blocks live in `core/`; feature editors live in `components/`.
 */
type SettingsSheetId =
  | "profile"
  | "theme"
  | "accent"
  | "typography"
  | "timeline"
  | "background"
  | "accessibility"
  | "privacy"
  | "data";

const SHEET_META: Record<SettingsSheetId, { title: string; subtitle?: string }> = {
  profile: { title: "Profile", subtitle: "How Kizuna greets you" },
  theme: { title: "Theme" },
  accent: { title: "Accent Color" },
  typography: { title: "Typography" },
  timeline: { title: "Timeline & Editor" },
  background: { title: "Background" },
  accessibility: { title: "Accessibility" },
  privacy: { title: "Privacy & Security" },
  data: { title: "Data & Storage" },
};

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { preferences, resetAppearanceDefaults } = usePreferences();
  const { name } = useProfile();
  const { colors } = theme;

  const [activeSheet, setActiveSheet] = useState<SettingsSheetId | null>(null);

  const { appearance, entry, accessibility, security } = preferences;

  const activeFont = appearance.fontFamily || "Source Sans 3";
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
  const typographySummary = `${activeFont} · ${
    appearance.textSize.charAt(0).toUpperCase() + appearance.textSize.slice(1)
  }`;
  const timelineSummary = `${
    entry.timelineStyle.charAt(0).toUpperCase() + entry.timelineStyle.slice(1)
  } · ${entry.timelineDensity === "comfortable" ? "Comfortable" : "Compact"}`;
  const backgroundOpacityPct = Math.round(
    (appearance.backgroundImageOpacity ?? 0.35) * 100
  );
  const backgroundSummary = appearance.backgroundImageUri
    ? `${matchedBackground ? matchedBackground.name : "Custom"} · ${backgroundOpacityPct}%`
    : "None";
  const accessibilitySummary =
    accessibility.motionLevel === "full"
      ? "Full Motion"
      : accessibility.motionLevel === "reduced"
        ? "Reduced Motion"
        : "Subtle Motion";
  const privacySummary = security.biometricLock ? "App lock on" : "App lock off";
  const profileSummary = name?.trim() ? name.trim() : "Set your name";

  const handleReset = () =>
    confirmDestructive(
      "Reset Appearance?",
      "This will restore Kizuna's default theme, background, accent, and typography back to their canonical defaults.",
      "Reset to Defaults",
      async () => resetAppearanceDefaults()
    );

  return (
    <View style={styles.screen}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{
          paddingTop: space.md,
          paddingBottom: insets.bottom + space.xxxl,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SettingsGroup label="PROFILE">
          <SettingsRow
            icon="user"
            title="Profile"
            subtitle={profileSummary}
            onPress={() => setActiveSheet("profile")}
          />
        </SettingsGroup>

        <SettingsGroup label="APPEARANCE">
          <SettingsRow
            icon={isDark ? "moon" : "sun"}
            title="Theme"
            subtitle={themeSummary}
            onPress={() => setActiveSheet("theme")}
            badge={
              <View
                style={[
                  styles.textBadge,
                  { backgroundColor: colors.surface, borderColor: colors.separator },
                ]}
              >
                <ThemedText weight="medium" style={[styles.badgeText, { color: colors.text }]}>
                  {appearance.mode === "light"
                    ? "Light"
                    : appearance.mode === "dark"
                    ? "Dark"
                    : "System"}
                </ThemedText>
              </View>
            }
          />

          <SettingsRow
            icon="droplet"
            title="Accent"
            subtitle={currentAccent.label}
            onPress={() => setActiveSheet("accent")}
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
            subtitle={typographySummary}
            onPress={() => setActiveSheet("typography")}
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
            onPress={() => setActiveSheet("timeline")}
          />

          <SettingsRow
            icon="image"
            title="Background"
            subtitle={backgroundSummary}
            onPress={() => setActiveSheet("background")}
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

          <SettingsRow
            icon="rotate-ccw"
            title="Reset Appearance"
            subtitle="Restore default theme & typography"
            onPress={handleReset}
            showChevron={false}
          />
        </SettingsGroup>

        <SettingsGroup label="GENERAL">
          <SettingsRow
            icon="eye"
            title="Accessibility"
            subtitle={accessibilitySummary}
            onPress={() => setActiveSheet("accessibility")}
          />
        </SettingsGroup>

        <SettingsGroup label="PRIVACY & DATA">
          <SettingsRow
            icon="lock"
            title="Privacy & Security"
            subtitle={privacySummary}
            onPress={() => setActiveSheet("privacy")}
          />

          <SettingsRow
            icon="database"
            title="Data & Storage"
            subtitle="Storage & deletion"
            onPress={() => setActiveSheet("data")}
          />
        </SettingsGroup>
      </ScrollView>

      {/* The one shared sheet; row content swaps in and out. */}
      <SettingsSheet
        visible={activeSheet !== null}
        onClose={() => setActiveSheet(null)}
        title={activeSheet ? SHEET_META[activeSheet].title : ""}
        subtitle={activeSheet ? SHEET_META[activeSheet].subtitle : undefined}
      >
        {activeSheet === "profile" ? <ProfileSection /> : null}
        {activeSheet === "theme" ? <ThemeSection /> : null}
        {activeSheet === "accent" ? <AccentSection /> : null}
        {activeSheet === "typography" ? <TypographySection /> : null}
        {activeSheet === "timeline" ? <TimelineSection /> : null}
        {activeSheet === "background" ? <BackgroundSection /> : null}
        {activeSheet === "accessibility" ? <AccessibilitySection /> : null}
        {activeSheet === "privacy" ? <PrivacySection /> : null}
        {activeSheet === "data" ? <DataSection /> : null}
      </SettingsSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  textBadge: {
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 14,
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
});
