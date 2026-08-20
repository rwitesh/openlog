import { StyleSheet, View } from "react-native";
import { LiveThemePreview, SegmentedRow, SettingsEditorScreen } from "@/modules/settings";
import { ThemedText } from "@/shared/components/ThemedText";
import {
  type EditorTextSize,
  type MotionLevel,
  space,
  type TextSize,
  usePreferences,
  useTheme,
} from "@/theme";

/** Accessibility category — text sizing and motion, previewed live. */
export function AccessibilitySettingsScreen() {
  const { theme } = useTheme();
  const { colors } = theme;
  const { preferences, setAccessibility, setAppearance, setWriting } = usePreferences();
  const { accessibility, appearance, writing } = preferences;

  return (
    <SettingsEditorScreen preview={<LiveThemePreview />}>
      <View style={styles.container}>
        <View style={styles.field}>
          <ThemedText weight="medium" style={[styles.heading, { color: colors.textSecondary }]}>
            TEXT SIZE
          </ThemedText>
          <SegmentedRow<TextSize>
            items={[
              { id: "compact", label: "Compact" },
              { id: "regular", label: "Regular" },
              { id: "generous", label: "Generous" },
            ]}
            selected={appearance.textSize}
            onSelect={(textSize) => setAppearance({ textSize })}
          />
        </View>

        <View style={styles.field}>
          <ThemedText weight="medium" style={[styles.heading, { color: colors.textSecondary }]}>
            EDITOR TEXT SIZE
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

        <View style={styles.field}>
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
      </View>
    </SettingsEditorScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.lg,
  },
  field: {
    gap: space.sm,
  },
  heading: {
    fontSize: 11,
    letterSpacing: 0.8,
  },
});
