import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import {
  ACCENT_OPTIONS,
  THEME_OPTIONS,
} from "@/theme/colors";
import type { ThemeMode } from "@/theme/types";
import { usePreferences, useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { typography, type FontChoice, type TextSize } from "@/theme/typography";
import type {
  AtmosphereIntensity,
  EditorTextSize,
  TimelineDensity,
  TimelineStyle,
} from "@/theme/preferences";
import {
  LiveThemePreview,
  SegmentedRow,
  ThemeCard,
  ToggleRow,
} from "@/features/settings";
import { ThemedText } from "@/shared/components/ThemedText";

type ThemeCategoryFilter = "all" | "quiet" | "expressive";

export function AppearanceScreen() {
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const { colors } = theme;
  const {
    preferences,
    setAppearance,
    setEntry,
    setWriting,
    resetAppearanceDefaults,
  } = usePreferences();

  const [categoryFilter, setCategoryFilter] = useState<ThemeCategoryFilter>("all");

  const { appearance, entry, writing } = preferences;

  const currentAccent =
    ACCENT_OPTIONS.find((a) => a.id === appearance.accent) ?? ACCENT_OPTIONS[0];

  const filteredThemes =
    categoryFilter === "all"
      ? THEME_OPTIONS
      : THEME_OPTIONS.filter((t) => t.category === categoryFilter);

  const handleReset = () => {
    Alert.alert(
      "Reset Appearance?",
      "This will reset all theme palettes, typography, and timeline settings back to their default values.",
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
      <View
        style={[
          styles.stickyPreviewContainer,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.separator,
          },
        ]}
      >
        <ThemedText weight="medium" style={[styles.previewSectionTitle, { color: colors.textSecondary }]}>
          LIVE PREVIEW
        </ThemedText>
        <LiveThemePreview />
      </View>

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
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <ThemedText weight="medium" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              THEME PALETTE
            </ThemedText>
            <View style={styles.filterTabs}>
              {(["all", "quiet", "expressive"] as ThemeCategoryFilter[]).map((cat) => {
                const isSelected = categoryFilter === cat;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => setCategoryFilter(cat)}
                    style={({ pressed }) => [
                      styles.filterTab,
                      isSelected && { backgroundColor: colors.surfaceMuted },
                      pressed && press,
                    ]}
                    accessibilityRole="button"
                  >
                    <ThemedText
                      weight={isSelected ? "medium" : "regular"}
                      style={[
                        styles.filterTabText,
                        { color: isSelected ? colors.text : colors.textTertiary },
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <FlatList
            horizontal
            data={filteredThemes}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.themeList}
            renderItem={({ item }) => (
              <ThemeCard
                option={item}
                isSelected={appearance.palette === item.id}
                onSelect={() => setAppearance({ palette: item.id })}
              />
            )}
          />
        </View>

        <View style={styles.section}>
          <ThemedText weight="medium" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            APPEARANCE MODE
          </ThemedText>
        <SegmentedRow<ThemeMode>
          items={[
            { id: "light", label: "Light" },
            { id: "dark", label: "Dark" },
            { id: "system", label: "System" },
          ]}
          selected={appearance.mode}
          onSelect={(m) => setAppearance({ mode: m })}
        />
      </View>
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText weight="medium" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ACCENT COLOR
          </ThemedText>
          <ThemedText style={[styles.accentLabel, { color: colors.textSecondary }]}>
            {currentAccent.label}
          </ThemedText>
        </View>

        <View style={styles.accentsGrid}>
          {ACCENT_OPTIONS.map((item) => {
            const isSelected = appearance.accent === item.id;
            const color = mode === "dark" ? item.colorDark : item.colorLight;
            const isDefault = item.id === "default";

            return (
              <Pressable
                key={item.id}
                onPress={() => setAppearance({ accent: item.id })}
                hitSlop={{ top: 6, bottom: 6, left: 3, right: 3 }}
                style={({ pressed }) => [
                  styles.accentDotWrap,
                  isSelected && {
                    borderColor: color,
                    transform: [{ scale: 1.08 }],
                  },
                  pressed && press,
                ]}
                accessibilityLabel={`Accent color ${item.label}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View
                  style={[
                    styles.accentDot,
                    {
                      backgroundColor: color,
                      borderWidth: isDefault ? 1 : 0,
                      borderColor: colors.separator,
                    },
                  ]}
                >
                  {isSelected ? (
                    <Feather
                      name="check"
                      size={12}
                      color={mode === "dark" ? "#141311" : "#FAF7F0"}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText weight="medium" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          ATMOSPHERE GRADIENT
        </ThemedText>
        <SegmentedRow<AtmosphereIntensity>
          items={[
            { id: "soft", label: "Soft" },
            { id: "muted", label: "Muted" },
            { id: "off", label: "Off" },
          ]}
          selected={appearance.atmosphere}
          onSelect={(a) => setAppearance({ atmosphere: a })}
        />
      </View>

      <View style={styles.section}>
        <ThemedText weight="medium" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          TYPOGRAPHY
        </ThemedText>

        <View style={styles.fontRow}>
          {([
            { id: "sans" as FontChoice, name: "Clean Sans", preview: "Source Sans 3 · Modern clarity" },
            { id: "serif" as FontChoice, name: "Literary Serif", preview: "Editorial Serif · Classic warmth" },
          ]).map((font) => {
            const isSelected = appearance.fontChoice === font.id;
            return (
              <Pressable
                key={font.id}
                onPress={() => setAppearance({ fontChoice: font.id })}
                style={({ pressed }) => [
                  styles.fontCard,
                  {
                    backgroundColor: isSelected ? colors.surface : colors.surfaceMuted,
                    borderColor: isSelected ? colors.marker : colors.separator,
                    borderWidth: isSelected ? 2 : StyleSheet.hairlineWidth,
                  },
                  pressed && press,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.fontCardHeader}>
                  <ThemedText
                    weight={isSelected ? "semibold" : "medium"}
                    style={[
                      styles.fontName,
                      font.id === "serif" && { fontFamily: "Georgia" },
                      { color: isSelected ? colors.text : colors.textSecondary },
                    ]}
                  >
                    {font.name}
                  </ThemedText>
                  {isSelected ? (
                    <Feather name="check" size={14} color={colors.marker} />
                  ) : null}
                </View>
                <ThemedText
                  style={[
                    styles.fontPreviewText,
                    font.id === "serif" && { fontFamily: "Georgia" },
                    { color: colors.textSecondary },
                  ]}
                >
                  Aa Bb Gg 123
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.subItem}>
          <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
            TEXT SCALE
          </ThemedText>
          <SegmentedRow<TextSize>
            items={[
              { id: "compact", label: "Compact" },
              { id: "regular", label: "Regular" },
              { id: "generous", label: "Generous" },
            ]}
            selected={appearance.textSize}
            onSelect={(t) => setAppearance({ textSize: t })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText weight="medium" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          TIMELINE
        </ThemedText>

        <SegmentedRow<TimelineStyle>
          items={[
            { id: "rail", label: "Rail" },
            { id: "minimal", label: "Minimal" },
            { id: "clean", label: "Clean" },
          ]}
          selected={entry.timelineStyle}
          onSelect={(timelineStyle) => setEntry({ timelineStyle })}
        />

        <View style={styles.subItem}>
          <ThemedText weight="medium" style={[styles.subheading, { color: colors.textSecondary }]}>
            DENSITY
          </ThemedText>
          <SegmentedRow<TimelineDensity>
            items={[
              { id: "comfortable", label: "Comfortable" },
              { id: "compact", label: "Compact" },
            ]}
            selected={entry.timelineDensity}
            onSelect={(timelineDensity) => setEntry({ timelineDensity })}
          />
        </View>

        <View style={[styles.cardGroup, { backgroundColor: colors.surfaceMuted }]}>
          <ToggleRow
            label="Timestamps"
            value={entry.showTimestamp}
            onValueChange={(showTimestamp) => setEntry({ showTimestamp })}
          />
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          <ToggleRow
            label="Location"
            value={entry.showLocation}
            onValueChange={(showLocation) => setEntry({ showLocation })}
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText weight="medium" style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          WRITING / EDITOR
        </ThemedText>
        <SegmentedRow<EditorTextSize>
          items={[
            { id: "regular", label: "Standard" },
            { id: "large", label: "Large" },
          ]}
          selected={writing.editorTextSize}
          onSelect={(editorTextSize) => setWriting({ editorTextSize })}
        />
      </View>

      <View style={styles.resetSection}>
        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [
            styles.resetButton,
            { borderColor: colors.separator },
            pressed && press,
          ]}
          accessibilityRole="button"
        >
          <Feather name="rotate-ccw" size={14} color={colors.textSecondary} />
          <ThemedText
            weight="medium"
            style={[styles.resetButtonText, { color: colors.textSecondary }]}
          >
            Reset to Defaults
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
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
  previewSectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: space.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: space.lg,
  },
  section: {
    marginBottom: space.xl,
    gap: space.xs + 2,
  },
  sectionTitle: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  filterTabs: {
    flexDirection: "row",
    gap: 4,
  },
  filterTab: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  filterTabText: {
    fontSize: 11,
    lineHeight: 14,
  },
  themeList: {
    gap: space.sm,
    paddingVertical: space.xs,
  },
  accentLabel: {
    fontSize: 12,
    lineHeight: 16,
  },
  accentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.xs + 2,
    paddingVertical: space.xs,
  },
  accentDotWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  accentDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  fontRow: {
    flexDirection: "row",
    gap: space.sm,
  },
  fontCard: {
    flex: 1,
    padding: space.md,
    borderRadius: radius.md,
    gap: space.xs,
  },
  fontCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fontName: {
    fontSize: 14,
    lineHeight: 18,
  },
  fontPreviewText: {
    fontSize: 12,
    lineHeight: 16,
  },
  subItem: {
    marginTop: space.sm,
    gap: space.xs,
  },
  subheading: {
    fontSize: 11,
    letterSpacing: 0.6,
  },
  cardGroup: {
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    marginTop: space.sm,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  resetSection: {
    marginTop: space.lg,
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
