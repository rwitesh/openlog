import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ACCENT_OPTIONS } from "@/theme/colors";
import { usePreferences, useTheme } from "@/theme";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { ThemedText } from "@/shared/components/ThemedText";
import { SettingsBottomSheet } from "./SettingsBottomSheet";

interface AccentPickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AccentPickerModal({ visible, onClose }: AccentPickerModalProps) {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { preferences, setAppearance } = usePreferences();
  const { appearance } = preferences;

  const currentAccentId = appearance.accent;
  const currentOption =
    ACCENT_OPTIONS.find((opt) => opt.id === currentAccentId) ?? ACCENT_OPTIONS[0];
  const activeColor = isDark ? currentOption.colorDark : currentOption.colorLight;

  return (
    <SettingsBottomSheet
      visible={visible}
      onClose={onClose}
      title="Accent Color"
    >
      <View style={styles.container}>
        {/* Live Accent Preview Box */}
        <View
          style={[
            styles.previewCard,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.separator,
            },
          ]}
        >
          <View style={styles.previewMeta}>
            <View
              style={[
                styles.previewDot,
                { backgroundColor: activeColor },
              ]}
            />
            <ThemedText weight="semibold" style={[styles.previewName, { color: colors.text }]}>
              {currentOption.label}
            </ThemedText>
          </View>

          {/* Mini Interactive Demo Elements */}
          <View style={styles.demoRow}>
            <View style={[styles.demoChip, { backgroundColor: activeColor }]}>
              <ThemedText
                weight="medium"
                style={[
                  styles.demoChipText,
                  { color: isDark ? "#121215" : "#FAF8F5" },
                ]}
              >
                Date Chip
              </ThemedText>
            </View>

            <View style={styles.demoTimelineDotWrap}>
              <View style={[styles.demoTimelineLine, { backgroundColor: colors.line }]} />
              <View style={[styles.demoTimelineDot, { backgroundColor: activeColor }]} />
              <View style={[styles.demoTimelineLine, { backgroundColor: colors.line }]} />
            </View>

            <View
              style={[
                styles.demoOutlineButton,
                { borderColor: activeColor },
              ]}
            >
              <ThemedText weight="medium" style={[styles.demoOutlineText, { color: activeColor }]}>
                Highlight
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Accent Grid */}
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
                      <Feather
                        name="check"
                        size={13}
                        color={isDark ? "#121215" : "#FAF8F5"}
                      />
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
                  <View
                    style={[
                      styles.selectedIndicator,
                      { backgroundColor: color },
                    ]}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SettingsBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space.md,
    paddingBottom: space.sm,
  },
  previewCard: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
    gap: space.sm + 4,
  },
  previewMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs + 2,
  },
  previewDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  previewName: {
    fontSize: 15,
    lineHeight: 19,
  },
  demoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: space.xs,
  },
  demoChip: {
    paddingHorizontal: space.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  demoChipText: {
    fontSize: 11,
    lineHeight: 14,
  },
  demoTimelineDotWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  demoTimelineLine: {
    width: 24,
    height: 1.5,
    borderRadius: 1,
  },
  demoTimelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  demoOutlineButton: {
    paddingHorizontal: space.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  demoOutlineText: {
    fontSize: 11,
    lineHeight: 14,
  },
  grid: {
    gap: space.xs + 2,
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
