import { Feather } from "@expo/vector-icons";
import { Animated, Pressable, StyleSheet } from "react-native";
import { ThemedText } from "@/shared/components/ThemedText";
import { metrics, sectionGap, space, type ThemeColors, useTheme } from "@/theme";
import { usePressScale } from "../hooks/usePressScale";

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
            backgroundColor: dark
              ? theme.backgroundConfig?.imageUri
                ? "rgba(25, 26, 30, 0.88)"
                : "rgba(255, 255, 255, 0.08)"
              : colors.surface,
            borderColor: dark ? "rgba(255, 255, 255, 0.15)" : colors.separator,
          },
          pressed && styles.pressed,
        ]}
        accessibilityLabel={`${label}, explore memories`}
        accessibilityRole="button"
      >
        <ThemedText
          weight="semibold"
          style={[theme.typography.headerMonth, { color: colors.text }]}
        >
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
