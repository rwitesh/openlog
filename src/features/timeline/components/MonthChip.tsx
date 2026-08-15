import { Animated, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";

import type { ThemeColors } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeProvider";
import { metrics, sectionGap, space } from "@/theme/spacing";
import { usePressScale } from "../hooks/usePressScale";
import { ThemedText } from "@/shared/components/ThemedText";

interface MonthChipProps {
  label: string;
  dark: boolean;
  colors: ThemeColors;
  onPress: () => void;
}

export function MonthChip({ label, dark, colors, onPress }: MonthChipProps) {
  const { theme } = useTheme();
  const { scale, onPressIn, onPressOut } = usePressScale();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={({ pressed }) => [
          styles.chip,
          {
            backgroundColor: dark ? "rgba(255, 255, 255, 0.08)" : colors.surface,
            borderColor: dark ? "rgba(255, 255, 255, 0.12)" : colors.separator,
          },
          pressed && styles.pressed,
        ]}
        accessibilityLabel={`${label}, explore memories`}
        accessibilityRole="button"
      >
        <ThemedText weight="semibold" style={[theme.typography.headerMonth, { color: colors.text }]}>
          {label}
        </ThemedText>
        <Feather name="chevron-down" size={metrics.iconSm} color={colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: {
    marginTop: sectionGap,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressed: {
    opacity: 0.82,
  },
});
