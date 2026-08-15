import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { MOOD_PRESETS } from "@/theme/preferences";
import { usePreferences, useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { typography } from "@/theme/typography";
import { ThemedText } from "@/shared/components/ThemedText";

export function MoodPicker() {
  const { theme } = useTheme();
  const { activeMoodId, applyMood } = usePreferences();
  const { colors } = theme;

  const isCustom = activeMoodId === "custom";

  return (
    <View style={styles.grid}>
      {MOOD_PRESETS.map((preset) => {
        const isSelected = activeMoodId === preset.id;

        return (
          <Pressable
            key={preset.id}
            onPress={() => applyMood(preset.id)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: isSelected ? colors.surfaceMuted : colors.surface,
                borderColor: isSelected ? colors.marker : colors.separator,
              },
              pressed && press,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${preset.name}: ${preset.tagline}`}
            accessibilityState={{ selected: isSelected }}
          >
            <View style={styles.cardHeader}>
              <ThemedText weight={isSelected ? "semibold" : "medium"} style={styles.title}>
                {preset.name}
              </ThemedText>
              {isSelected ? (
                <Feather name="check" size={14} color={colors.marker} />
              ) : null}
            </View>
            <ThemedText
              style={[styles.tagline, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {preset.tagline}
            </ThemedText>
          </Pressable>
        );
      })}

      {/* Custom Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: isCustom ? colors.surfaceMuted : colors.surface,
            borderColor: isCustom ? colors.marker : colors.separator,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <ThemedText weight={isCustom ? "semibold" : "medium"} style={styles.title}>
            Custom
          </ThemedText>
          {isCustom ? (
            <Feather name="check" size={14} color={colors.marker} />
          ) : null}
        </View>
        <ThemedText
          style={[styles.tagline, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          Personalized
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.sm,
    marginBottom: space.sm,
  },
  card: {
    width: "48%",
    flexGrow: 1,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 14,
    lineHeight: 18,
  },
  tagline: {
    fontSize: typography.caption.fontSize,
    lineHeight: 16,
  },
});
