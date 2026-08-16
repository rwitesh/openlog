import { StyleSheet, View } from "react-native";

import { usePreferences, useTheme } from "@/theme";
import type { EditorTextSize, TimelineDensity, TimelineStyle } from "@/theme/types";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { ThemedText } from "@/shared/components/ThemedText";
import { SettingsBottomSheet } from "./SettingsBottomSheet";
import { SegmentedRow } from "./SegmentedRow";
import { ToggleRow } from "./ToggleRow";

interface TimelineEditorModalProps {
  visible: boolean;
  onClose: () => void;
}

export function TimelineEditorModal({ visible, onClose }: TimelineEditorModalProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  const { preferences, setEntry, setWriting } = usePreferences();
  const { entry, writing } = preferences;

  return (
    <SettingsBottomSheet
      visible={visible}
      onClose={onClose}
      title="Timeline & Editor"
    >
      <View style={styles.container}>
        {/* Timeline Style */}
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

        {/* Density */}
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

        {/* Metadata Details */}
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

        {/* Writing / Editor */}
        <View style={styles.section}>
          <ThemedText weight="medium" style={[styles.sectionHeading, { color: colors.textSecondary }]}>
            EDITOR FONT SIZE
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
      </View>
    </SettingsBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
    paddingBottom: space.sm,
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
