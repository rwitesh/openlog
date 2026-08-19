import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ACCENT_OPTIONS } from "@/theme/colors";
import { usePreferences, useTheme } from "@/theme";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { ThemedText } from "@/shared/components/ThemedText";
import {
  AccentPickerModal,
  AppearanceOverviewRow,
  BackgroundPickerModal,
  KIZUNA_BACKGROUNDS,
  LiveThemePreview,
  ThemeModal,
  TimelineEditorModal,
  TypographyModal,
} from "@/modules/settings";

type ActiveSheet =
  | "theme"
  | "background"
  | "accent"
  | "typography"
  | "timeline"
  | null;

export function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { preferences, resetAppearanceDefaults } = usePreferences();
  const { appearance, entry } = preferences;

  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);

  const activeFont = appearance.fontFamily || "Source Sans 3";
  const currentAccent =
    ACCENT_OPTIONS.find((a) => a.id === appearance.accent) ?? ACCENT_OPTIONS[0];
  const accentColor = isDark ? currentAccent.colorDark : currentAccent.colorLight;

  // Theme Label
  const themeLabel =
    appearance.mode === "light"
      ? "Light · Gallery White"
      : appearance.mode === "dark"
      ? "Dark · Charcoal Black"
      : "System";

  // Background Label
  const matchedPreset = KIZUNA_BACKGROUNDS.find(
    (p) => p.uri === appearance.backgroundImageUri
  );
  const backgroundLabel = appearance.backgroundImageUri
    ? matchedPreset
      ? matchedPreset.name
      : "My Photo"
    : "None";

  // Typography Label
  const typographyLabel = `${activeFont} · ${
    appearance.textSize.charAt(0).toUpperCase() + appearance.textSize.slice(1)
  }`;

  // Timeline Label
  const timelineLabel = `${
    entry.timelineStyle.charAt(0).toUpperCase() + entry.timelineStyle.slice(1)
  } · ${entry.timelineDensity === "comfortable" ? "Comfortable" : "Compact"}`;

  const handleReset = () => {
    Alert.alert(
      "Reset Appearance?",
      "This will restore Kizuna's default theme, background, accent, and typography back to their canonical defaults.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset to Defaults",
          style: "destructive",
          onPress: resetAppearanceDefaults,
        },
      ]
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Sticky Live Preview */}
      <View
        style={[
          styles.stickyPreviewContainer,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.separator,
          },
        ]}
      >
        <View style={styles.previewHeader}>
          <ThemedText weight="medium" style={[styles.previewSectionTitle, { color: colors.textSecondary }]}>
            LIVE PREVIEW
          </ThemedText>
        </View>
        <LiveThemePreview />
      </View>

      {/* Main Overview List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: space.md,
            paddingBottom: insets.bottom + space.xxxl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.listContainer}>
          {/* Row 1: Theme */}
          <AppearanceOverviewRow
            icon={isDark ? "moon" : "sun"}
            title="Theme"
            subtitle={themeLabel}
            onPress={() => setActiveSheet("theme")}
            badge={
              <View
                style={[
                  styles.textBadge,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.separator,
                  },
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

          {/* Row 2: Background */}
          <AppearanceOverviewRow
            icon="image"
            title="Background"
            subtitle={backgroundLabel}
            onPress={() => setActiveSheet("background")}
            badge={
              appearance.backgroundImageUri ? (
                <View
                  style={[
                    styles.thumbnailWrap,
                    { borderColor: colors.separator },
                  ]}
                >
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
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.separator,
                    },
                  ]}
                >
                  <Feather name="plus" size={13} color={colors.textSecondary} />
                </View>
              )
            }
          />

          {/* Row 3: Accent */}
          <AppearanceOverviewRow
            icon="droplet"
            title="Accent"
            subtitle={currentAccent.label}
            onPress={() => setActiveSheet("accent")}
            badge={
              <View
                style={[
                  styles.accentSwatch,
                  {
                    backgroundColor: accentColor,
                    borderColor: colors.separator,
                  },
                ]}
              />
            }
          />

          {/* Row 4: Typography */}
          <AppearanceOverviewRow
            icon="type"
            title="Typography"
            subtitle={typographyLabel}
            onPress={() => setActiveSheet("typography")}
            badge={
              <View
                style={[
                  styles.glyphWrap,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.separator,
                  },
                ]}
              >
                <ThemedText weight="semibold" style={[styles.glyphText, { color: colors.text }]}>
                  Aa
                </ThemedText>
              </View>
            }
          />

          {/* Row 5: Timeline / Editor */}
          <AppearanceOverviewRow
            icon="sliders"
            title="Timeline / Editor"
            subtitle={timelineLabel}
            onPress={() => setActiveSheet("timeline")}
          />
        </View>

        {/* Reset Button */}
        <View style={styles.resetSection}>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [
              styles.resetButton,
              {
                borderColor: colors.separator,
                backgroundColor: colors.surfaceMuted,
              },
              pressed && press,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Reset appearance to default settings"
          >
            <Feather name="rotate-ccw" size={14} color={colors.textSecondary} />
            <ThemedText
              weight="medium"
              style={[styles.resetButtonText, { color: colors.textSecondary }]}
            >
              Reset Appearance Defaults
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      {/* Dedicated Bottom Sheet Modals */}
      <ThemeModal
        visible={activeSheet === "theme"}
        onClose={() => setActiveSheet(null)}
      />

      <BackgroundPickerModal
        visible={activeSheet === "background"}
        onClose={() => setActiveSheet(null)}
      />

      <AccentPickerModal
        visible={activeSheet === "accent"}
        onClose={() => setActiveSheet(null)}
      />

      <TypographyModal
        visible={activeSheet === "typography"}
        onClose={() => setActiveSheet(null)}
      />

      <TimelineEditorModal
        visible={activeSheet === "timeline"}
        onClose={() => setActiveSheet(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  stickyPreviewContainer: {
    paddingHorizontal: space.lg,
    paddingTop: space.xs,
    paddingBottom: space.xs + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.xs,
  },
  previewSectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.lg,
    gap: space.lg,
  },
  listContainer: {
    gap: space.sm + 2,
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
  resetSection: {
    marginTop: space.sm,
    alignItems: "center",
    paddingVertical: space.md,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  resetButtonText: {
    fontSize: 13,
    lineHeight: 17,
  },
});
