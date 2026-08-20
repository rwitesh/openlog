import { StyleSheet, View } from "react-native";

import { usePreferences, useTheme } from "@/theme";
import type { TimelineDensity, TimelineStyle } from "@/theme/types";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { ThemedText } from "@/shared/components/ThemedText";
import { SegmentedRow } from "../core/SegmentedRow";
import { ToggleRow } from "../core/ToggleRow";

/** Timeline preferences: style, density, metadata details. */
export function TimelineSection() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { preferences, setEntry } = usePreferences();
  const { entry } = preferences;

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <ThemedText weight="medium" style={[styles.sectionHeading, { color: colors.textSecondary }]}>
          STYLE
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
      </View>

      <View style={styles.section}>
        <ThemedText weight="medium" style={[styles.sectionHeading, { color: colors.textSecondary }]}>
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

      <View style={styles.section}>
        <ThemedText weight="medium" style={[styles.sectionHeading, { color: colors.textSecondary }]}>
          DETAILS
        </ThemedText>
        <View style={[styles.cardGroup, { backgroundColor: colors.surfaceMuted }]}>
          <ToggleRow
            label="Show Timestamps"
            value={entry.showTimestamp}
            onValueChange={(showTimestamp) => setEntry({ showTimestamp })}
          />
          <View style={[styles.divider, { backgroundColor: colors.separator }]} />
          <ToggleRow
            label="Show Location Tag"
            value={entry.showLocation}
            onValueChange={(showLocation) => setEntry({ showLocation })}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
  section: {
    gap: space.xs + 2,
  },
  sectionHeading: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  cardGroup: {
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
