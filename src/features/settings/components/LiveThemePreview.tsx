import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import { useEntryPreferences, useTheme } from "@/theme";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { ThemedText } from "@/shared/components/ThemedText";
import { TimelineRail } from "@/features/timeline/components/TimelineRail";

// Stable mock timestamp for predictable preview rendering (e.g. 15th of the month)
const MOCK_DAY_TS = 1715767200000;

export function LiveThemePreview() {
  const { theme, isDark } = useTheme();
  const { showTimestamp, showLocation } = useEntryPreferences();
  const { colors, atmosphere, typography } = theme;

  const hasAtmosphere = atmosphere !== "off";
  const gradientColors: [string, string, ...string[]] =
    atmosphere === "soft"
      ? isDark
        ? ["rgba(255, 255, 255, 0.03)", "rgba(0, 0, 0, 0.12)"]
        : ["rgba(255, 255, 255, 0.08)", "rgba(0, 0, 0, 0.02)"]
      : atmosphere === "muted"
        ? isDark
          ? ["rgba(0, 0, 0, 0.15)", "rgba(0, 0, 0, 0.3)"]
          : ["rgba(0, 0, 0, 0.03)", "rgba(0, 0, 0, 0.06)"]
        : ["transparent", "transparent"];

  return (
    <View
      style={[
        styles.outerContainer,
        {
          backgroundColor: colors.background,
          borderColor: colors.separator,
        },
      ]}
      accessibilityLabel="Live theme preview showing feed appearance"
    >
      {hasAtmosphere ? (
        <LinearGradient
          colors={gradientColors}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}

      <View style={styles.feedPreview}>
        {/* Entry 1: Uses actual TimelineRail with date marker */}
        <TimelineRail
          dayTs={MOCK_DAY_TS}
          showDate={true}
          isFirst={true}
          isLast={false}
        >
          <View style={styles.headerRow}>
            <View style={styles.meta}>
              {showTimestamp ? (
                <ThemedText
                  weight="medium"
                  style={[styles.metaText, { color: colors.textSecondary }]}
                >
                  10:42 AM
                </ThemedText>
              ) : null}
              {showTimestamp && showLocation ? (
                <ThemedText style={[styles.metaDot, { color: colors.textTertiary }]}>
                  ·
                </ThemedText>
              ) : null}
              {showLocation ? (
                <ThemedText
                  style={[styles.locationText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  Kyoto, Japan
                </ThemedText>
              ) : null}
            </View>

            <Feather name="more-vertical" size={16} color={colors.textTertiary} />
          </View>

          <ThemedText style={[typography.entryText, { color: colors.text }]}>
            Morning light filters through paper shoji screens. Quiet tea before writing.
          </ThemedText>
        </TimelineRail>

        {/* Entry 2: Connected on the same day with sub-marker dot */}
        <TimelineRail
          dayTs={MOCK_DAY_TS}
          showDate={false}
          isFirst={false}
          isLast={true}
        >
          <View style={styles.headerRow}>
            <View style={styles.meta}>
              {showTimestamp ? (
                <ThemedText
                  weight="medium"
                  style={[styles.metaText, { color: colors.textSecondary }]}
                >
                  03:15 PM
                </ThemedText>
              ) : null}
              {showTimestamp && showLocation ? (
                <ThemedText style={[styles.metaDot, { color: colors.textTertiary }]}>
                  ·
                </ThemedText>
              ) : null}
              {showLocation ? (
                <ThemedText
                  style={[styles.locationText, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  Kamo River
                </ThemedText>
              ) : null}
            </View>

            <Feather name="more-vertical" size={16} color={colors.textTertiary} />
          </View>

          <ThemedText style={[typography.entryText, { color: colors.text }]}>
            Walking along the riverbank as cherry blossoms drift across the water.
          </ThemedText>
        </TimelineRail>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    paddingVertical: space.md,
    paddingLeft: space.md,
    paddingRight: space.lg,
  },
  feedPreview: {
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.xs + 2,
    minHeight: 28,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: space.sm,
    gap: space.xs + 2,
  },
  metaText: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  metaDot: {
    fontSize: 12,
    lineHeight: 16,
  },
  locationText: {
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
});
