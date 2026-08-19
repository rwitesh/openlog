import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ACCENT_OPTIONS } from "@/theme/colors";
import { usePreferences, useTheme } from "@/theme";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { ThemedText } from "@/shared/components/ThemedText";

/** Accent picker: swatch grid, applied instantly across the whole screen. */
export function AccentSection() {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { preferences, setAppearance } = usePreferences();
  const currentAccentId = preferences.appearance.accent;

  return (
    <View style={styles.grid}>
      {ACCENT_OPTIONS.map((item) => {
        const isSelected = currentAccentId === item.id;
        const color = isDark ? item.colorDark : item.colorLight;
        const isDefault = item.id === "default";

        return (
          <Pressable
            key={item.id}
            onPress={() => setAppearance({ accent: item.id })}
            style={({ pressed }) => [
              styles.accentCard,
              {
                backgroundColor: isSelected ? colors.surface : colors.surfaceMuted,
                borderColor: isSelected ? color : colors.separator,
              },
              isSelected && styles.accentCardSelected,
              pressed && press,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`Accent color ${item.label}`}
          >
            <View style={styles.accentCardLeft}>
              <View
                style={[
                  styles.colorSwatch,
                  {
                    backgroundColor: color,
                    borderWidth: isDefault ? 1 : 0,
                    borderColor: colors.separator,
                  },
                ]}
              >
                {isSelected ? (
                  <Feather name="check" size={13} color={isDark ? "#121215" : "#FAF8F5"} />
                ) : null}
              </View>

              <ThemedText
                weight={isSelected ? "semibold" : "medium"}
                style={[styles.accentName, { color: colors.text }]}
              >
                {item.label}
              </ThemedText>
            </View>

            {isSelected ? (
              <View style={[styles.selectedIndicator, { backgroundColor: color }]} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: space.xs + 2,
    paddingBottom: space.xs,
  },
  accentCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  accentCardSelected: {
    borderWidth: 1.5,
  },
  accentCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md - 2,
    flex: 1,
  },
  colorSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  accentName: {
    fontSize: 14,
    lineHeight: 18,
  },
  selectedIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
