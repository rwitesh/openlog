import { Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import type { ThemeColors } from "@/theme/colors";
import { metrics, space } from "@/theme/spacing";
import { press } from "@/theme/motion";

interface HeaderIconActionsProps {
  top: number;
  colors: ThemeColors;
  onOpenSearch: () => void;
  onOpenCalendar: () => void;
  onOpenSettings: () => void;
}

export function HeaderIconActions({
  top,
  colors,
  onOpenSearch,
  onOpenCalendar,
  onOpenSettings,
}: HeaderIconActionsProps) {
  return (
    <View style={[styles.actions, { top }]}>
      <Pressable
        onPress={onOpenSearch}
        hitSlop={space.sm}
        style={({ pressed }) => [
          styles.iconBtn,
          {
            backgroundColor: colors.surface,
            borderColor: colors.separator,
          },
          pressed && press,
        ]}
        accessibilityLabel="Search"
        accessibilityRole="button"
      >
        <Feather name="search" size={metrics.iconSm + 2} color={colors.text} />
      </Pressable>

      <Pressable
        onPress={onOpenCalendar}
        hitSlop={space.sm}
        style={({ pressed }) => [
          styles.iconBtn,
          {
            backgroundColor: colors.surface,
            borderColor: colors.separator,
          },
          pressed && press,
        ]}
        accessibilityLabel="Calendar"
        accessibilityRole="button"
      >
        <Feather name="calendar" size={metrics.iconSm + 2} color={colors.text} />
      </Pressable>

      <Pressable
        onPress={onOpenSettings}
        hitSlop={space.sm}
        style={({ pressed }) => [
          styles.iconBtn,
          {
            backgroundColor: colors.surface,
            borderColor: colors.separator,
          },
          pressed && press,
        ]}
        accessibilityLabel="Settings"
        accessibilityRole="button"
      >
        <Feather name="settings" size={metrics.iconSm + 2} color={colors.text} />
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
    gap: space.xs + 2,
    zIndex: 2,
  },
  iconBtn: {
    width: metrics.btnMd,
    height: metrics.btnMd,
    borderRadius: metrics.btnMd / 2,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
