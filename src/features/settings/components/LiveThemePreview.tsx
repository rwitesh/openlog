import { StyleSheet, View } from "react-native";
import { useJournalPreferences, useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { ThemedText } from "@/shared/components/ThemedText";

export function LiveThemePreview() {
  const { theme } = useTheme();
  const { timelineStyle, timelineDensity, showTimestamp, showLocation } =
    useJournalPreferences();
  const { colors } = theme;

  const showLine = timelineStyle !== "clean";
  const isMinimal = timelineStyle === "minimal";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.separator,
          paddingVertical: timelineDensity === "compact" ? space.sm : space.md,
        },
      ]}
    >
      <View style={styles.gutter}>
        {showLine ? (
          <View
            style={[
              styles.line,
              {
                backgroundColor: colors.line,
                opacity: isMinimal ? 0.35 : 1,
              },
            ]}
          />
        ) : null}

        <View
          style={[
            styles.marker,
            {
              backgroundColor: timelineStyle === "clean" ? colors.surfaceMuted : colors.marker,
              borderColor: timelineStyle === "clean" ? colors.separator : colors.marker,
              borderWidth: timelineStyle === "clean" ? StyleSheet.hairlineWidth : 0,
            },
          ]}
        >
          <ThemedText
            weight="semibold"
            style={[
              styles.markerNum,
              { color: timelineStyle === "clean" ? colors.text : colors.background },
            ]}
          >
            15
          </ThemedText>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.metaRow}>
          {showTimestamp ? (
            <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
              10:42 AM
            </ThemedText>
          ) : null}
          {showTimestamp && showLocation ? (
            <ThemedText style={[styles.metaDot, { color: colors.textTertiary }]}>·</ThemedText>
          ) : null}
          {showLocation ? (
            <ThemedText style={[styles.metaText, { color: colors.textSecondary }]}>
              Kyoto
            </ThemedText>
          ) : null}
        </View>

        <ThemedText style={[theme.typography.entryText, { color: colors.text }]}>
          Morning light through paper shoji screens. Quiet tea before writing.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: space.lg,
  },
  gutter: {
    width: 24,
    alignItems: "center",
    marginRight: space.sm,
  },
  line: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 11,
    width: 1,
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  markerNum: {
    fontSize: 11,
    lineHeight: 14,
  },
  content: {
    flex: 1,
    gap: space.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  metaText: {
    fontSize: 11,
    lineHeight: 14,
  },
  metaDot: {
    fontSize: 11,
    lineHeight: 14,
  },
});
