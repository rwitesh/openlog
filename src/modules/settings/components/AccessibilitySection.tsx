import { StyleSheet, View } from "react-native";

import { usePreferences, useTheme } from "@/theme";
import type { MotionLevel } from "@/theme/motion";
import { space } from "@/theme/spacing";
import { ThemedText } from "@/shared/components/ThemedText";
import { SegmentedRow } from "../core/SegmentedRow";

/** Accessibility editor. Haptics or font-scaling options would slot in beside animation level. */
export function AccessibilitySection() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { preferences, setAccessibility } = usePreferences();
  const { accessibility } = preferences;

  return (
    <View style={styles.container}>
      <ThemedText weight="medium" style={[styles.heading, { color: colors.textSecondary }]}>
        ANIMATION LEVEL
      </ThemedText>
      <SegmentedRow<MotionLevel>
        items={[
          { id: "full", label: "Full" },
          { id: "subtle", label: "Subtle" },
          { id: "reduced", label: "Reduced" },
        ]}
        selected={accessibility.motionLevel}
        onSelect={(motionLevel) => setAccessibility({ motionLevel })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.sm,
  },
  heading: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
});
