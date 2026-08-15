import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import type { ThemeColors } from "@/theme/colors";
import { metrics, space } from "@/theme/spacing";
import { press } from "@/theme/motion";

interface HeaderIconActionsProps {
  top: number;
  colors: ThemeColors;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
}

export function HeaderIconActions({
  top,
  colors,
  onOpenCalendar,
  onOpenSettings,
}: HeaderIconActionsProps) {
  return (
    <View style={[styles.actions, { top }]}>
      <Pressable
        onPress={onOpenCalendar}
        hitSlop={space.md}
        style={({ pressed }) => [styles.iconBtn, pressed && press]}
        accessibilityLabel="Calendar"
        accessibilityRole="button"
      >
        <Feather name="calendar" size={metrics.iconMd} color={colors.textSecondary} />
      </Pressable>

      <Pressable
        onPress={onOpenSettings}
        hitSlop={space.md}
        style={({ pressed }) => [styles.iconBtn, pressed && press]}
        accessibilityLabel="Settings"
        accessibilityRole="button"
      >
        <Feather name="settings" size={metrics.iconMd} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    position: "absolute",
    right: space.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    zIndex: 2,
  },
  iconBtn: {
    width: metrics.btnMd,
    height: metrics.btnMd,
    alignItems: "center",
    justifyContent: "center",
  },
});
