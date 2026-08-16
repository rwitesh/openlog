import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { usePreferences, useTheme } from "@/theme";
import type { ThemeMode } from "@/theme/types";
import { space } from "@/theme/spacing";
import { radius } from "@/theme/theme";
import { press } from "@/theme/motion";
import { ThemedText } from "@/shared/components/ThemedText";
import { SettingsBottomSheet } from "./SettingsBottomSheet";

interface ThemeModalProps {
  visible: boolean;
  onClose: () => void;
}

interface ThemeOptionItem {
  id: ThemeMode;
  title: string;
  subtitle: string;
  swatchBg: string;
  swatchText: string;
  swatchSurface: string;
}

const THEME_OPTIONS: ThemeOptionItem[] = [
  {
    id: "light",
    title: "Light",
    subtitle: "Gallery White",
    swatchBg: "#FAF8F5",
    swatchText: "#181614",
    swatchSurface: "#FFFFFF",
  },
  {
    id: "dark",
    title: "Dark",
    subtitle: "Charcoal Black",
    swatchBg: "#121215",
    swatchText: "#F2F2F5",
    swatchSurface: "#191A1E",
  },
  {
    id: "system",
    title: "System",
    subtitle: "Match Device",
    swatchBg: "transparent",
    swatchText: "#181614",
    swatchSurface: "transparent",
  },
];

export function ThemeModal({ visible, onClose }: ThemeModalProps) {
  const { theme, isDark } = useTheme();
  const { colors } = theme;
  const { preferences, setAppearance } = usePreferences();
  const { appearance } = preferences;

  const currentMode = appearance.mode;

  return (
    <SettingsBottomSheet
      visible={visible}
      onClose={onClose}
      title="Theme"
    >
      <View style={styles.list}>
        {THEME_OPTIONS.map((opt) => {
          const isSelected = currentMode === opt.id;

          return (
            <Pressable
              key={opt.id}
              onPress={() => setAppearance({ mode: opt.id })}
              style={({ pressed }) => [
                styles.optionCard,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: isSelected ? colors.accent : colors.separator,
                },
                isSelected && styles.optionCardSelected,
                pressed && press,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${opt.title} Theme`}
            >
              {/* Mini Swatch Box */}
              <View
                style={[
                  styles.swatchBox,
                  {
                    backgroundColor:
                      opt.id === "system"
                        ? isDark
                          ? "#121215"
                          : "#FAF8F5"
                        : opt.swatchBg,
                    borderColor: colors.separator,
                  },
                ]}
              >
                <View
                  style={[
                    styles.miniCard,
                    {
                      backgroundColor:
                        opt.id === "system"
                          ? isDark
                            ? "#191A1E"
                            : "#FFFFFF"
                          : opt.swatchSurface,
                      borderColor: colors.separator,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.miniLinePrimary,
                      {
                        backgroundColor:
                          opt.id === "system"
                            ? isDark
                              ? "#F2F2F5"
                              : "#181614"
                            : opt.swatchText,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.miniLineSecondary,
                      {
                        backgroundColor:
                          opt.id === "system"
                            ? isDark
                              ? "#9697A3"
                              : "#6E675F"
                            : opt.id === "dark"
                            ? "#9697A3"
                            : "#6E675F",
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Text Description */}
              <View style={styles.textWrap}>
                <ThemedText weight="semibold" style={[styles.title, { color: colors.text }]}>
                  {opt.title}
                </ThemedText>
                <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {opt.subtitle}
                </ThemedText>
              </View>

              {/* Selection Indicator */}
              <View
                style={[
                  styles.radioDot,
                  {
                    borderColor: isSelected ? colors.accent : colors.textTertiary,
                    backgroundColor: isSelected ? colors.accent : "transparent",
                  },
                ]}
              >
                {isSelected ? (
                  <Feather
                    name="check"
                    size={11}
                    color={isDark ? "#121215" : "#FAF8F5"}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </SettingsBottomSheet>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm + 2,
    paddingBottom: space.sm,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    gap: space.md,
  },
  optionCardSelected: {
    borderWidth: 2,
  },
  swatchBox: {
    width: 52,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 5,
    justifyContent: "center",
  },
  miniCard: {
    flex: 1,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 3,
    justifyContent: "center",
  },
  miniLinePrimary: {
    height: 3,
    width: "75%",
    borderRadius: 1.5,
  },
  miniLineSecondary: {
    height: 2.5,
    width: "50%",
    borderRadius: 1.25,
  },
  textWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    lineHeight: 19,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  radioDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
