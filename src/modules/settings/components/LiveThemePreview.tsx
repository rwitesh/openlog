import { Feather } from "@expo/vector-icons";
import { Image, StyleSheet, View } from "react-native";
import { TimelineRail } from "@/modules/timeline/components/TimelineRail";
import { ThemedText } from "@/shared/components/ThemedText";
import { radius, space, useEntryPreferences, useTheme } from "@/theme";

// Stable mock timestamp for predictable preview rendering (15th of the month).
const MOCK_DAY_TS = 1715767200000;

/**
 * Live timeline preview — two mock entries rendered through the REAL
 * TimelineRail, so every appearance preference (theme colors, timeline
 * style & density, timestamp/location details, typography, background)
 * is reflected instantly while editing. Fixed height keeps the layout
 * stable when density toggles change content height.
 */
export function LiveThemePreview() {
  const { theme } = useTheme();
  const { showTimestamp, showLocation } = useEntryPreferences();
  const { colors, typography, backgroundConfig } = theme;

  const hasBackground = Boolean(backgroundConfig?.imageUri);

  return (
    <View
      style={[
        styles.outerContainer,
        { backgroundColor: colors.background, borderColor: colors.separator },
      ]}
      accessibilityLabel="Live preview of timeline appearance"
    >
      {/* Background image layer — mirrors App.tsx treatment exactly. */}
      {hasBackground && backgroundConfig?.imageSource ? (
        <Image
          source={backgroundConfig.imageSource}
          style={[StyleSheet.absoluteFill, { opacity: backgroundConfig.opacity ?? 0.35 }]}
          resizeMode="cover"
        />
      ) : null}

      <View style={styles.feedPreview}>
        {/* Entry 1: opens the day with the date marker. */}
        <TimelineRail dayTs={MOCK_DAY_TS} showDate isFirst={false} isLast={false}>
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
                <ThemedText style={[styles.metaDot, { color: colors.textTertiary }]}>·</ThemedText>
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
            Morning light filters through paper screens. Quiet tea before writing.
          </ThemedText>
        </TimelineRail>

        {/* Entry 2: same day, connected by the sub-marker dot. */}
        <TimelineRail dayTs={MOCK_DAY_TS} showDate={false} isFirst={false} isLast>
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
                <ThemedText style={[styles.metaDot, { color: colors.textTertiary }]}>·</ThemedText>
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
            Walking along the riverbank as blossoms drift across the water.
          </ThemedText>
        </TimelineRail>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    height: 232,
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
